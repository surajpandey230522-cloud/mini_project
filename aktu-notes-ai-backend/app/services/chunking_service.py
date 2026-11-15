"""Text chunking service preserving document and page metadata."""

import re
import uuid
from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Tuple
from app.core.config import get_settings
from app.services.pdf_service import ExtractedPage

settings = get_settings()


@dataclass
class TextChunk:
    """Represents a text chunk with complete academic citation metadata."""
    chunk_id: str
    user_id: str
    document_id: str
    filename: str
    page_number: int  # primary page
    page_range: List[int]  # pages spanned by chunk
    chunk_index: int
    text: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class ChunkingService:
    """Splits extracted page texts into semantically coherent overlapping chunks."""

    def __init__(
        self,
        chunk_size_tokens: int = settings.CHUNK_SIZE_TOKENS,
        chunk_overlap_tokens: int = settings.CHUNK_OVERLAP_TOKENS,
    ):
        # 1 token is roughly 4 characters in English
        self.max_chunk_chars = chunk_size_tokens * 4
        self.overlap_chars = chunk_overlap_tokens * 4

    def _split_into_sentences(self, text: str) -> List[str]:
        """Split text into sentences while keeping punctuation attached."""
        # Split on sentence end patterns followed by whitespace or newline
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sentences if s.strip()]

    def chunk_document(
        self,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        filename: str,
        pages: List[ExtractedPage],
    ) -> List[TextChunk]:
        """Convert extracted pages into chunk objects with page-number awareness."""
        chunks: List[TextChunk] = []
        chunk_index = 1

        # We keep track of sentence units with their respective page numbers
        units: List[Tuple[int, str]] = []  # (page_number, sentence_text)

        for page in pages:
            if not page.text.strip():
                continue
            # Break paragraphs first
            paragraphs = page.text.split("\n\n")
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                sentences = self._split_into_sentences(para)
                for sent in sentences:
                    units.append((page.page_number, sent))

        if not units:
            return []

        current_sentences: List[Tuple[int, str]] = []
        current_len = 0

        i = 0
        while i < len(units):
            page_num, sentence = units[i]
            sent_len = len(sentence) + 1  # +1 for space

            # If a single sentence is larger than max_chunk_chars, hard split it
            if sent_len > self.max_chunk_chars:
                if current_sentences:
                    chunk_obj = self._create_chunk(
                        user_id, document_id, filename, chunk_index, current_sentences
                    )
                    chunks.append(chunk_obj)
                    chunk_index += 1
                    current_sentences = []
                    current_len = 0

                # Slice large sentence
                start = 0
                while start < len(sentence):
                    end = min(start + self.max_chunk_chars, len(sentence))
                    slice_text = sentence[start:end]
                    chunk_obj = TextChunk(
                        chunk_id=f"{document_id}_chunk_{chunk_index:04d}",
                        user_id=str(user_id),
                        document_id=str(document_id),
                        filename=filename,
                        page_number=page_num,
                        page_range=[page_num],
                        chunk_index=chunk_index,
                        text=slice_text,
                    )
                    chunks.append(chunk_obj)
                    chunk_index += 1
                    start += self.max_chunk_chars - self.overlap_chars
                i += 1
                continue

            if current_len + sent_len > self.max_chunk_chars and current_sentences:
                # Emit current chunk
                chunk_obj = self._create_chunk(
                    user_id, document_id, filename, chunk_index, current_sentences
                )
                chunks.append(chunk_obj)
                chunk_index += 1

                # Calculate overlap: backtrack sentences until overlap_chars is reached
                overlap_accum = 0
                overlap_units: List[Tuple[int, str]] = []
                for prev_page, prev_sent in reversed(current_sentences):
                    overlap_accum += len(prev_sent) + 1
                    overlap_units.insert(0, (prev_page, prev_sent))
                    if overlap_accum >= self.overlap_chars:
                        break

                current_sentences = overlap_units
                current_len = sum(len(s[1]) + 1 for s in current_sentences)

            current_sentences.append((page_num, sentence))
            current_len += sent_len
            i += 1

        # Emit any trailing sentences
        if current_sentences:
            chunk_obj = self._create_chunk(
                user_id, document_id, filename, chunk_index, current_sentences
            )
            chunks.append(chunk_obj)

        return chunks

    def _create_chunk(
        self,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        filename: str,
        chunk_index: int,
        sentences: List[Tuple[int, str]],
    ) -> TextChunk:
        """Helper to build TextChunk instance."""
        chunk_text = " ".join(sent for _, sent in sentences).strip()
        pages = sorted(list({page for page, _ in sentences}))
        primary_page = pages[0] if pages else 1

        return TextChunk(
            chunk_id=f"{document_id}_chunk_{chunk_index:04d}",
            user_id=str(user_id),
            document_id=str(document_id),
            filename=filename,
            page_number=primary_page,
            page_range=pages,
            chunk_index=chunk_index,
            text=chunk_text,
        )
