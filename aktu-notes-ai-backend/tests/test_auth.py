"""Tests for authentication, authorization, and token lifecycle."""

import pytest
from httpx import AsyncClient

from app.core.security import create_access_token


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Verify health endpoint."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "AKTU Notes AI"


@pytest.mark.asyncio
async def test_user_registration_success(client: AsyncClient):
    """Test successful user registration with valid details."""
    payload = {
        "full_name": "Rohan Sharma",
        "email": "rohan.sharma@aktu.ac.in",
        "password": "StrongPassword123!",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Rohan Sharma"
    assert data["email"] == "rohan.sharma@aktu.ac.in"
    assert data["is_active"] is True
    assert "password" not in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_duplicate_registration_rejection(client: AsyncClient, registered_user):
    """Ensure duplicate email registration is rejected with 409 Conflict."""
    payload = {
        "full_name": "Another User",
        "email": registered_user.email,  # same email
        "password": "AnotherPassword456!",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409
    assert response.json()["error_code"] == "EMAIL_EXISTS"


@pytest.mark.asyncio
async def test_weak_password_rejection(client: AsyncClient):
    """Ensure registration fails when password is weak."""
    payload = {
        "full_name": "Weak User",
        "email": "weak@example.com",
        "password": "password",  # no uppercase, no numbers, no special chars
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient, registered_user):
    """Test valid login returns tokens and sets cookie."""
    payload = {
        "email": registered_user.email,
        "password": "StrongPass123!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "Bearer"
    assert data["user"]["email"] == registered_user.email

    # Check HttpOnly cookie
    assert "refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient, registered_user):
    """Test login with incorrect password returns 401 with generic message."""
    payload = {
        "email": registered_user.email,
        "password": "WrongPassword999!",
    }
    response = await client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert response.json()["error_code"] == "AUTHENTICATION_FAILED"


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient, registered_user):
    """Verify refresh token rotation and revocation of old token."""
    # 1. Login to obtain tokens
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user.email, "password": "StrongPass123!"},
    )
    tokens = login_resp.json()
    initial_refresh = tokens["refresh_token"]

    # 2. Use refresh token
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    new_refresh = new_tokens["refresh_token"]
    assert new_refresh != initial_refresh

    # 3. Attempting to use the revoked old refresh token must fail (Token Reuse Detection)
    reuse_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": initial_refresh},
    )
    assert reuse_resp.status_code == 401
    assert reuse_resp.json()["error_code"] == "TOKEN_REVOKED"


@pytest.mark.asyncio
async def test_logout(client: AsyncClient, registered_user):
    """Test logout invalidates the refresh token."""
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user.email, "password": "StrongPass123!"},
    )
    refresh_token = login_resp.json()["refresh_token"]

    # Logout
    logout_resp = await client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout_resp.status_code == 200

    # Refresh should now fail
    ref_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert ref_resp.status_code == 401


@pytest.mark.asyncio
async def test_change_password(client: AsyncClient, registered_user, auth_headers):
    """Test change password updates password and revokes previous sessions."""
    payload = {
        "current_password": "StrongPass123!",
        "new_password": "UpdatedPassword456@",
    }
    response = await client.post("/api/v1/auth/change-password", json=payload, headers=auth_headers)
    assert response.status_code == 200

    # Login with old password must fail
    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user.email, "password": "StrongPass123!"},
    )
    assert old_login.status_code == 401

    # Login with new password must succeed
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user.email, "password": "UpdatedPassword456@"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_protected_routes_require_auth(client: AsyncClient):
    """Protected endpoints must reject requests without valid Bearer token."""
    resp1 = await client.get("/api/v1/users/me")
    assert resp1.status_code == 401

    resp2 = await client.get("/api/v1/documents")
    assert resp2.status_code == 401

    resp3 = await client.get("/api/v1/chats")
    assert resp3.status_code == 401

