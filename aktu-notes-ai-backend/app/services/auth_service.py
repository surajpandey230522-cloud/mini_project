"""Authentication and session management service."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import (
    AuthenticationError,
    ConflictError,
    NotFoundError,
    TokenExpiredError,
    TokenRevokedError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    generate_secure_token,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserSummary,
)

settings = get_settings()


def ensure_utc(dt: datetime) -> datetime:
    """Ensure datetime has UTC timezone."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class AuthService:
    """Business logic for user registration, login, token lifecycle, and password resets."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)

    async def register(self, payload: UserRegisterRequest) -> UserSummary:
        """Register a new student account."""
        existing_user = await self.user_repo.get_by_email(payload.email)
        if existing_user:
            raise ConflictError("An account with this email already exists", error_code="EMAIL_EXISTS")

        hashed_password = get_password_hash(payload.password)
        user = await self.user_repo.create(
            full_name=payload.full_name,
            email=payload.email,
            password_hash=hashed_password,
        )
        return UserSummary.model_validate(user)

    async def login(self, payload: UserLoginRequest) -> Tuple[TokenResponse, str]:
        """Authenticate student and issue JWT access token and rotating refresh token."""
        user = await self.user_repo.get_by_email(payload.email)
        # Use constant time comparison / generic error message to avoid email enumeration
        if not user or not verify_password(payload.password, user.password_hash):
            raise AuthenticationError("Invalid email or password")

        if not user.is_active:
            raise AuthenticationError("Account has been deactivated. Please contact support.")

        # Generate tokens
        access_token = create_access_token(
            subject=str(user.id),
            claims={"email": user.email, "name": user.full_name},
        )
        raw_refresh_token = generate_secure_token()
        refresh_hash = hash_token(raw_refresh_token)
        refresh_expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.user_repo.create_refresh_token(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_expires,
        )

        token_response = TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="Bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserSummary.model_validate(user),
        )
        return token_response, raw_refresh_token

    async def refresh_tokens(self, raw_refresh_token: str) -> Tuple[TokenResponse, str]:
        """Rotate refresh token: revoke existing and generate new token pair."""
        token_hash = hash_token(raw_refresh_token)
        token_record = await self.user_repo.get_refresh_token(token_hash)

        if not token_record:
            raise AuthenticationError("Invalid refresh token")

        if token_record.revoked_at is not None:
            # Token reuse detection: if revoked token is used, revoke all user tokens as precaution
            await self.user_repo.revoke_all_user_refresh_tokens(token_record.user_id)
            raise TokenRevokedError("Refresh token has been revoked. Security alert: please log in again.")

        now = datetime.now(timezone.utc)
        if ensure_utc(token_record.expires_at) < now:
            raise TokenExpiredError("Refresh token has expired")

        user = await self.user_repo.get_by_id(token_record.user_id)
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")

        # 1. Revoke the used refresh token (Rotation)
        token_record.revoked_at = now

        # 2. Issue new tokens
        new_access_token = create_access_token(
            subject=str(user.id),
            claims={"email": user.email, "name": user.full_name},
        )
        new_raw_refresh = generate_secure_token()
        new_refresh_hash = hash_token(new_raw_refresh)
        new_refresh_expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

        await self.user_repo.create_refresh_token(
            user_id=user.id,
            token_hash=new_refresh_hash,
            expires_at=new_refresh_expires,
        )

        token_response = TokenResponse(
            access_token=new_access_token,
            refresh_token=new_raw_refresh,
            token_type="Bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserSummary.model_validate(user),
        )
        return token_response, new_raw_refresh

    async def logout(self, raw_refresh_token: Optional[str]) -> None:
        """Revoke specified refresh token upon logout."""
        if raw_refresh_token:
            token_hash = hash_token(raw_refresh_token)
            await self.user_repo.revoke_refresh_token(token_hash)

    async def logout_all(self, user_id: uuid.UUID) -> int:
        """Revoke all sessions/refresh tokens for a user."""
        return await self.user_repo.revoke_all_user_refresh_tokens(user_id)

    async def change_password(self, user_id: uuid.UUID, payload: ChangePasswordRequest) -> None:
        """Change user password and revoke all active sessions."""
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("User not found")

        if not verify_password(payload.current_password, user.password_hash):
            raise AuthenticationError("Current password is incorrect")

        user.password_hash = get_password_hash(payload.new_password)
        await self.db.flush()
        # Revoke all existing sessions for security
        await self.user_repo.revoke_all_user_refresh_tokens(user.id)

    async def request_password_reset(self, payload: ForgotPasswordRequest) -> Optional[str]:
        """Generate single-use password reset token. In production this triggers email delivery."""
        user = await self.user_repo.get_by_email(payload.email)
        if not user or not user.is_active:
            # Return None silently to avoid disclosing registered user emails
            return None

        raw_reset_token = generate_secure_token(32)
        token_hash = hash_token(raw_reset_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

        await self.user_repo.create_password_reset_token(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        # Return token so caller/test/email delivery can use it
        return raw_reset_token

    async def reset_password(self, payload: ResetPasswordRequest) -> None:
        """Validate reset token and update password."""
        token_hash = hash_token(payload.token)
        record = await self.user_repo.get_password_reset_token(token_hash)

        if not record:
            raise ValidationError("Invalid or expired password reset token")

        if record.used_at is not None:
            raise ValidationError("This password reset token has already been used")

        if ensure_utc(record.expires_at) < datetime.now(timezone.utc):
            raise ValidationError("Password reset token has expired")

        user = await self.user_repo.get_by_id(record.user_id)
        if not user:
            raise NotFoundError("User not found")

        user.password_hash = get_password_hash(payload.new_password)
        await self.user_repo.mark_password_reset_used(record)
        # Revoke all active sessions
        await self.user_repo.revoke_all_user_refresh_tokens(user.id)

