# AKTU Notes AI — Backend

> High-performance, production-ready Retrieval-Augmented Generation (RAG) backend engineered for AKTU university students to chat with lecture notes, Quantum series, lab manuals, and syllabus PDFs with verified page-number citations.

---

## 1. Project Overview

**AKTU Notes AI** is a specialized academic RAG backend powered by **FastAPI**, **PostgreSQL**, **ChromaDB**, and **Google Gemini 2.5 Flash**. 

Students upload complex academic PDFs (such as AKTU syllabus notes, Quantum series problem sets, and lab manuals) and query them through interactive conversational sessions. The backend retrieves the most relevant semantic passages from authorized documents and generates answers grounded strictly in the source material, providing exact PDF filename and page number citations to eliminate hallucinations.

---

## 2. Key Features

- **Authentication & Security:**
  - Student registration and login with email normalization and password strength enforcement.
  - State-of-the-art **Argon2id** password hashing.
  - Stateless **JWT access tokens** (15-minute validity) paired with **rotating refresh tokens** (7-day validity).
  - Secure HttpOnly cookies for browser clients with CSRF protections.
  - Server-side refresh token revocation and token-reuse breach detection.
  - Granular ownership verification on every document, conversation, and vector query.
  - Rate limiting on sensitive authentication and LLM inference endpoints.

- **PDF Ingestion & Processing:**
  - Secure upload handling with magic-byte (`%PDF-`) verification and MIME inspection.
  - Path traversal protection using UUID-based isolated filesystem storage.
  - Fast page-by-page text extraction using **PyMuPDF**.
  - Intelligent detection of scanned/empty PDFs (rejects image-only PDFs with clear feedback).
  - Multi-page citation preservation across chunk boundaries.

- **Vector Search & RAG Architecture:**
  - Semantic text chunking respecting paragraph and sentence boundaries.
  - Persistent vector storage using **ChromaDB** with cosine distance metrics.
  - Unified vector collection strictly filtered by `user_id` and authorized `document_ids`.
  - Official **Google Gemini SDK** integration for embeddings and answer generation.
  - Strict academic system instructions forbidding fact fabrication or citation hallucination.
  - Citation validation: The backend matches returned chunk references against actual retrieved passages, stripping any unverified citations.

- **Conversation & Message Management:**
  - Persistent multi-turn conversations stored in PostgreSQL.
  - Document association per conversation.
  - Multi-message context memory for follow-up questions.
  - Cascading deletion of documents (removes physical files, ChromaDB vectors, and DB records).

---

## 3. Technology Stack

| Layer | Component | Version / Library |
|---|---|---|
| **Language & Framework** | Python & FastAPI | Python 3.12+ / FastAPI 0.115+ |
| **Relational Database** | PostgreSQL & SQLAlchemy | PostgreSQL 16 / SQLAlchemy 2.0 (Async) |
| **Database Migrations** | Alembic | Alembic 1.13+ |
| **Database Driver** | Psycopg 3 | psycopg[binary] 3.2+ / aiosqlite |
| **Authentication** | JWT & Argon2id | PyJWT / argon2-cffi |
| **AI LLM** | Google Gemini 2.5 Flash | `google-genai` SDK (`gemini-2.5-flash`) |
| **Vector Embeddings** | Gemini Embeddings | `google-genai` SDK (`gemini-embedding-001`) |
| **Vector Database** | ChromaDB | Persistent ChromaDB (`hnsw:space: cosine`) |
| **PDF Extraction** | PyMuPDF | PyMuPDF (`fitz`) |
| **Rate Limiting** | SlowAPI | slowapi 0.1.9+ |
| **Testing** | Pytest & HTTPX | pytest / pytest-asyncio / httpx |
| **Containerization** | Docker & Compose | Multi-stage Dockerfile / Compose v3.8 |

---

## 4. Architecture Diagram

```mermaid
flowchart TD
    Client["Client (Web / Mobile / Postman)"]
    
    subgraph FastAPI["FastAPI Backend (/api/v1)"]
        AuthMiddleware["JWT & Bearer Auth / Rate Limiter"]
        Routers["Routers (Auth, Users, Docs, Chats)"]
        Services["Services (PDF, Chunking, Vector, RAG, Gemini)"]
    end
    
    subgraph Storage["Persistence & AI Services"]
        PG[("PostgreSQL\n(Users, Docs, Chats, Tokens)")]
        Disk[("Local Storage\n(storage/uploads)")]
        Chroma[("ChromaDB\n(storage/chroma)")]
        Gemini["Google Gemini AI\n(Embeddings & Gemini 2.5 Flash)"]
    end
    
    Client --> AuthMiddleware
    AuthMiddleware --> Routers
    Routers --> Services
    Services --> PG
    Services --> Disk
    Services --> Chroma
    Services --> Gemini
```

---

## 5. Folder Structure

