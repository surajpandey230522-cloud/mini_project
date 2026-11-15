"""Semantic retrieval service coordinating query embedding and vector search."""

import uuid
from typing import Any, Dict, List
from app.core.config import get_settings
from app.core.exceptions import RAGError
from app.core.logging import logger
from app.services.embedding_service import EmbeddingService
from app.services.vector_service import VectorService

settings = get_settings()


class RetrievalService:
    """Orchestrates query vectorization and filtered semantic search."""

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.vector_service = VectorService()

    async def retrieve_context(
        self,
        question: str,
        user_id: uuid.UUID,
        document_ids: List[uuid.UUID],
        top_k: int = settings.RAG_TOP_K,
    ) -> List[Dict[str, Any]]:
        """Generate query vector and retrieve top relevant chunks from authorized documents."""
        if not document_ids:
            return []

        # 1. Embed user query
        query_vector = await self.embedding_service.embed_query(question)

        # 2. Similarity search with strict user and document ID filtering
        results = await self.vector_service.similarity_search(
            query_embedding=query_vector,
            user_id=user_id,
            document_ids=document_ids,
            top_k=top_k,
        )

        formatted_chunks: List[Dict[str, Any]] = []
        for r in results:
            meta = r.get("metadata", {})
            formatted_chunks.append({
                "chunk_id": r.get("chunk_id") or meta.get("chunk_id"),
                "text": r.get("text", ""),
                "document_id": meta.get("document_id"),
                "filename": meta.get("filename", "Unknown Document"),
                "page_number": int(meta.get("page_number", 1)),
                "score": r.get("score", 0.0),
            })

        logger.info(f"Retrieved {len(formatted_chunks)} context chunks for user {user_id}.")
        return formatted_chunks

    @staticmethod
    def build_context_block(chunks: List[Dict[str, Any]]) -> str:
        """Format retrieved chunks into a structured context prompt with clear demarcation."""
        if not chunks:
            return "No relevant notes or PDF documents found."

        blocks = []
        for c in chunks:
            block = (
                f"[Source ID: {c['chunk_id']} | Document: {c['filename']} | Page: {c['page_number']}]\n"
                f"{c['text']}\n"
            )
            blocks.append(block)

        return "\n---\n".join(blocks)

