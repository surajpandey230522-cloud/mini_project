"""FastAPI route dependencies for authentication, DB sessions, and rate limiting."""

import uuid
from typing import AsyncGenerator
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

# HTTP Bearer scheme
bearer_scheme = HTTPBearer(auto_error=False)

# Rate limiter setup
limiter = Limiter(key_func=get_remote_address)


async def get_current_user(
    auth_header: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Dependency that authenticates JWT Bearer access token and returns User entity."""
    if not auth_header or not auth_header.credentials:
        raise AuthenticationError("Authentication token is required")

    token = auth_header.credentials
    payload = decode_access_token(token)

    sub = payload.get("sub")
    if not sub:
        raise AuthenticationError("Invalid token payload")

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise AuthenticationError("Invalid user ID in token")

    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)

    if not user:
        raise AuthenticationError("User not found")

    if not user.is_active:
        raise PermissionDeniedError("User account is inactive")

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency ensuring current user is active."""
    if not current_user.is_active:
        raise PermissionDeniedError("User account is inactive")
    return current_user

