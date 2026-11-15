"""Repository for Conversations and Messages."""

import uuid
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, conversation_documents
from app.models.document import Document
from app.models.message import Message


class ChatRepository:
    """Handles persistence for chat conversations and messages."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_conversation(self, user_id: uuid.UUID, title: str = "New Conversation") -> Conversation:
        """Create new conversation."""
        conversation = Conversation(
            user_id=user_id,
            title=title,
        )
        self.db.add(conversation)
        await self.db.flush()
        await self.db.refresh(conversation)
        return conversation

    async def get_conversation(self, conversation_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Optional[Conversation]:
        """Fetch conversation with eager loaded documents."""
        stmt = (
            select(Conversation)
            .options(selectinload(Conversation.documents))
            .where(Conversation.id == conversation_id)
        )
        if user_id:
            stmt = stmt.where(Conversation.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_conversations(self, user_id: uuid.UUID, page: int = 1, page_size: int = 20) -> Tuple[List[Conversation], int]:
        """List user conversations with pagination."""
        offset = (page - 1) * page_size

        total_stmt = select(func.count()).select_from(Conversation).where(Conversation.user_id == user_id)
        total_res = await self.db.execute(total_stmt)
        total = total_res.scalar_one()

        stmt = (
            select(Conversation)
            .options(selectinload(Conversation.documents), selectinload(Conversation.messages))
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def delete_conversation(self, conversation: Conversation) -> None:
        """Delete conversation and related messages (via cascade)."""
        await self.db.delete(conversation)
        await self.db.flush()

    async def link_documents_to_conversation(self, conversation_id: uuid.UUID, document_ids: List[uuid.UUID]) -> None:
        """Associate documents to conversation if not already linked."""
        for doc_id in document_ids:
            check_stmt = select(conversation_documents).where(
                conversation_documents.c.conversation_id == conversation_id,
                conversation_documents.c.document_id == doc_id,
            )
            exists = (await self.db.execute(check_stmt)).first()
            if not exists:
                insert_stmt = conversation_documents.insert().values(
                    conversation_id=conversation_id,
                    document_id=doc_id,
                )
                await self.db.execute(insert_stmt)
        await self.db.flush()

    async def add_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        citations: Optional[List[Dict[str, Any]]] = None,
    ) -> Message:
        """Create a new message in conversation."""
        msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            citations=citations,
        )
        self.db.add(msg)
        await self.db.flush()
        await self.db.refresh(msg)
        return msg

    async def list_messages(self, conversation_id: uuid.UUID, page: int = 1, page_size: int = 50) -> Tuple[List[Message], int]:
        """List messages in conversation chronologically with pagination."""
        offset = (page - 1) * page_size

        total_stmt = select(func.count()).select_from(Message).where(Message.conversation_id == conversation_id)
        total_res = await self.db.execute(total_stmt)
        total = total_res.scalar_one()

        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        return items, total

    async def get_recent_messages(self, conversation_id: uuid.UUID, limit: int = 6) -> List[Message]:
        """Fetch the latest messages for conversation context."""
        stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        messages = list(result.scalars().all())
        messages.reverse()  # Return in chronological order
        return messages