```text
aktu-notes-ai-backend/
│
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI entrypoint, lifespan, CORS, exception handlers
│   │
│   ├── core/                       # Core configuration, security, dependencies
│   │   ├── config.py               # Pydantic Settings
│   │   ├── security.py             # Argon2id hashing & JWT handling
│   │   ├── dependencies.py         # DB session, current user, rate limiting
│   │   ├── exceptions.py           # Custom exception hierarchy
│   │   └── logging.py              # Redacted structured logger
│   │
│   ├── db/                         # Database connection & base model
│   │   ├── base.py                 # DeclarativeBase
│   │   └── session.py              # AsyncEngine & async_sessionmaker
│   │
│   ├── models/                     # SQLAlchemy 2.0 models
│   │   ├── user.py
│   │   ├── document.py
│   │   ├── conversation.py
│   │   ├── message.py
│   │   └── refresh_token.py
│   │
│   ├── schemas/                    # Pydantic v2 validation schemas
│   │   ├── auth.py
│   │   ├── user.py
│   │   ├── document.py
│   │   └── chat.py
│   │
│   ├── api/v1/                     # Modular API routers
│   │   ├── router.py               # Aggregator router
│   │   ├── auth.py                 # /auth endpoints
│   │   ├── users.py                # /users endpoints
│   │   ├── documents.py            # /documents endpoints
│   │   └── chats.py                # /chats endpoints
│   │
│   ├── services/                   # Business logic layer
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── document_service.py
│   │   ├── pdf_service.py          # PyMuPDF text extractor
│   │   ├── chunking_service.py     # Sentence boundary chunker with citations
│   │   ├── embedding_service.py    # Gemini vector embeddings with retry
│   │   ├── vector_service.py       # ChromaDB persistent collection
│   │   ├── retrieval_service.py    # Query embed & vector search
│   │   ├── gemini_service.py       # Gemini 2.5 Flash QA
│   │   └── chat_service.py         # Full RAG & message history
│   │
│   ├── repositories/               # Database access layer
│   │   ├── user_repository.py
│   │   ├── document_repository.py
│   │   └── chat_repository.py
│   │
│   ├── tasks/                      # Background asynchronous processing
│   │   └── document_tasks.py       # Document extraction & embedding pipeline
│   │
│   └── utils/                      # Helper utilities
│       └── file_utils.py           # Path sanitization & magic byte checks
│
├── alembic/                        # Database migration scripts
│   ├── env.py
│   └── versions/
│       └── 001_initial_schema.py
│
├── tests/                          # Automated test suite
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_documents.py
│   ├── test_rag.py
│   └── test_security.py
│
├── storage/                        # Persistent volume mounts
│   ├── uploads/                    # Physical PDF storage
│   └── chroma/                     # ChromaDB vector collection
│
├── .env.example
├── .gitignore
├── alembic.ini
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## 6. Prerequisites

- Python 3.12 or higher
- PostgreSQL 15+ (or Docker)
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))
- Git

---

## 7. Installation Instructions (Windows PowerShell)

### Step 1: Clone and Enter Directory
```powershell
cd c:\Users\suraj\Downloads\sankalp_project\aktu-notes-ai-backend
```

### Step 2: Create and Activate Virtual Environment
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 3: Upgrade Pip & Install Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 8. Environment Configuration

Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```

Edit `.env` with your credentials:
```dotenv
APP_NAME="AKTU Notes AI"
APP_ENV=development
DEBUG=true

# PostgreSQL Connection String
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/aktu_notes

# JWT Security
JWT_SECRET_KEY=change_this_to_a_secure_random_string_with_32_characters_minimum
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Gemini AI Settings
GEMINI_API_KEY=AIzaSyYourActualKeyHere
GEMINI_CHAT_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

# Storage Paths
CHROMA_PERSIST_DIR=./storage/chroma
UPLOAD_DIR=./storage/uploads

# PDF & RAG Tuning
MAX_UPLOAD_SIZE_MB=20
MAX_PDF_PAGES=300
CHUNK_SIZE_TOKENS=700
CHUNK_OVERLAP_TOKENS=100
RAG_TOP_K=3

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 9. Database Setup & Migrations

If running local PostgreSQL, ensure the database exists:
```sql
CREATE DATABASE aktu_notes;
```

Run Alembic migrations to build the tables:
```powershell
alembic upgrade head
```

---

## 10. Running the Server

Start the FastAPI development server:
```powershell
uvicorn app.main:app --reload --port 8000
```

Visit the interactive Swagger UI:
- **Swagger Documentation:** `http://localhost:8000/docs`
- **OpenAPI Schema:** `http://localhost:8000/openapi.json`
- **Health Check:** `http://localhost:8000/health`

---

## 11. API Usage Guide

### 1. Register Student
```bash
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Rohan Verma",
    "email": "rohan@aktu.ac.in",
    "password": "StrongPassword123!"
  }'
```

