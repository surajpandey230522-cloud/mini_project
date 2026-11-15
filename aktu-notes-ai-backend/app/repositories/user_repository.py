"""Repository for User and Token database operations."""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.refresh_token import RefreshToken, PasswordResetToken


class UserRepository:
    """Handles persistence operations for users and auth tokens."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Fetch user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Fetch user by normalized email."""
        result = await self.db.execute(select(User).where(User.email == email.strip().lower()))
        return result.scalar_one_or_none()

    async def create(self, full_name: str, email: str, password_hash: str) -> User:
        """Create new user."""
        user = User(
            full_name=full_name.strip(),
            email=email.strip().lower(),
            password_hash=password_hash,
            is_active=True,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def update(self, user: User, **kwargs) -> User:
        """Update user fields."""
        for key, value in kwargs.items():
            if hasattr(user, key) and value is not None:
                setattr(user, key, value)
        await self.db.flush()
        await self.db.refresh(user)
        return user

    # Refresh Token Operations
    async def create_refresh_token(self, user_id: uuid.UUID, token_hash: str, expires_at: datetime) -> RefreshToken:
        """Persist a new refresh token hash."""
        token = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(token)
        await self.db.flush()
        return token

    async def get_refresh_token(self, token_hash: str) -> Optional[RefreshToken]:
        """Retrieve refresh token record by its SHA-256 hash."""
        result = await self.db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token_hash: str) -> bool:
        """Revoke a single refresh token."""
        token = await self.get_refresh_token(token_hash)
        if token and not token.revoked_at:
            token.revoked_at = datetime.now(timezone.utc)
            await self.db.flush()
            return True
        return False

    async def revoke_all_user_refresh_tokens(self, user_id: uuid.UUID) -> int:
        """Revoke all active refresh tokens for a user."""
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=datetime.now(timezone.utc))
        )
        result = await self.db.execute(stmt)
        await self.db.flush()
        return result.rowcount

    # Password Reset Operations
    async def create_password_reset_token(self, user_id: uuid.UUID, token_hash: str, expires_at: datetime) -> PasswordResetToken:
        """Persist a password reset token."""
        reset_token = PasswordResetToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        self.db.add(reset_token)
        await self.db.flush()
        return reset_token

    async def get_password_reset_token(self, token_hash: str) -> Optional[PasswordResetToken]:
        """Fetch reset token by hash."""
        result = await self.db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def mark_password_reset_used(self, reset_token: PasswordResetToken) -> None:
        """Mark reset token as used."""
        reset_token.used_at = datetime.now(timezone.utc)
        await self.db.flush()

