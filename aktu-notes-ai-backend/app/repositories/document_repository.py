"""Repository for Document entity operations."""

import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentStatus


class DocumentRepository:
    """Handles database persistence for uploaded PDF documents."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, document_id: uuid.UUID, user_id: Optional[uuid.UUID] = None) -> Optional[Document]:
        """Fetch document by ID, optionally verifying ownership."""
        stmt = select(Document).where(Document.id == document_id)
        if user_id:
            stmt = stmt.where(Document.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_user_documents_by_ids(self, user_id: uuid.UUID, document_ids: List[uuid.UUID]) -> List[Document]:
        """Fetch multiple documents belonging to a user."""
        stmt = select(Document).where(
            Document.user_id == user_id,
            Document.id.in_(document_ids),
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_by_user(self, user_id: uuid.UUID, page: int = 1, page_size: int = 20) -> Tuple[List[Document], int]:
        """List documents owned by user with pagination."""
        offset = (page - 1) * page_size

        total_stmt = select(func.count()).select_from(Document).where(Document.user_id == user_id)
        total_res = await self.db.execute(total_stmt)
        total = total_res.scalar_one()

        stmt = (
            select(Document)
            .where(Document.user_id == user_id)
            .order_by(Document.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        items = list(result.scalars().all())

        # Auto-recover orphaned documents stuck in pending/processing for > 3 minutes
        now = datetime.now(timezone.utc)
        updated_any = False
        for item in items:
            if item.status in (DocumentStatus.PROCESSING.value, DocumentStatus.PENDING.value):
                created_at = item.created_at
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                if (now - created_at).total_seconds() > 180:
                    item.status = DocumentStatus.FAILED.value
                    item.error_message = "Processing timed out. Please delete and re-upload your document."
                    updated_any = True

        if updated_any:
            await self.db.commit()

        return items, total

    async def create(
        self,
        user_id: uuid.UUID,
        original_filename: str,
        storage_path: str,
        file_size: int,
        document_id: Optional[uuid.UUID] = None,
    ) -> Document:
        """Create a new document record."""
        document = Document(
            id=document_id or uuid.uuid4(),
            user_id=user_id,
            original_filename=original_filename,
            storage_path=storage_path,
            file_size=file_size,
            status=DocumentStatus.PENDING.value,
        )
        self.db.add(document)
        await self.db.flush()
        await self.db.refresh(document)
        return document

    async def update_status(
        self,
        document_id: uuid.UUID,
        status: DocumentStatus,
        page_count: Optional[int] = None,
        chunk_count: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Optional[Document]:
        """Update processing status and extracted stats."""
        doc = await self.get_by_id(document_id)
        if not doc:
            return None

        doc.status = status.value
        if page_count is not None:
            doc.page_count = page_count
        if chunk_count is not None:
            doc.chunk_count = chunk_count
        doc.error_message = error_message

        if status == DocumentStatus.COMPLETED:
            doc.processed_at = datetime.now(timezone.utc)
            doc.error_message = None

        await self.db.flush()
        await self.db.refresh(doc)
        return doc

    async def delete(self, document: Document) -> None:
        """Delete document record."""
        await self.db.delete(document)
        await self.db.flush()

