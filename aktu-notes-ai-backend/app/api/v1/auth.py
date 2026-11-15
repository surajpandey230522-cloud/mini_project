"""Authentication API endpoints."""

from typing import Optional
from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_db, limiter
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserSummary,
)
from app.services.auth_service import AuthService

settings = get_settings()
router = APIRouter()


@router.post(
    "/register",
    response_model=UserSummary,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new student account",
)
@limiter.limit(settings.RATE_LIMIT_REGISTER)
async def register(
    request: Request,
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """Register a new student account with validated email and password."""
    service = AuthService(db)
    return await service.register(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate student and obtain access & refresh tokens",
)
@limiter.limit(settings.RATE_LIMIT_LOGIN)
async def login(
    request: Request,
    response: Response,
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """Log in with email and password. Sets secure HttpOnly cookie with rotating refresh token."""
    service = AuthService(db)
    token_response, raw_refresh = await service.login(payload)

    # Set secure HttpOnly cookie for browser clients
    response.set_cookie(
        key="refresh_token",
        value=raw_refresh,
        httponly=True,
        secure=(settings.APP_ENV == "production"),
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth",
    )
    return token_response


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate refresh token and issue new access token",
)
async def refresh_token(
    response: Response,
    payload: Optional[RefreshTokenRequest] = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db),
):
    """Rotate refresh token. Accepts token from request body or HttpOnly cookie."""
    token_str = (payload.refresh_token if payload and payload.refresh_token else None) or refresh_token_cookie
    if not token_str:
        from app.core.exceptions import AuthenticationError
        raise AuthenticationError("Refresh token is required")

    service = AuthService(db)
    token_response, new_refresh = await service.refresh_tokens(token_str)

    # Update HttpOnly cookie with rotated token
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        httponly=True,
        secure=(settings.APP_ENV == "production"),
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path="/api/v1/auth",
    )
    return token_response


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Log out and invalidate current refresh token",
)
async def logout(
    response: Response,
    payload: Optional[RefreshTokenRequest] = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db),
):
    """Revoke refresh token and clear auth cookies."""
    token_str = (payload.refresh_token if payload and payload.refresh_token else None) or refresh_token_cookie
    service = AuthService(db)
    await service.logout(token_str)

    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return MessageResponse(message="Successfully logged out")


@router.post(
    "/logout-all",
    response_model=MessageResponse,
    summary="Revoke all active sessions for current user",
)
async def logout_all(
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Revoke all active sessions and refresh tokens across all devices."""
    service = AuthService(db)
    revoked_count = await service.logout_all(current_user.id)
    response.delete_cookie(key="refresh_token", path="/api/v1/auth")
    return MessageResponse(message=f"Logged out from all sessions ({revoked_count} tokens revoked)")


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password and terminate existing sessions",
)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change user password. Requires current password verification."""
    service = AuthService(db)
    await service.change_password(current_user.id, payload)
    return MessageResponse(message="Password successfully changed. All other sessions have been logged out.")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset link/token",
)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request password reset. Returns generic message to avoid email enumeration."""
    service = AuthService(db)
    reset_token = await service.request_password_reset(payload)
    # In production, an email is dispatched. In development/testing, logging token helps
    if reset_token and settings.DEBUG:
        return MessageResponse(message=f"Reset token generated (debug mode): {reset_token}")
    return MessageResponse(message="If an account exists with that email, password reset instructions have been sent.")


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using valid reset token",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Set new password using single-use expiring token."""
    service = AuthService(db)
    await service.reset_password(payload)
    return MessageResponse(message="Password has been reset successfully. You may now log in.")

