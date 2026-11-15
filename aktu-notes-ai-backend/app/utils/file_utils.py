"""File validation, path sanitization, and filesystem utilities."""

import os
import re
import uuid
from pathlib import Path
from typing import Optional
from app.core.config import get_settings
from app.core.exceptions import FileUploadError

settings = get_settings()

PDF_MAGIC_BYTES = b"%PDF-"


def sanitize_filename(filename: str) -> str:
    """Sanitize original filename to remove directory traversals and unsafe characters."""
    # Remove any directory path components
    clean_name = os.path.basename(filename)
    # Strip null bytes and control chars
    clean_name = re.sub(r"[\x00-\x1f\x7f]", "", clean_name)
    # Allow alphanumeric, spaces, dots, hyphens, and underscores
    clean_name = re.sub(r"[^\w\s\.-]", "_", clean_name).strip()
    if not clean_name:
        clean_name = f"document_{uuid.uuid4().hex[:8]}.pdf"
    if not clean_name.lower().endswith(".pdf"):
        clean_name += ".pdf"
    return clean_name


def validate_pdf_signature(file_header: bytes) -> bool:
    """Validate that the file begins with the standard PDF header %PDF-."""
    return file_header.startswith(PDF_MAGIC_BYTES)


def validate_pdf_mime(content_type: Optional[str]) -> bool:
    """Validate that content-type is PDF."""
    if not content_type:
        return False
    return content_type.lower() in ("application/pdf", "application/x-pdf")


def get_user_upload_dir(user_id: uuid.UUID) -> Path:
    """Return directory path for a user's uploaded files."""
    user_dir = Path(settings.UPLOAD_DIR) / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir


def get_document_storage_path(user_id: uuid.UUID, document_id: uuid.UUID) -> Path:
    """Generate safe internal storage path using UUIDs to prevent collisions and traversals."""
    user_dir = get_user_upload_dir(user_id)
    return user_dir / f"{document_id}.pdf"


def ensure_storage_dirs() -> None:
    """Ensure persistent storage directories exist on startup."""
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.CHROMA_PERSIST_DIR).mkdir(parents=True, exist_ok=True)
