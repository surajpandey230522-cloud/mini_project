"""Document schemas for request and response validation."""

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    """Document metadata response."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    original_filename: str
    file_size: int
    page_count: int
    chunk_count: int
    status: str
    error_message: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None


class DocumentUploadResponse(BaseModel):
    """Response returned immediately after PDF upload."""
    id: uuid.UUID
    original_filename: str
    status: str
    message: str = "PDF uploaded successfully and queued for processing"
    created_at: datetime


class DocumentListResponse(BaseModel):
    """Paginated list of user documents."""
    items: List[DocumentResponse]
    total: int
    page: int
    page_size: int

