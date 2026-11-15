"""Tests for document upload, validation, streaming, and deletion."""

import io
import uuid
import pytest
from httpx import AsyncClient

from app.models.document import DocumentStatus


@pytest.mark.asyncio
async def test_pdf_upload_success(client: AsyncClient, auth_headers, sample_pdf_bytes):
    """Test successful upload of valid PDF document."""
    files = {
        "file": ("DBMS_Unit_2_Notes.pdf", sample_pdf_bytes, "application/pdf")
    }
    response = await client.post("/api/v1/documents", files=files, headers=auth_headers)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["original_filename"] == "DBMS_Unit_2_Notes.pdf"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_upload_invalid_mime_type(client: AsyncClient, auth_headers):
    """Test rejection when uploading non-PDF MIME type."""
    files = {
        "file": ("notes.txt", b"plain text notes", "text/plain")
    }
    response = await client.post("/api/v1/documents", files=files, headers=auth_headers)
    assert response.status_code == 400
    assert response.json()["error_code"] == "FILE_UPLOAD_ERROR"


@pytest.mark.asyncio
async def test_upload_invalid_pdf_magic_bytes(client: AsyncClient, auth_headers):
    """Test rejection when file has .pdf extension but lacks %PDF- header."""
    files = {
        "file": ("fake.pdf", b"This is not a real PDF binary", "application/pdf")
    }
    response = await client.post("/api/v1/documents", files=files, headers=auth_headers)
    assert response.status_code == 400
    assert "header does not match a valid PDF" in response.json()["detail"]


@pytest.mark.asyncio
async def test_document_listing(client: AsyncClient, auth_headers, sample_pdf_bytes):
    """Test listing user uploaded documents with pagination."""
    # Upload two documents
    files1 = {"file": ("Doc1.pdf", sample_pdf_bytes, "application/pdf")}
    files2 = {"file": ("Doc2.pdf", sample_pdf_bytes, "application/pdf")}
    await client.post("/api/v1/documents", files=files1, headers=auth_headers)
    await client.post("/api/v1/documents", files=files2, headers=auth_headers)

    response = await client.get("/api/v1/documents?page=1&page_size=10", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2
    assert len(data["items"]) >= 2
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_document_metadata_and_file_download(client: AsyncClient, auth_headers, sample_pdf_bytes):
    """Test fetching metadata and streaming PDF file."""
    upload_resp = await client.post(
        "/api/v1/documents",
        files={"file": ("DownloadTest.pdf", sample_pdf_bytes, "application/pdf")},
        headers=auth_headers,
    )
    doc_id = upload_resp.json()["id"]

    # 1. Get metadata
    meta_resp = await client.get(f"/api/v1/documents/{doc_id}", headers=auth_headers)
    assert meta_resp.status_code == 200
    assert meta_resp.json()["original_filename"] == "DownloadTest.pdf"
    assert "storage_path" not in meta_resp.json()  # Internal path must not be leaked

    # 2. Download file
    file_resp = await client.get(f"/api/v1/documents/{doc_id}/file", headers=auth_headers)
    assert file_resp.status_code == 200
    assert file_resp.headers["content-type"] == "application/pdf"
    assert file_resp.content == sample_pdf_bytes


@pytest.mark.asyncio
async def test_document_deletion(client: AsyncClient, auth_headers, sample_pdf_bytes):
    """Test permanent deletion of document."""
    upload_resp = await client.post(
        "/api/v1/documents",
        files={"file": ("ToDelete.pdf", sample_pdf_bytes, "application/pdf")},
        headers=auth_headers,
    )
    doc_id = upload_resp.json()["id"]

    # Delete
    del_resp = await client.delete(f"/api/v1/documents/{doc_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    # Ensure document is no longer found
    get_resp = await client.get(f"/api/v1/documents/{doc_id}", headers=auth_headers)
    assert get_resp.status_code == 404

