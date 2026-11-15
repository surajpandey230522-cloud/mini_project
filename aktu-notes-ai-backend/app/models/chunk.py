"""Document chunk database model with native pgvector support for NeonDB."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List
from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.document import Document
    from app.models.user import User


class DocumentChunk(Base):
    """Stores text chunks and their 768-dim embeddings in NeonDB via pgvector."""

    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    chunk_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    page_range: Mapped[List[int]] = mapped_column(JSON, default=list, nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    # 768 dimensions for Gemini embeddings (text-embedding-004 / gemini-embedding-001)
    # Uses native VECTOR(768) on PostgreSQL/NeonDB, and JSON on SQLite for tests
    embedding = mapped_column(
        Vector(768).with_variant(JSON(), "sqlite"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    document: Mapped["Document"] = relationship("Document", backref="chunks")
    user: Mapped["User"] = relationship("User")

