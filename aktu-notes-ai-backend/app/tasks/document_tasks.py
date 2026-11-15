"""Background task pipeline for processing uploaded PDF documents."""

import uuid
from pathlib import Path
from typing import Optional

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.logging import logger
import app.db.session as db_session_module
from app.models.document import DocumentStatus
from app.repositories.document_repository import DocumentRepository
from app.services.chunking_service import ChunkingService
from app.services.embedding_service import EmbeddingService
from app.services.pdf_service import PDFService
from app.services.vector_service import VectorService
from app.utils.file_utils import get_document_storage_path

settings = get_settings()


async def process_document_pipeline(document_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """End-to-end background pipeline for text extraction, chunking, embedding, and vector indexing."""
    logger.info(f"Starting document processing pipeline for doc_id={document_id}, user_id={user_id}")

    pdf_service = PDFService()
    chunking_service = ChunkingService()
    embedding_service = EmbeddingService()
    vector_service = VectorService()

    file_path = get_document_storage_path(user_id, document_id)

    async with db_session_module.async_session_maker() as db:
        doc_repo = DocumentRepository(db)
        try:
            doc = await doc_repo.get_by_id(document_id, user_id=user_id)
            if not doc:
                logger.error(f"Document {document_id} not found in database during background task.")
                return

            # 1. Update status to processing
            await doc_repo.update_status(document_id, DocumentStatus.PROCESSING)
            await db.commit()
        except Exception as e:
            logger.warning(f"Could not initialize document processing for {document_id}: {e}")
            return

        try:
            # 2. Extract text page-by-page
            pages = await pdf_service.extract_text(file_path)
            page_count = len(pages)

            # 3. Create semantic chunks preserving page citations
            chunks = chunking_service.chunk_document(
                user_id=user_id,
                document_id=document_id,
                filename=doc.original_filename,
                pages=pages,
            )

            if not chunks:
                raise AppException("Document produced no valid text chunks.")

            chunk_count = len(chunks)
            chunk_texts = [c.text for c in chunks]

            # 4. Generate embeddings via Gemini Embedding model
            embeddings = await embedding_service.embed_documents(chunk_texts)

            # 5. Index into NeonDB pgvector
            await vector_service.insert_chunks(chunks, embeddings, db=db)

            # 6. Mark document as completed
            await doc_repo.update_status(
                document_id=document_id,
                status=DocumentStatus.COMPLETED,
                page_count=page_count,
                chunk_count=chunk_count,
            )
            await db.commit()
            logger.info(
                f"Successfully completed processing for doc {document_id}: {page_count} pages, {chunk_count} chunks indexed."
            )

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Pipeline error processing document {document_id}: {error_msg}")
            try:
                await db.rollback()
            except Exception:
                pass

            # Open a fresh isolated database session to reliably record failure status
            try:
                async with db_session_module.async_session_maker() as fail_db:
                    fail_repo = DocumentRepository(fail_db)
                    await fail_repo.update_status(
                        document_id=document_id,
                        status=DocumentStatus.FAILED,
                        error_message=error_msg[:1000],
                    )
                    await fail_db.commit()
                    logger.info(f"Marked document {document_id} as FAILED: {error_msg[:200]}")
            except Exception as record_err:
                logger.error(f"Failed to record failure status for doc {document_id}: {record_err}")

