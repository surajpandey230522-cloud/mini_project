"""Google Gemini embedding generation service with retry and batching."""

import asyncio
from typing import List, Optional
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceError
from app.core.logging import logger

settings = get_settings()


def is_valid_gemini_key(key: Optional[str]) -> bool:
    """Check if key is non-empty and not a dummy placeholder."""
    if not key:
        return False
    lower = key.strip().lower()
    if any(p in lower for p in ("your_gemini", "your_api", "placeholder", "test", "change_me", "example")):
        return False
    return len(key.strip()) > 10


class EmbeddingService:
    """Generates vector embeddings using the official Google Gemini SDK."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_EMBEDDING_MODEL
        self._client = None

        if is_valid_gemini_key(self.api_key):
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize google-genai client: {e}. Will attempt fallback.")

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
    )
    def _embed_batch_sync(self, texts: List[str], task_type: str = "RETRIEVAL_DOCUMENT") -> List[List[float]]:
        """Synchronously generate embeddings for a batch of texts."""
        if not self._client:
            # If no API key configured or offline testing, return deterministic normalized embeddings
            logger.warning("Gemini API key not configured or client unavailable. Using fallback embedding representation.")
            return [self._get_fallback_embedding(t) for t in texts]

        try:
            from google.genai import types

            # Request 768 dimensions explicitly for pgvector compatibility
            config = None
            if hasattr(types, "EmbedContentConfig"):
                try:
                    config = types.EmbedContentConfig(
                        task_type=task_type,
                        output_dimensionality=768,
                    )
                except Exception:
                    config = types.EmbedContentConfig(task_type=task_type)

            kwargs = {"model": self.model, "contents": texts}
            if config:
                kwargs["config"] = config

            try:
                response = self._client.models.embed_content(**kwargs)
            except Exception as model_err:
                # If model failed with current model, try fallback to text-embedding-004
                if self.model != "text-embedding-004":
                    logger.warning(f"Embedding failed with {self.model}: {model_err}. Retrying with text-embedding-004.")
                    kwargs["model"] = "text-embedding-004"
                    response = self._client.models.embed_content(**kwargs)
                else:
                    raise

            # Response contains list of ContentEmbedding objects
            embeddings = []
            if hasattr(response, "embeddings") and response.embeddings:
                for item in response.embeddings:
                    vals = list(item.values)
                    # Enforce strictly 768 dimensions
                    if len(vals) > 768:
                        vals = vals[:768]
                    elif len(vals) < 768:
                        vals = vals + [0.0] * (768 - len(vals))
                    embeddings.append(vals)
            elif hasattr(response, "embedding") and response.embedding:
                vals = list(response.embedding.values)
                if len(vals) > 768:
                    vals = vals[:768]
                elif len(vals) < 768:
                    vals = vals + [0.0] * (768 - len(vals))
                embeddings.append(vals)
            else:
                raise ExternalServiceError("Unexpected empty response from Gemini embedding API")

            return embeddings

        except Exception as e:
            logger.error(f"Gemini embedding API error: {str(e)}")
            raise ExternalServiceError(f"Embedding service failed: {str(e)}")

    def _get_fallback_embedding(self, text: str, dim: int = 768) -> List[float]:
        """Deterministic pseudo-embedding for testing and offline environments."""
        import hashlib
        import math
        
        hasher = hashlib.sha256(text.encode("utf-8")).digest()
        # Seed pseudo vectors from hash bytes
        raw_vals = [float((hasher[i % len(hasher)] + (i * 17)) % 256) / 255.0 for i in range(dim)]
        # Normalize to unit length
        norm = math.sqrt(sum(x * x for x in raw_vals)) or 1.0
        return [x / norm for x in raw_vals]

    async def embed_documents(self, texts: List[str], batch_size: int = 16) -> List[List[float]]:
        """Generate embeddings for multiple document chunks in batches asynchronously."""
        if not texts:
            return []

        all_embeddings: List[List[float]] = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            batch_embeddings = await asyncio.to_thread(
                self._embed_batch_sync, batch, "RETRIEVAL_DOCUMENT"
            )
            all_embeddings.extend(batch_embeddings)

        return all_embeddings

    async def embed_query(self, query: str) -> List[float]:
        """Generate embedding for a single user query asynchronously."""
        embeddings = await asyncio.to_thread(
            self._embed_batch_sync, [query], "RETRIEVAL_QUERY"
        )
        return embeddings[0]

