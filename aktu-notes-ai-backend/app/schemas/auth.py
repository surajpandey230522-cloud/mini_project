"""Authentication and authorization schemas."""

import re
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserRegisterRequest(BaseModel):
    """Schema for student registration."""
    full_name: str = Field(..., min_length=2, max_length=255, description="Full name of student")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, max_length=128, description="Strong password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_+=\[\]/\\~`']", v):
            raise ValueError("Password must contain at least one special character")
        return v


class UserLoginRequest(BaseModel):
    """Schema for student login."""
    email: EmailStr = Field(..., description="Student email")
    password: str = Field(..., description="Student password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserSummary(BaseModel):
    """Brief user details returned on auth."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    email: str
    is_active: bool


class TokenResponse(BaseModel):
    """Token response schema for login and refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int  # in seconds
    user: UserSummary


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token endpoint."""
    refresh_token: Optional[str] = Field(None, description="Optional if provided via HttpOnly cookie")


class ChangePasswordRequest(BaseModel):
    """Schema for changing password."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New strong password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return UserRegisterRequest.validate_password_strength(v)


class ForgotPasswordRequest(BaseModel):
    """Schema for requesting password reset."""
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    """Schema for resetting password with token."""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New strong password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        return UserRegisterRequest.validate_password_strength(v)


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str

