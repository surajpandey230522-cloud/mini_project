"""Pytest fixtures and configuration for testing AKTU Notes AI backend."""

import asyncio
import os
import shutil
import tempfile
import uuid
from typing import AsyncGenerator
import pymupdf as fitz
import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Set test environment variables before importing app
os.environ["APP_ENV"] = "testing"
os.environ["DEBUG"] = "false"
os.environ["JWT_SECRET_KEY"] = "test_super_secret_key_for_testing_purposes_only_32_chars"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"

from app.core.config import get_settings
from app.core.dependencies import get_db
from app.core.security import create_access_token, get_password_hash
from app.models import (
    Base,
    User,
    Document,
    DocumentChunk,
    Conversation,
    Message,
    RefreshToken,
    PasswordResetToken,
)
from app.main import app as fastapi_app

# Temporary directories for uploads, ChromaDB, and DB during tests
temp_test_dir = tempfile.mkdtemp(prefix="aktu_test_")
test_upload_dir = os.path.join(temp_test_dir, "uploads")
test_chroma_dir = os.path.join(temp_test_dir, "chroma")
test_db_file = os.path.join(temp_test_dir, "test.db")
os.makedirs(test_upload_dir, exist_ok=True)
os.makedirs(test_chroma_dir, exist_ok=True)

# Override storage directories and database URL in settings
settings = get_settings()
settings.UPLOAD_DIR = test_upload_dir
settings.CHROMA_PERSIST_DIR = test_chroma_dir
test_db_url = f"sqlite+aiosqlite:///{test_db_file}"
settings.DATABASE_URL = test_db_url

# Test async engine using temporary SQLite database file
test_engine = create_async_engine(
    test_db_url,
    connect_args={"check_same_thread": False},
)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# Bind session maker so background tasks write to the same test database
import app.db.session
app.db.session.engine = test_engine
app.db.session.async_session_maker = TestSessionLocal


@pytest.fixture(scope="session", autouse=True)
def clean_test_environment():
    """Clean up temp storage directory after test session."""
    yield
    shutil.rmtree(temp_test_dir, ignore_errors=True)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Create fresh database tables in-memory for each test and yield session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestSessionLocal() as session:
        yield session
        await session.rollback()

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """HTTP async test client with overridden database dependency."""
    async def override_get_db():
        async with TestSessionLocal() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    fastapi_app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=fastapi_app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    fastapi_app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def registered_user(db_session: AsyncSession) -> User:
    """Create and return a test user in DB."""
    user = User(
        id=uuid.uuid4(),
        full_name="Test Student",
        email="student@aktu.ac.in",
        password_hash=get_password_hash("StrongPass123!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def auth_headers(registered_user: User) -> dict:
    """Return Authorization headers for registered_user."""
    token = create_access_token(str(registered_user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def second_user(db_session: AsyncSession) -> User:
    """Create a second distinct user for cross-user security checks."""
    user = User(
        id=uuid.uuid4(),
        full_name="Second Student",
        email="second@aktu.ac.in",
        password_hash=get_password_hash("StrongPass456!"),
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def second_auth_headers(second_user: User) -> dict:
    """Return Authorization headers for second_user."""
    token = create_access_token(str(second_user.id))
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Generate a valid in-memory academic PDF with PyMuPDF."""
    doc = fitz.open()
    # Page 1
    p1 = doc.new_page()
    p1.insert_text(
        fitz.Point(50, 72),
        "AKTU University - Database Management Systems (DBMS)\nUnit 2: Normalization.\n\n"
        "Normalization is the process of organizing data in a database to reduce redundancy "
        "and improve data integrity. First Normal Form (1NF) requires atomic attribute values. "
        "Second Normal Form (2NF) eliminates partial functional dependencies on candidate keys.\n"
    )
    # Page 2
    p2 = doc.new_page()
    p2.insert_text(
        fitz.Point(50, 72),
        "Third Normal Form (3NF) requires eliminating transitive dependencies.\n"
        "Boyce-Codd Normal Form (BCNF) is a stricter version of 3NF where every determinant is a superkey.\n"
        "Denormalization is intentionally introducing redundancy for read performance optimization."
    )
    pdf_bytes = doc.write()
    doc.close()
    return pdf_bytes