### 2. Login
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rohan@aktu.ac.in",
    "password": "StrongPassword123!"
  }'
```
Response:
```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "uR8X1...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "e838ffae-...",
    "full_name": "Rohan Verma",
    "email": "rohan@aktu.ac.in",
    "is_active": true
  }
}
```

### 3. Upload PDF Notes
```bash
curl -X POST "http://localhost:8000/api/v1/documents" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@DBMS_Quantum_Series_Unit_2.pdf"
```

### 4. Check Document Processing Status
```bash
curl -X GET "http://localhost:8000/api/v1/documents/<DOCUMENT_ID>" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 5. Ask Questions (RAG QA)
```bash
curl -X POST "http://localhost:8000/api/v1/chats/ask" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain 3NF with an example from the notes.",
    "document_ids": ["<DOCUMENT_ID>"],
    "conversation_id": null
  }'
```
Sample Response:
```json
{
  "conversation_id": "c61b2a99-...",
  "message_id": "b1031d2e-...",
  "answer": "Third Normal Form (3NF) requires a relation to be in 2NF with no transitive functional dependencies for non-prime attributes. A transitive dependency occurs when X -> Y and Y -> Z...",
  "citations": [
    {
      "document_id": "e838ffae-...",
      "filename": "DBMS_Quantum_Series_Unit_2.pdf",
      "page_number": 14,
      "chunk_id": "e838ffae-..._chunk_0003"
    }
  ],
  "grounded": true
}
```

---

## 12. Running Tests

The test suite runs using an in-memory SQLite database and isolated ChromaDB storage, so tests do not require an active PostgreSQL connection or live Gemini API keys.

```powershell
pytest -v
```

To run with coverage:
```powershell
pytest --cov=app tests/
```

---

## 13. Deployment: Render + NeonDB + Vercel Frontend

### A. Database: NeonDB (Serverless PostgreSQL)
1. Sign up / log in to [Neon.tech](https://neon.tech).
2. Create a new PostgreSQL project (e.g. `aktu-notes-db`).
3. Under the **Dashboard**, copy your connection string (`Connection details`).
4. Paste it as `DATABASE_URL` in your environment variables.
   - Example: `postgresql+psycopg://neondb_owner:YOUR_PASSWORD@ep-sample-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - *Note: If Neon gives you `postgres://` or `postgresql://` without `+psycopg`, the backend automatically normalizes the prefix to `postgresql+psycopg://`.*

### B. Backend: Render Web Service
1. Create a new **Web Service** on [Render.com](https://render.com) and link your repository.
2. Select **Python** as the runtime.
3. Configure the build and start settings:
   - **Build Command:** `./build.sh` (or `bash build.sh`)
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add the following **Environment Variables** in the Render Dashboard:
   - `APP_ENV`: `production`
   - `DATABASE_URL`: *(Your NeonDB connection string from Step A)*
   - `JWT_SECRET_KEY`: *(Generate a secure random string with 32+ characters)*
   - `GEMINI_API_KEY`: *(Your Google AI Studio API key)*
   - `GEMINI_CHAT_MODEL`: `gemini-2.5-flash`
   - `GEMINI_EMBEDDING_MODEL`: `gemini-embedding-001`
   - `CORS_ORIGINS`: `https://your-app.vercel.app,http://localhost:5173,http://localhost:3000`
   - `CORS_ALLOW_ORIGIN_REGEX`: `^https:\/\/.*\.vercel\.app$`
5. Click **Create Web Service**. Render will automatically run `build.sh` to install dependencies and execute `alembic upgrade head` to set up tables on NeonDB!

### C. Frontend: Vercel Integration & CORS
- The backend comes pre-configured with CORS for:
  - Exact production URLs in `CORS_ORIGINS` (e.g. `https://your-frontend.vercel.app`)
  - All Vercel preview branch deployments automatically matched by `CORS_ALLOW_ORIGIN_REGEX=^https:\/\/.*\.vercel\.app$`
  - Local Vite / React / Next.js development servers (`http://localhost:5173`, `http://localhost:3000`)

---

## 14. Docker Local Deployment

Deploy the entire stack with local PostgreSQL and backend using Docker Compose:

```bash
docker compose up -d --build
```

Check status and logs:
```bash
docker compose ps
docker compose logs -f backend
```

---

## 15. Troubleshooting

1. **`PDFExtractionError: Encrypted or password-protected PDFs are not supported`**
   - Ensure uploaded PDF documents are not password locked.
2. **`PDFExtractionError: The uploaded PDF appears to be scanned`**
   - The document is an image-only scan without an embedded text layer. Run OCR on the PDF before uploading.
3. **`PERMISSION_DENIED` on RAG queries**
   - Check that the `document_ids` specified belong to the authenticated user.
4. **429 Rate Limit Exceeded**
   - Wait 60 seconds before re-attempting authentication or RAG calls.

