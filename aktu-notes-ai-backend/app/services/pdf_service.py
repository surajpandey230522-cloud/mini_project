"""PDF text extraction service using PyMuPDF (fitz)."""

import asyncio
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List
import pymupdf as fitz

from app.core.config import get_settings
from app.core.exceptions import PDFExtractionError
from app.core.logging import logger

settings = get_settings()


@dataclass
class ExtractedPage:
    """Represents text extracted from a single PDF page."""
    page_number: int  # 1-indexed
    text: str


class PDFService:
    """Handles extracting, cleaning, and validating text from PDF files."""

    @staticmethod
    def _clean_text(raw_text: str) -> str:
        """Normalize whitespace while preserving paragraphs and punctuation."""
        if not raw_text:
            return ""

        # Normalize carriage returns and tabs
        text = raw_text.replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")

        # Replace excessive whitespace in lines
        lines = [re.sub(r" +", " ", line).strip() for line in text.split("\n")]

        # Collapse multiple empty lines into at most double newlines (paragraphs)
        cleaned_paragraphs = []
        current_para = []

        for line in lines:
            if line:
                current_para.append(line)
            elif current_para:
                cleaned_paragraphs.append(" ".join(current_para))
                current_para = []

        if current_para:
            cleaned_paragraphs.append(" ".join(current_para))

        return "\n\n".join(cleaned_paragraphs).strip()

    def _extract_sync(self, file_path: Path) -> List[ExtractedPage]:
        """Synchronous PyMuPDF extraction routine."""
        if not file_path.exists():
            raise PDFExtractionError(f"File not found: {file_path.name}")

        try:
            doc = fitz.open(str(file_path))
        except Exception as e:
            logger.error(f"Failed to open PDF {file_path}: {e}")
            raise PDFExtractionError(f"Corrupted or invalid PDF file: {str(e)}")

        try:
            if doc.is_encrypted:
                raise PDFExtractionError("Encrypted or password-protected PDFs are not supported.")

            page_count = doc.page_count
            if page_count > settings.MAX_PDF_PAGES:
                raise PDFExtractionError(
                    f"PDF has {page_count} pages, which exceeds the maximum allowed limit of {settings.MAX_PDF_PAGES} pages."
                )

            extracted_pages: List[ExtractedPage] = []
            total_text_length = 0

            for page_index in range(page_count):
                page = doc.load_page(page_index)
                raw_text = page.get_text("text") or ""
                cleaned = self._clean_text(raw_text)
                page_num = page_index + 1  # 1-indexed

                extracted_pages.append(ExtractedPage(page_number=page_num, text=cleaned))
                total_text_length += len(cleaned)

            # Detect scanned / image-only PDFs
            if total_text_length < 50 or (page_count > 0 and (total_text_length / page_count) < 10):
                raise PDFExtractionError(
                    "The uploaded PDF appears to be scanned or contains no extractable text. OCR is not supported in this version."
                )

            return extracted_pages

        finally:
            doc.close()

    async def extract_text(self, file_path: Path) -> List[ExtractedPage]:
        """Asynchronously extract text page by page without blocking the event loop."""
        return await asyncio.to_thread(self._extract_sync, file_path)

