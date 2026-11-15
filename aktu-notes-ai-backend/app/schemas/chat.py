"""Chat and RAG request/response schemas."""

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class CitationItem(BaseModel):
    """Citation referencing original PDF and page number."""
    document_id: uuid.UUID
    filename: str
    page_number: int
    chunk_id: str


class AskQuestionRequest(BaseModel):
    """Request payload for RAG question answering."""
    question: str = Field(..., min_length=2, max_length=2000, description="Question about uploaded notes")
    document_ids: List[uuid.UUID] = Field(..., min_length=1, description="List of document IDs to query against")
    conversation_id: Optional[uuid.UUID] = Field(None, description="Existing conversation ID or null to start new")


class AskQuestionResponse(BaseModel):
    """Grounded RAG answer response."""
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    answer: str
    citations: List[CitationItem]
    grounded: bool


class MessageResponse(BaseModel):
    """Chat message response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    citations: Optional[List[CitationItem]] = None
    created_at: datetime


class ConversationResponse(BaseModel):
    """Conversation summary schema."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    document_ids: List[uuid.UUID] = []
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class ConversationListResponse(BaseModel):
    """Paginated conversation list."""
    items: List[ConversationResponse]
    total: int
    page: int
    page_size: int

