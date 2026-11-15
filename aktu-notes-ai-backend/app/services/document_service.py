"""Document management service."""

import os
import uuid
from pathlib import Path
from typing import Optional, Tuple
from fastapi import BackgroundTasks, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import (
    FileUploadError,
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.core.logging import logger
from app.models.document import Document, DocumentStatus
from app.repositories.document_repository import DocumentRepository
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.services.vector_service import VectorService
from app.tasks.document_tasks import process_document_pipeline
from app.utils.file_utils import (
    get_document_storage_path,
    sanitize_filename,
    validate_pdf_mime,
    validate_pdf_signature,
)

settings = get_settings()


class DocumentService:
    """Handles PDF file uploading, validation, retrieval, deletion, and retry orchestration."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.doc_repo = DocumentRepository(db)
        self.vector_service = VectorService()

    async def upload_document(
        self,
        user_id: uuid.UUID,
        file: UploadFile,
        background_tasks: BackgroundTasks,
    ) -> DocumentUploadResponse:
        """Validate, store PDF securely, create DB record, and trigger asynchronous processing."""
        if not file.filename:
            raise FileUploadError("No file uploaded or filename missing")

        # 1. Validate MIME type
        if not validate_pdf_mime(file.content_type):
            raise FileUploadError("Invalid file type. Only PDF documents are permitted.")

        # 2. Sanitize user-provided filename
        safe_filename = sanitize_filename(file.filename)
        doc_id = uuid.uuid4()
        storage_path = get_document_storage_path(user_id, doc_id)

        # 3. Stream content in chunks to validate magic bytes and prevent memory exhaustion
        total_size = 0
        header_bytes = b""
        max_bytes = settings.max_upload_size_bytes

        try:
            with open(storage_path, "wb") as out_file:
                while chunk := await file.read(1024 * 64):  # 64 KB chunks
                    if total_size == 0:
                        header_bytes = chunk[:10]
                        if not validate_pdf_signature(header_bytes):
                            raise FileUploadError("Invalid PDF format. The file header does not match a valid PDF.")

                    total_size += len(chunk)
                    if total_size > max_bytes:
                        raise FileUploadError(
                            f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB} MB."
                        )

                    out_file.write(chunk)

            if total_size == 0:
                raise FileUploadError("Uploaded file is empty.")

        except Exception as e:
            # Clean up partial file on failure
            if storage_path.exists():
                storage_path.unlink(missing_ok=True)
            if isinstance(e, FileUploadError):
                raise
            logger.error(f"Error saving uploaded PDF: {e}")
            raise FileUploadError(f"Failed to process file upload: {str(e)}")

        # 4. Save metadata in PostgreSQL
        document = await self.doc_repo.create(
            user_id=user_id,
            original_filename=safe_filename,
            storage_path=str(storage_path),
            file_size=total_size,
        )

        # 5. Queue asynchronous processing pipeline
        background_tasks.add_task(process_document_pipeline, document.id, user_id)

        return DocumentUploadResponse(
            id=document.id,
            original_filename=document.original_filename,
            status=document.status,
            message="PDF uploaded successfully and queued for processing",
            created_at=document.created_at,
        )

    async def get_document(self, user_id: uuid.UUID, document_id: uuid.UUID) -> DocumentResponse:
        """Fetch document metadata enforcing ownership check."""
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise NotFoundError("Document not found", error_code="DOCUMENT_NOT_FOUND")

        if doc.user_id != user_id:
            raise PermissionDeniedError("You do not have permission to view this document.")

        return DocumentResponse.model_validate(doc)

    async def list_documents(self, user_id: uuid.UUID, page: int = 1, page_size: int = 20) -> DocumentListResponse:
        """List documents owned by the user."""
        items, total = await self.doc_repo.list_by_user(user_id, page=page, page_size=page_size)
        return DocumentListResponse(
            items=[DocumentResponse.model_validate(d) for d in items],
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_document_file_path(self, user_id: uuid.UUID, document_id: uuid.UUID) -> Tuple[Path, str]:
        """Verify ownership and return physical path and safe filename for file streaming."""
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise NotFoundError("Document not found", error_code="DOCUMENT_NOT_FOUND")

        if doc.user_id != user_id:
            raise PermissionDeniedError("You do not have permission to access this file.")

        path = Path(doc.storage_path)
        if not path.exists():
            raise NotFoundError("Document file not found on disk")

        return path, doc.original_filename

    async def delete_document(self, user_id: uuid.UUID, document_id: uuid.UUID) -> None:
        """Delete document record, stored physical file, and associated ChromaDB vectors."""
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise NotFoundError("Document not found", error_code="DOCUMENT_NOT_FOUND")

        if doc.user_id != user_id:
            raise PermissionDeniedError("You do not have permission to delete this document.")

        # 1. Delete ChromaDB vectors
        await self.vector_service.delete_document_vectors(user_id, document_id)

        # 2. Delete physical file
        path = Path(doc.storage_path)
        if path.exists():
            try:
                path.unlink(missing_ok=True)
            except Exception as e:
                logger.warning(f"Could not delete physical file {path}: {e}")

        # 3. Delete DB record
        await self.doc_repo.delete(doc)

    async def retry_processing(
        self,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        background_tasks: BackgroundTasks,
    ) -> DocumentResponse:
        """Retry processing for a failed document."""
        doc = await self.doc_repo.get_by_id(document_id)
        if not doc:
            raise NotFoundError("Document not found", error_code="DOCUMENT_NOT_FOUND")

        if doc.user_id != user_id:
            raise PermissionDeniedError("You do not have permission to retry this document.")

        if doc.status == DocumentStatus.COMPLETED.value:
            raise ValidationError("Document has already completed processing.")

        await self.doc_repo.update_status(
            document_id=document_id,
            status=DocumentStatus.PENDING,
            error_message=None,
        )

        background_tasks.add_task(process_document_pipeline, document.id if 'document' in locals() else doc.id, user_id)
        return DocumentResponse.model_validate(doc)
