"""Database session management with SQLAlchemy 2.0 AsyncEngine."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import get_settings
from app.core.logging import logger

settings = get_settings()

# Engine configuration
engine_kwargs = {
    "echo": settings.DEBUG,
    "future": True,
}

if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs.update({
        "pool_size": 20,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    })

try:
    engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)
except Exception as e:
    logger.warning(
        f"Could not load database driver for '{settings.DATABASE_URL}': {e}. "
        "Falling back to local SQLite database for development."
    )
    fallback_url = "sqlite+aiosqlite:///./storage/local_dev.db"
    engine = create_async_engine(fallback_url, connect_args={"check_same_thread": False})

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency that yields an async database session and ensures proper closure."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

