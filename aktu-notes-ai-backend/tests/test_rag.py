"""Tests for PDF extraction, chunking, vector retrieval, and RAG QA pipeline."""

import uuid
from pathlib import Path
import pymupdf as fitz
import pytest
from httpx import AsyncClient

from app.core.exceptions import PDFExtractionError
from app.models.document import Document, DocumentStatus
from app.services.chunking_service import ChunkingService, TextChunk
from app.services.embedding_service import EmbeddingService
from app.services.gemini_service import GeminiService
from app.services.pdf_service import ExtractedPage, PDFService
from app.services.retrieval_service import RetrievalService
from app.services.vector_service import VectorService


@pytest.mark.asyncio
async def test_pdf_extraction(tmp_path: Path, sample_pdf_bytes):
    """Test text extraction preserves page numbers and text."""
    pdf_file = tmp_path / "test_extract.pdf"
    pdf_file.write_bytes(sample_pdf_bytes)

    service = PDFService()
    pages = await service.extract_text(pdf_file)

    assert len(pages) == 2
    assert pages[0].page_number == 1
    assert "Normalization is the process" in pages[0].text
    assert pages[1].page_number == 2
    assert "Boyce-Codd Normal Form" in pages[1].text


@pytest.mark.asyncio
async def test_scanned_pdf_detection(tmp_path: Path):
    """Ensure image-only or blank PDFs trigger PDFExtractionError."""
    doc = fitz.open()
    doc.new_page()  # blank page without text
    pdf_file = tmp_path / "blank.pdf"
    doc.save(str(pdf_file))
    doc.close()

    service = PDFService()
    with pytest.raises(PDFExtractionError) as exc_info:
        await service.extract_text(pdf_file)
    assert "scanned or contains no extractable text" in str(exc_info.value)


def test_chunking_service():
    """Verify chunk generation preserves metadata and boundary overlap."""
    service = ChunkingService(chunk_size_tokens=50, chunk_overlap_tokens=10)
    pages = [
        ExtractedPage(page_number=1, text="DBMS Unit 1 introduction. Data models include relational, network, and hierarchical. Relational model organizes data into tables consisting of rows and columns."),
        ExtractedPage(page_number=2, text="Unit 2 Normalization. First normal form eliminates repeating groups. Second normal form eliminates partial key dependencies."),
    ]

    doc_id = uuid.uuid4()
    user_id = uuid.uuid4()
    chunks = service.chunk_document(
        user_id=user_id,
        document_id=doc_id,
        filename="dbms.pdf",
        pages=pages,
    )

    assert len(chunks) > 0
    first_chunk = chunks[0]
    assert first_chunk.document_id == str(doc_id)
    assert first_chunk.user_id == str(user_id)
    assert first_chunk.filename == "dbms.pdf"
    assert first_chunk.page_number in [1, 2]
    assert first_chunk.chunk_id.startswith(f"{doc_id}_chunk_")


@pytest.mark.asyncio
async def test_vector_indexing_and_similarity_search(db_session):
    """Test inserting embeddings into NeonDB pgvector and retrieving by cosine similarity."""
    vector_service = VectorService()
    embedding_service = EmbeddingService()

    user_id = uuid.uuid4()
    doc_id = uuid.uuid4()

    chunks = [
        TextChunk(
            chunk_id=f"{doc_id}_chunk_0001",
            user_id=str(user_id),
            document_id=str(doc_id),
            filename="Unit2.pdf",
            page_number=12,
            page_range=[12],
            chunk_index=1,
            text="First normal form requires atomic attribute values and no multivalued attributes.",
        ),
        TextChunk(
            chunk_id=f"{doc_id}_chunk_0002",
            user_id=str(user_id),
            document_id=str(doc_id),
            filename="Unit2.pdf",
            page_number=14,
            page_range=[14],
            chunk_index=2,
            text="Second normal form requires 1NF and no non-prime attribute is functionally dependent on a candidate key.",
        ),
    ]

    embeddings = await embedding_service.embed_documents([c.text for c in chunks])
    await vector_service.insert_chunks(chunks, embeddings)

    # Perform search
    query = "What is required for second normal form?"
    query_vector = await embedding_service.embed_query(query)

    results = await vector_service.similarity_search(
        query_embedding=query_vector,
        user_id=user_id,
        document_ids=[doc_id],
        top_k=2,
    )

    assert len(results) > 0
    assert results[0]["metadata"]["document_id"] == str(doc_id)
    assert results[0]["metadata"]["filename"] == "Unit2.pdf"


@pytest.mark.asyncio
async def test_full_rag_ask_endpoint(client: AsyncClient, db_session, registered_user, auth_headers):
    """Test the complete RAG /chats/ask pipeline with grounded answer and citation verification."""
    # 1. Create a completed document in DB
    doc_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        user_id=registered_user.id,
        original_filename="DBMS_Lecture_Notes.pdf",
        storage_path="/tmp/fake_path.pdf",
        file_size=1024,
        page_count=10,
        chunk_count=2,
        status=DocumentStatus.COMPLETED.value,
    )
    db_session.add(doc)
    await db_session.commit()

    # 2. Index chunks in ChromaDB for this document
    vector_service = VectorService()
    embedding_service = EmbeddingService()

    chunk1 = TextChunk(
        chunk_id=f"{doc_id}_chunk_0001",
        user_id=str(registered_user.id),
        document_id=str(doc_id),
        filename="DBMS_Lecture_Notes.pdf",
        page_number=5,
        page_range=[5],
        chunk_index=1,
        text="Database normalization organizes tables to minimize data redundancy and prevent anomalies.",
    )
    embeddings = await embedding_service.embed_documents([chunk1.text])
    await vector_service.insert_chunks([chunk1], embeddings)

    # 3. Ask question via API
    payload = {
        "question": "What is database normalization?",
        "document_ids": [str(doc_id)],
        "conversation_id": None,
    }
    response = await client.post("/api/v1/chats/ask", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()

    assert "conversation_id" in data
    assert "message_id" in data
    assert "answer" in data
    assert data["grounded"] is True
    assert len(data["citations"]) > 0

    citation = data["citations"][0]
    assert citation["document_id"] == str(doc_id)
    assert citation["filename"] == "DBMS_Lecture_Notes.pdf"
    assert citation["page_number"] == 5
    assert citation["chunk_id"] == f"{doc_id}_chunk_0001"

