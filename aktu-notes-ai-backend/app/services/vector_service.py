"""NeonDB pgvector database service for embedding storage and semantic similarity search."""

import math
import uuid
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

import app.db.session as db_session_module
from app.core.exceptions import ExternalServiceError
from app.core.logging import logger
from app.models.chunk import DocumentChunk
from app.services.chunking_service import TextChunk


class VectorService:
    """Manages vector storage and cosine similarity retrieval using PostgreSQL pgvector in NeonDB."""

    @classmethod
    def get_collection(cls) -> None:
        """Compatibility hook for app lifespan."""
        logger.info("VectorService ready (backed by NeonDB pgvector).")

    async def insert_chunks(
        self,
        chunks: List[TextChunk],
        embeddings: List[List[float]],
        db: Optional[AsyncSession] = None,
    ) -> None:
        """Insert or update chunks with vector embeddings in NeonDB."""
        if not chunks:
            return

        async def _do_insert(session: AsyncSession):
            for chunk, emb in zip(chunks, embeddings):
                # Check for existing chunk to avoid duplicates
                check_stmt = select(DocumentChunk).where(DocumentChunk.chunk_id == chunk.chunk_id)
                res = await session.execute(check_stmt)
                existing = res.scalar_one_or_none()

                if existing:
                    existing.text = chunk.text
                    existing.embedding = emb
                    existing.page_number = chunk.page_number
                    existing.page_range = chunk.page_range
                else:
                    db_chunk = DocumentChunk(
                        chunk_id=chunk.chunk_id,
                        document_id=uuid.UUID(str(chunk.document_id)),
                        user_id=uuid.UUID(str(chunk.user_id)),
                        filename=chunk.filename,
                        page_number=chunk.page_number,
                        page_range=chunk.page_range,
                        chunk_index=chunk.chunk_index,
                        text=chunk.text,
                        embedding=emb,
                    )
                    session.add(db_chunk)

            await session.flush()
            logger.info(f"Persisted {len(chunks)} chunks with embeddings in NeonDB pgvector.")

        if db:
            await _do_insert(db)
        else:
            async with db_session_module.async_session_maker() as session:
                await _do_insert(session)
                await session.commit()

    async def similarity_search(
        self,
        query_embedding: List[float],
        user_id: uuid.UUID,
        document_ids: List[uuid.UUID],
        top_k: int = 3,
        db: Optional[AsyncSession] = None,
    ) -> List[Dict[str, Any]]:
        """Perform cosine similarity vector search filtered strictly by user_id and document_ids."""
        if not document_ids:
            return []

        async def _do_search(session: AsyncSession) -> List[Dict[str, Any]]:
            bind = session.bind or db_session_module.engine
            is_postgres = bind.dialect.name == "postgresql"

            if is_postgres:
                # Native PostgreSQL pgvector cosine distance: embedding.cosine_distance(vector)
                distance_col = DocumentChunk.embedding.cosine_distance(query_embedding).label("distance")
                stmt = (
                    select(DocumentChunk, distance_col)
                    .where(
                        DocumentChunk.user_id == user_id,
                        DocumentChunk.document_id.in_(document_ids),
                    )
                    .order_by("distance")
                    .limit(top_k)
                )
                result = await session.execute(stmt)
                rows = result.all()

                formatted = []
                for chunk, dist in rows:
                    dist_float = float(dist) if dist is not None else 0.0
                    formatted.append({
                        "chunk_id": chunk.chunk_id,
                        "text": chunk.text,
                        "metadata": {
                            "user_id": str(chunk.user_id),
                            "document_id": str(chunk.document_id),
                            "filename": chunk.filename,
                            "page_number": int(chunk.page_number),
                            "chunk_index": int(chunk.chunk_index),
                            "chunk_id": chunk.chunk_id,
                        },
                        "distance": dist_float,
                        "score": max(0.0, 1.0 - dist_float),
                    })
                return formatted

            else:
                # SQLite fallback: fetch candidate chunks and compute cosine distance in Python
                stmt = select(DocumentChunk).where(
                    DocumentChunk.user_id == user_id,
                    DocumentChunk.document_id.in_(document_ids),
                )
                result = await session.execute(stmt)
                chunks = result.scalars().all()

                scored: List[Tuple[float, DocumentChunk]] = []
                norm_q = math.sqrt(sum(a * a for a in query_embedding)) or 1.0

                for chunk in chunks:
                    emb = chunk.embedding
                    if isinstance(emb, (list, tuple)):
                        dot = sum(a * b for a, b in zip(query_embedding, emb))
                        norm_e = math.sqrt(sum(b * b for b in emb)) or 1.0
                        similarity = dot / (norm_q * norm_e)
                        distance = 1.0 - similarity
                    else:
                        distance = 1.0
                    scored.append((distance, chunk))

                scored.sort(key=lambda x: x[0])
                top_items = scored[:top_k]

                formatted = []
                for dist, chunk in top_items:
                    formatted.append({
                        "chunk_id": chunk.chunk_id,
                        "text": chunk.text,
                        "metadata": {
                            "user_id": str(chunk.user_id),
                            "document_id": str(chunk.document_id),
                            "filename": chunk.filename,
                            "page_number": int(chunk.page_number),
                            "chunk_index": int(chunk.chunk_index),
                            "chunk_id": chunk.chunk_id,
                        },
                        "distance": dist,
                        "score": max(0.0, 1.0 - dist),
                    })
                return formatted

        if db:
            return await _do_search(db)
        else:
            async with db_session_module.async_session_maker() as session:
                return await _do_search(session)

    async def delete_document_vectors(
        self,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        db: Optional[AsyncSession] = None,
    ) -> None:
        """Delete all chunks for a document (also handled automatically via CASCADE)."""
        async def _do_delete(session: AsyncSession):
            stmt = delete(DocumentChunk).where(
                DocumentChunk.user_id == user_id,
                DocumentChunk.document_id == document_id,
            )
            await session.execute(stmt)
            await session.flush()
            logger.info(f"Deleted pgvector chunks for doc {document_id}")

        if db:
            await _do_delete(db)
        else:
            async with db_session_module.async_session_maker() as session:
                await _do_delete(session)
                await session.commit()
