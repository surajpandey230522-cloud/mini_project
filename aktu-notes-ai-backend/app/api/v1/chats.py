"""Chat and RAG question answering API endpoints."""

import uuid
from typing import List
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db, limiter
from app.models.user import User
from app.schemas.auth import MessageResponse
from app.schemas.chat import (
    AskQuestionRequest,
    AskQuestionResponse,
    ConversationListResponse,
    ConversationResponse,
    MessageResponse as ChatMessageResponse,
)
from app.services.chat_service import ChatService

settings = get_settings()
router = APIRouter()


@router.post(
    "/ask",
    response_model=AskQuestionResponse,
    summary="Ask a question about uploaded PDF notes (RAG QA)",
)
@limiter.limit(settings.RATE_LIMIT_CHAT)
async def ask_question(
    request: Request,
    payload: AskQuestionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query uploaded documents. Generates grounded answer with PDF filename and page citations."""
    service = ChatService(db)
    return await service.ask_question(current_user.id, payload)


@router.get(
    "",
    response_model=ConversationListResponse,
    summary="List all conversations for current student",
)
async def list_conversations(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve paginated list of conversations."""
    service = ChatService(db)
    return await service.list_conversations(current_user.id, page=page, page_size=page_size)


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
    summary="Get conversation details",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve details for a specific conversation."""
    service = ChatService(db)
    return await service.get_conversation(current_user.id, conversation_id)


@router.get(
    "/{conversation_id}/messages",
    response_model=List[ChatMessageResponse],
    summary="List messages in a conversation",
)
async def list_conversation_messages(
    conversation_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve messages with citations for a conversation."""
    service = ChatService(db)
    return await service.list_messages(current_user.id, conversation_id, page=page, page_size=page_size)


@router.delete(
    "/{conversation_id}",
    response_model=MessageResponse,
    summary="Delete a conversation and its messages",
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation thread."""
    service = ChatService(db)
    await service.delete_conversation(current_user.id, conversation_id)
    return MessageResponse(message="Conversation successfully deleted.")

