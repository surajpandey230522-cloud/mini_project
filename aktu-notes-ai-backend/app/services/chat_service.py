"""Chat and RAG orchestration service."""

import uuid
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    NotFoundError,
    PermissionDeniedError,
    ValidationError,
)
from app.models.document import DocumentStatus
from app.repositories.chat_repository import ChatRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas.chat import (
    AskQuestionRequest,
    AskQuestionResponse,
    CitationItem,
    ConversationListResponse,
    ConversationResponse,
    MessageResponse,
)
from app.services.gemini_service import GeminiService
from app.services.retrieval_service import RetrievalService


class ChatService:
    """Manages conversations, message history, and the RAG question answering pipeline."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.chat_repo = ChatRepository(db)
        self.doc_repo = DocumentRepository(db)
        self.retrieval_service = RetrievalService()
        self.gemini_service = GeminiService()

    async def ask_question(self, user_id: uuid.UUID, request: AskQuestionRequest) -> AskQuestionResponse:
        """Execute end-to-end RAG pipeline with verification and persistent conversation storage."""
        # 1. Validate requested document ownership
        user_docs = await self.doc_repo.get_user_documents_by_ids(user_id, request.document_ids)
        if len(user_docs) != len(request.document_ids):
            raise PermissionDeniedError("One or more selected documents do not exist or do not belong to you.")

        # 2. Ensure all selected documents have completed processing
        for doc in user_docs:
            if doc.status != DocumentStatus.COMPLETED.value:
                raise ValidationError(
                    f"Document '{doc.original_filename}' is not ready (current status: {doc.status}). "
                    "Please wait for processing to complete before querying."
                )

        # 3. Retrieve or create conversation
        if request.conversation_id:
            conversation = await self.chat_repo.get_conversation(request.conversation_id, user_id=user_id)
            if not conversation:
                raise NotFoundError("Conversation not found", error_code="CONVERSATION_NOT_FOUND")
        else:
            # Generate title from question preview
            title = (request.question[:60] + "...") if len(request.question) > 60 else request.question
            conversation = await self.chat_repo.create_conversation(user_id=user_id, title=title)

        # 4. Link documents to conversation
        await self.chat_repo.link_documents_to_conversation(conversation.id, request.document_ids)

        # 5. Fetch recent conversation history for conversational context
        recent_messages = await self.chat_repo.get_recent_messages(conversation.id, limit=6)
        formatted_history = [
            {"role": m.role, "content": m.content} for m in recent_messages
        ]

        # 6. Retrieve relevant semantic chunks
        retrieved_chunks = await self.retrieval_service.retrieve_context(
            question=request.question,
            user_id=user_id,
            document_ids=request.document_ids,
            db=self.db,
        )

        context_block = self.retrieval_service.build_context_block(retrieved_chunks)

        # 7. Generate answer via Gemini 2.5 Flash
        gemini_result = await self.gemini_service.generate_answer(
            question=request.question,
            context_block=context_block,
            conversation_history=formatted_history,
        )

        answer_text = gemini_result.get("answer", "No answer could be generated.")
        raw_chunk_ids = gemini_result.get("referenced_chunk_ids", [])
        is_grounded = gemini_result.get("grounded", True)

        # 8. Validate returned citations against retrieved chunks (Strict citation check)
        retrieved_chunk_map = {c["chunk_id"]: c for c in retrieved_chunks}
        valid_citations: List[CitationItem] = []

        for cid in raw_chunk_ids:
            if cid in retrieved_chunk_map:
                chunk_data = retrieved_chunk_map[cid]
                valid_citations.append(
                    CitationItem(
                        document_id=uuid.UUID(str(chunk_data["document_id"])),
                        filename=chunk_data["filename"],
                        page_number=chunk_data["page_number"],
                        chunk_id=cid,
                    )
                )

        # If model claimed grounding but had no chunks or citations couldn't be validated
        if not retrieved_chunks:
            is_grounded = False
            valid_citations = []

        # 9. Store user message in DB
        await self.chat_repo.add_message(
            conversation_id=conversation.id,
            role="user",
            content=request.question,
        )

        # 10. Store assistant message with validated citations in DB
        citations_json = [c.model_dump(mode="json") for c in valid_citations]
        assistant_msg = await self.chat_repo.add_message(
            conversation_id=conversation.id,
            role="assistant",
            content=answer_text,
            citations=citations_json,
        )

        return AskQuestionResponse(
            conversation_id=conversation.id,
            message_id=assistant_msg.id,
            answer=answer_text,
            citations=valid_citations,
            grounded=is_grounded,
        )

    async def list_conversations(self, user_id: uuid.UUID, page: int = 1, page_size: int = 20) -> ConversationListResponse:
        """List user conversations with document links and message counts."""
        items, total = await self.chat_repo.list_conversations(user_id, page=page, page_size=page_size)

        responses = []
        for conv in items:
            doc_ids = [d.id for d in conv.documents] if conv.documents else []
            msg_count = len(conv.messages) if conv.messages else 0
            responses.append(
                ConversationResponse(
                    id=conv.id,
                    title=conv.title,
                    document_ids=doc_ids,
                    created_at=conv.created_at,
                    updated_at=conv.updated_at,
                    message_count=msg_count,
                )
            )

        return ConversationListResponse(
            items=responses,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_conversation(self, user_id: uuid.UUID, conversation_id: uuid.UUID) -> ConversationResponse:
        """Get single conversation details enforcing ownership."""
        conv = await self.chat_repo.get_conversation(conversation_id)
        if not conv:
            raise NotFoundError("Conversation not found", error_code="CONVERSATION_NOT_FOUND")

        if conv.user_id != user_id:
            raise PermissionDeniedError("You do not have permission to access this conversation.")

        doc_ids = [d.id for d in conv.documents] if conv.documents else []
        return ConversationResponse(
            id=conv.id,
            title=conv.title,
            document_ids=doc_ids,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            message_count=len(conv.messages) if conv.messages else 0,
        )

    async def list_messages(self, user_id: uuid.UUID, conversation_id: uuid.UUID, page: int = 1, page_size: int = 50) -> List[MessageResponse]:
        """List messages in a conversation."""
        # Ensure conversation exists and belongs to user
        conv = await self.chat_repo.get_conversation(conversation_id)
        if not conv:
            raise NotFoundError("Conversation not found", error_code="CONVERSATION_NOT_FOUND")

        if conv.user_id != user_id:
            raise PermissionDeniedError("You do not have permission to view messages in this conversation.")

        items, _ = await self.chat_repo.list_messages(conversation_id, page=page, page_size=page_size)
        results = []
        for m in items:
            citations_list = None
            if m.citations:
                citations_list = [CitationItem(**c) for c in m.citations]
            results.append(
                MessageResponse(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    role=m.role,
                    content=m.content,
                    citations=citations_list,
                    created_at=m.created_at,
                )
            )
        return results

    async def delete_conversation(self, user_id: uuid.UUID, conversation_id: uuid.UUID) -> None:
        """Delete conversation and related messages."""
        conv = await self.chat_repo.get_conversation(conversation_id)
        if not conv:
            raise NotFoundError("Conversation not found", error_code="CONVERSATION_NOT_FOUND")

        if conv.user_id != user_id:
            raise PermissionDeniedError("You do not have permission to delete this conversation.")

        await self.chat_repo.delete_conversation(conv)

