"""Document upload, listing, retrieval, streaming, and deletion endpoints."""

import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.document import (
    DocumentListResponse,
    DocumentResponse,
    DocumentUploadResponse,
)
from app.services.document_service import DocumentService

router = APIRouter()


@router.post(
    "",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an academic PDF notes document",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF file to upload"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a PDF lecture note, Quantum series, or lab manual. Triggers background RAG processing."""
    service = DocumentService(db)
    return await service.upload_document(current_user.id, file, background_tasks)


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all uploaded documents for current student",
)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve paginated list of uploaded PDFs."""
    service = DocumentService(db)
    return await service.list_documents(current_user.id, page=page, page_size=page_size)


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document details and processing status",
)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve processing status, chunk count, and page count for a document."""
    service = DocumentService(db)
    return await service.get_document(current_user.id, document_id)


@router.get(
    "/{document_id}/file",
    summary="Download or stream original PDF file",
)
async def get_document_file(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Stream PDF file securely to the authorized document owner."""
    service = DocumentService(db)
    file_path, original_filename = await service.get_document_file_path(current_user.id, document_id)

    return FileResponse(
        path=str(file_path),
        filename=original_filename,
        media_type="application/pdf",
    )


@router.delete(
    "/{document_id}",
    response_model=MessageResponse,
    summary="Delete a document, stored PDF, and vector embeddings",
)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Permanently delete a PDF file and remove its vector embeddings from ChromaDB."""
    service = DocumentService(db)
    await service.delete_document(current_user.id, document_id)
    return MessageResponse(message="Document and associated vector embeddings successfully deleted.")


@router.post(
    "/{document_id}/retry",
    response_model=DocumentResponse,
    summary="Retry failed document extraction and embedding",
)
async def retry_document(
    document_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-trigger background extraction and indexing for a document that failed."""
    service = DocumentService(db)
    return await service.retry_processing(current_user.id, document_id, background_tasks)

