# AKTU Notes AI — Frontend (Next.js + TypeScript + Tailwind CSS)

High-performance, modern, responsive Next.js frontend engineered for AKTU university students to chat with lecture notes, Quantum series, and syllabus PDFs with verified page-number citations.

Connected directly to the live Render backend: **`https://mini-project-jxgk.onrender.com`**.

---

## 1. Key Features

- **Authentication & Security:**
  - Student Registration & Login with real-time password strength validation (Argon2id compliant).
  - JWT Access token storage with automatic 401 refresh token rotation via HttpOnly/Bearer.
  - Profile menu with Change Password modal and secure sign-out.
- **Academic Notes & PDF Management:**
  - Drag-and-drop PDF file uploader supporting lecture notes, Quantum series, and lab manuals (up to 25MB).
  - Real-time status badges (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) with automatic polling.
  - Multi-select checkboxes to customize which PDFs are queried in RAG context.
  - Direct download and cascading delete with confirmation.
- **Interactive RAG Chat & Citations:**
  - Multi-turn conversation sessions saved to PostgreSQL.
  - Assistant answers rendered with full Markdown formatting, code highlighting, and lists.
  - **Verified Citations**: Exact PDF filename and original page number badges (e.g., `📄 DBMS_Notes.pdf — Page 14`).
  - Pre-built suggestion prompt chips tailored for AKTU university exams.
- **Design & UX:**
  - Dark academic theme with Tailwind CSS.
  - Toast notification alerts for actions and errors.
  - Fully responsive for mobile and desktop screens.

---

## 2. Getting Started

### Prerequisites
- Node.js 18+ (tested with Node.js 24)
- npm

### Development Server
```bash
# Navigate to the frontend directory
cd aktu-notes-ai-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Environment Variables

Create `.env.local` inside `aktu-notes-ai-frontend/`:

```env
# Live Render backend URL:
NEXT_PUBLIC_API_URL=https://mini-project-jxgk.onrender.com

# Or local FastAPI backend (if running backend locally):
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 4. Deploying to Vercel

1. Push your repository to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"**.
3. Import your repository:
   - **Root Directory:** Select `aktu-notes-ai-frontend`.
   - **Framework Preset:** Next.js.
   - **Build Command:** `npm run build`
4. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://mini-project-jxgk.onrender.com`
5. Click **Deploy**!
