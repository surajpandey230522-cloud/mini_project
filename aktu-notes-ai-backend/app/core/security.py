"""Security utilities for Argon2id hashing, JWT handling, and tokens."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError, TokenExpiredError

settings = get_settings()

# Argon2id password hasher instance
pwd_hasher = PasswordHasher(
    time_cost=2,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
)


def get_password_hash(password: str) -> str:
    """Hash password using Argon2id."""
    return pwd_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against Argon2id hash."""
    try:
        return pwd_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def create_access_token(subject: str, expires_delta: Optional[timedelta] = None, claims: Optional[Dict[str, Any]] = None) -> str:
    """Create signed JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: Dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "token_type": "access",
    }
    if claims:
        to_encode.update(claims)

    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        token_type = payload.get("token_type")
        if token_type != "access":
            raise AuthenticationError("Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise TokenExpiredError("Access token has expired")
    except jwt.InvalidTokenError:
        raise AuthenticationError("Could not validate credentials")


def generate_secure_token(length: int = 48) -> str:
    """Generate cryptographically secure random string."""
    return secrets.token_urlsafe(length)


def hash_token(raw_token: str) -> str:
    """Hash a raw token (refresh token or reset token) with SHA-256 for safe storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

