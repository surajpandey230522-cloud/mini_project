"""ChromaDB vector database service for persistent embedding indexing and semantic retrieval."""

import asyncio
import json
import math
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceError
from app.core.logging import logger
from app.services.chunking_service import TextChunk

try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMADB_AVAILABLE = True
except ImportError:
    chromadb = None
    CHROMADB_AVAILABLE = False

settings = get_settings()
COLLECTION_NAME = "aktu_notes_collection"


class FallbackVectorStore:
    """Built-in persistent vector engine with cosine similarity when ChromaDB binary is unavailable."""

    def __init__(self, persist_dir: str):
        self.persist_file = Path(persist_dir) / "vectors_fallback.json"
        self._data: Dict[str, Dict[str, Any]] = {}
        self._load()

    def _load(self):
        if self.persist_file.exists():
            try:
                with open(self.persist_file, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load fallback vector file: {e}")
                self._data = {}

    def _save(self):
        self.persist_file.parent.mkdir(parents=True, exist_ok=True)
        try:
            with open(self.persist_file, "w", encoding="utf-8") as f:
                json.dump(self._data, f)
        except Exception as e:
            logger.error(f"Failed to persist fallback vector file: {e}")

    def upsert(self, ids: List[str], embeddings: List[List[float]], documents: List[str], metadatas: List[Dict[str, Any]]):
        self._load()
        for cid, emb, doc, meta in zip(ids, embeddings, documents, metadatas):
            self._data[cid] = {
                "chunk_id": cid,
                "embedding": emb,
                "text": doc,
                "metadata": meta,
            }
        self._save()

    def query(self, query_embeddings: List[List[float]], n_results: int, where: Dict[str, Any]) -> Dict[str, Any]:
        self._load()
        q_emb = query_embeddings[0]

        # Extract filter criteria
        user_id_target = None
        doc_ids_target = None

        if "$and" in where:
            for condition in where["$and"]:
                if "user_id" in condition:
                    user_id_target = condition["user_id"].get("$eq")
                elif "document_id" in condition:
                    if "$eq" in condition["document_id"]:
                        doc_ids_target = [condition["document_id"]["$eq"]]
                    elif "$in" in condition["document_id"]:
                        doc_ids_target = condition["document_id"]["$in"]

        matched = []
        for item in self._data.values():
            meta = item["metadata"]
            if user_id_target and str(meta.get("user_id")) != str(user_id_target):
                continue
            if doc_ids_target and str(meta.get("document_id")) not in [str(d) for d in doc_ids_target]:
                continue

            # Cosine similarity
            emb = item["embedding"]
            dot_product = sum(a * b for a, b in zip(q_emb, emb))
            norm_q = math.sqrt(sum(a * a for a in q_emb)) or 1.0
            norm_e = math.sqrt(sum(b * b for b in emb)) or 1.0
            similarity = dot_product / (norm_q * norm_e)
            distance = 1.0 - similarity

            matched.append((distance, item))

        # Sort by lowest distance (highest similarity)
        matched.sort(key=lambda x: x[0])
        top_matches = matched[:n_results]

        ids = [item["chunk_id"] for _, item in top_matches]
        docs = [item["text"] for _, item in top_matches]
        metas = [item["metadata"] for _, item in top_matches]
        dists = [dist for dist, _ in top_matches]

        return {
            "ids": [ids],
            "documents": [docs],
            "metadatas": [metas],
            "distances": [dists],
        }

    def delete(self, where: Dict[str, Any]):
        self._load()
        user_id_target = None
        doc_id_target = None

        if "$and" in where:
            for condition in where["$and"]:
                if "user_id" in condition:
                    user_id_target = condition["user_id"].get("$eq")
                elif "document_id" in condition:
                    doc_id_target = condition["document_id"].get("$eq")

        to_delete = []
        for cid, item in self._data.items():
            meta = item["metadata"]
            if user_id_target and str(meta.get("user_id")) == str(user_id_target):
                if doc_id_target and str(meta.get("document_id")) == str(doc_id_target):
                    to_delete.append(cid)

        for cid in to_delete:
            del self._data[cid]

        self._save()


class VectorService:
    """Manages persistent ChromaDB vector storage and filtered similarity search."""

    _client: Optional[Any] = None
    _collection: Optional[Any] = None
    _fallback_store: Optional[FallbackVectorStore] = None

    @classmethod
    def get_client(cls) -> Any:
        """Get or initialize singleton persistent ChromaDB client."""
        if not CHROMADB_AVAILABLE:
            return None
        if cls._client is None:
            cls._client = chromadb.PersistentClient(
                path=settings.CHROMA_PERSIST_DIR,
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return cls._client

    @classmethod
    def get_collection(cls) -> Any:
        """Get or create the unified vector collection with cosine similarity space."""
        if not CHROMADB_AVAILABLE:
            if cls._fallback_store is None:
                cls._fallback_store = FallbackVectorStore(settings.CHROMA_PERSIST_DIR)
            return cls._fallback_store

        if cls._collection is None:
            client = cls.get_client()
            cls._collection = client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        return cls._collection

    def _insert_chunks_sync(self, chunks: List[TextChunk], embeddings: List[List[float]]) -> None:
        """Insert or upsert chunks and their embeddings into vector collection."""
        if not chunks:
            return

        collection = self.get_collection()

        ids: List[str] = []
        documents: List[str] = []
        metadatas: List[Dict[str, Any]] = []

        for chunk in chunks:
            ids.append(chunk.chunk_id)
            documents.append(chunk.text)
            metadatas.append({
                "user_id": str(chunk.user_id),
                "document_id": str(chunk.document_id),
                "filename": chunk.filename,
                "page_number": int(chunk.page_number),
                "chunk_index": int(chunk.chunk_index),
                "chunk_id": chunk.chunk_id,
            })

        try:
            collection.upsert(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas,
            )
            logger.info(f"Upserted {len(chunks)} chunks into vector collection '{COLLECTION_NAME}'.")
        except Exception as e:
            logger.error(f"Failed to upsert chunks into vector collection: {e}")
            raise ExternalServiceError(f"Vector database indexing failed: {str(e)}")

    async def insert_chunks(self, chunks: List[TextChunk], embeddings: List[List[float]]) -> None:
        """Asynchronously insert or upsert chunks without blocking event loop."""
        await asyncio.to_thread(self._insert_chunks_sync, chunks, embeddings)

    def _similarity_search_sync(
        self,
        query_embedding: List[float],
        user_id: uuid.UUID,
        document_ids: List[uuid.UUID],
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """Perform user-isolated similarity search filtered strictly by user_id and document_ids."""
        collection = self.get_collection()

        user_id_str = str(user_id)
        doc_id_strs = [str(d) for d in document_ids]

        if len(doc_id_strs) == 1:
            where_filter = {
                "$and": [
                    {"user_id": {"$eq": user_id_str}},
                    {"document_id": {"$eq": doc_id_strs[0]}},
                ]
            }
        else:
            where_filter = {
                "$and": [
                    {"user_id": {"$eq": user_id_str}},
                    {"document_id": {"$in": doc_id_strs}},
                ]
            }

        try:
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=where_filter,
            )

            retrieved: List[Dict[str, Any]] = []
            if results and results.get("ids") and results["ids"][0]:
                ids = results["ids"][0]
                docs = results.get("documents", [[]])[0]
                metadatas = results.get("metadatas", [[]])[0]
                distances = results.get("distances", [[]])[0] if results.get("distances") else [0.0] * len(ids)

                for chunk_id, doc_text, meta, dist in zip(ids, docs, metadatas, distances):
                    retrieved.append({
                        "chunk_id": chunk_id,
                        "text": doc_text,
                        "metadata": meta,
                        "distance": dist,
                        "score": 1.0 - dist if dist is not None else 1.0,
                    })

            return retrieved

        except Exception as e:
            logger.error(f"Error querying vector collection: {e}")
            raise ExternalServiceError(f"Vector search failed: {str(e)}")

    async def similarity_search(
        self,
        query_embedding: List[float],
        user_id: uuid.UUID,
        document_ids: List[uuid.UUID],
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """Asynchronously query vector collection."""
        return await asyncio.to_thread(
            self._similarity_search_sync, query_embedding, user_id, document_ids, top_k
        )

    def _delete_document_vectors_sync(self, user_id: uuid.UUID, document_id: uuid.UUID) -> None:
        """Remove all vectors belonging to a document under user's account."""
        collection = self.get_collection()
        try:
            collection.delete(
                where={
                    "$and": [
                        {"user_id": {"$eq": str(user_id)}},
                        {"document_id": {"$eq": str(document_id)}},
                    ]
                }
            )
            logger.info(f"Deleted vectors for document {document_id} from vector store.")
        except Exception as e:
            logger.warning(f"Failed to delete document vectors from vector store: {e}")

    async def delete_document_vectors(self, user_id: uuid.UUID, document_id: uuid.UUID) -> None:
        """Asynchronously delete document vectors."""
        await asyncio.to_thread(self._delete_document_vectors_sync, user_id, document_id)
