"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import List, Optional, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # General
    APP_NAME: str = "AKTU Notes AI"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Database (supports NeonDB, PostgreSQL, and SQLite)
    DATABASE_URL: str = "postgresql+psycopg://user:password@localhost:5432/aktu_notes"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str) -> str:
        """Normalize NeonDB / Render connection string to use the psycopg driver."""
        if not isinstance(v, str) or not v:
            return v
        cleaned = v.strip()
        # Render / Neon default URLs often start with postgres:// or postgresql://
        if cleaned.startswith("postgres://"):
            cleaned = cleaned.replace("postgres://", "postgresql+psycopg://", 1)
        elif cleaned.startswith("postgresql://") and not cleaned.startswith("postgresql+"):
            cleaned = cleaned.replace("postgresql://", "postgresql+psycopg://", 1)
        return cleaned

    # Security & JWT
    JWT_SECRET_KEY: str = "default_secret_key_change_in_production_min_32_characters"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 15

    # Google Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_CHAT_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "gemini-embedding-001"

    # Storage & Persistence
    CHROMA_PERSIST_DIR: str = "./storage/chroma"
    UPLOAD_DIR: str = "./storage/uploads"

    # PDF Constraints
    MAX_UPLOAD_SIZE_MB: int = 20
    MAX_PDF_PAGES: int = 300

    # RAG Settings
    CHUNK_SIZE_TOKENS: int = 700
    CHUNK_OVERLAP_TOKENS: int = 100
    RAG_TOP_K: int = 3

    # CORS Settings (Allow all origins enabled by default)
    CORS_ORIGIN_ALL: bool = True
    CORS_ORIGINS: Union[str, List[str]] = "*"
    CORS_ALLOW_ORIGIN_REGEX: Optional[str] = None

    # Rate Limiting
    RATE_LIMIT_LOGIN: str = "10/minute"
    RATE_LIMIT_REGISTER: str = "5/minute"
    RATE_LIMIT_CHAT: str = "30/minute"

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGIN_ALL:
            return ["*"]
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if isinstance(self.CORS_ORIGINS, str):
            if self.CORS_ORIGINS.strip() == "*":
                return ["*"]
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return ["*"]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
