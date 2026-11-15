"""Security and data isolation tests."""

import uuid
import pytest
from httpx import AsyncClient

from app.core.security import create_access_token
from app.models.conversation import Conversation
from app.models.document import Document, DocumentStatus
from app.utils.file_utils import sanitize_filename


@pytest.mark.asyncio
async def test_cross_user_document_access_denied(
    client: AsyncClient,
    db_session,
    registered_user,
    second_user,
    second_auth_headers,
):
    """User B must be forbidden from accessing User A's document."""
    # Create document owned by User A
    doc_a = Document(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        original_filename="UserA_Private_Notes.pdf",
        storage_path="/tmp/fake_a.pdf",
        file_size=2048,
        status=DocumentStatus.COMPLETED.value,
    )
    db_session.add(doc_a)
    await db_session.commit()

    # User B attempts to read User A's document metadata
    resp_meta = await client.get(f"/api/v1/documents/{doc_a.id}", headers=second_auth_headers)
    assert resp_meta.status_code == 403
    assert resp_meta.json()["error_code"] == "PERMISSION_DENIED"

    # User B attempts to delete User A's document
    resp_del = await client.delete(f"/api/v1/documents/{doc_a.id}", headers=second_auth_headers)
    assert resp_del.status_code == 403
    assert resp_del.json()["error_code"] == "PERMISSION_DENIED"


@pytest.mark.asyncio
async def test_cross_user_rag_query_denied(
    client: AsyncClient,
    db_session,
    registered_user,
    second_auth_headers,
):
    """User B must be forbidden from querying against User A's document IDs."""
    doc_a = Document(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        original_filename="UserA_Confidential.pdf",
        storage_path="/tmp/fake_a.pdf",
        file_size=2048,
        status=DocumentStatus.COMPLETED.value,
    )
    db_session.add(doc_a)
    await db_session.commit()

    # User B attempts to ask question on User A's document
    payload = {
        "question": "What is in User A's confidential notes?",
        "document_ids": [str(doc_a.id)],
    }
    response = await client.post("/api/v1/chats/ask", json=payload, headers=second_auth_headers)
    assert response.status_code == 403
    assert "do not belong to you" in response.json()["detail"]


@pytest.mark.asyncio
async def test_cross_user_chat_access_denied(
    client: AsyncClient,
    db_session,
    registered_user,
    second_auth_headers,
):
    """User B must be forbidden from reading User A's conversation thread."""
    conv_a = Conversation(
        id=uuid.uuid4(),
        user_id=registered_user.id,
        title="User A Secret Chat",
    )
    db_session.add(conv_a)
    await db_session.commit()

    response = await client.get(f"/api/v1/chats/{conv_a.id}", headers=second_auth_headers)
    assert response.status_code == 403
    assert response.json()["error_code"] == "PERMISSION_DENIED"


@pytest.mark.asyncio
async def test_invalid_jwt_tampering(client: AsyncClient):
    """Tampered or forged JWT tokens must be rejected with 401."""
    # Malformed token
    headers1 = {"Authorization": "Bearer not.a.valid.jwt.token"}
    resp1 = await client.get("/api/v1/users/me", headers=headers1)
    assert resp1.status_code == 401

    # Token signed with different key
    import jwt
    bogus_token = jwt.encode({"sub": str(uuid.uuid4()), "token_type": "access"}, "wrong_secret", algorithm="HS256")
    headers2 = {"Authorization": f"Bearer {bogus_token}"}
    resp2 = await client.get("/api/v1/users/me", headers=headers2)
    assert resp2.status_code == 401


def test_path_traversal_sanitization():
    """Verify filename sanitization strips directory traversal sequences."""
    malicious_inputs = [
        "../../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\cmd.exe",
        "nested/subfolder/../../../notes.pdf",
        "notes\x00.pdf",
    ]
    for raw in malicious_inputs:
        cleaned = sanitize_filename(raw)
        assert "/" not in cleaned
        assert "\\" not in cleaned
        assert ".." not in cleaned
        assert cleaned.endswith(".pdf")

