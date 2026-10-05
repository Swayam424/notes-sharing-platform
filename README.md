# Atelier — Academic Notes Sharing Platform 📚✨

> A modern, syllabus-aware academic notes sharing platform. Discover, study, and organize lecture notes, past exam questions (PYQs), and study resources unified across college courses and departments.

---

## 🌟 Key Highlights & Features

### 1. 🎓 Study-First Note Viewing Experience
- **Hero Document Reader:** Distraction-free, centered reading canvas with generous margins and comfortable typography.
- **Eye-Care Reading Surface Tones:** Instant toggle between **Paper** (clean Alabaster), **Eye-Care Sepia** (warm amber tone for late-night study sessions), and **Dark** (high-contrast dark mode).
- **Comprehensive Document Controls:** Previous/Next page turners, direct page jump input (`Page [X] of Y`), zoom in/out with presets (`Fit Width`, `100% Reset`), 90° rotation, and reading progress indicator.
- **Collapsible Thumbnails Drawer:** Scan multi-page documents rapidly via interactive page cards.
- **Distraction-Free Focus Mode:** Fullscreen immersive view (`F` key) hiding headers and sidebars with floating controls and quick exit (`Esc`).
- **Essential Academic Context:** Prominent note title, syllabus topic badge, subject code/name, unit, semester, department, contributor attribution, format, page count, and file size.
- **Core Actions:** Bookmark / Save (synced with `localStorage`), Direct PDF download, and Resource Reporting dialog linked to moderation.

### 2. 🔍 Topic-First Notes Discovery (`/notes`)
- **Fast Search & Filter:** Instant multi-attribute filtering by department, semester, subject, unit, and format.
- **State-Preserving Navigation:** Opening a note preserves search queries and filter parameters so students can seamlessly return to their exact filtered results.
- **Curated High-Yield Topics:** 1-click discovery for popular examination topics.
- **Saved Collection:** Filter to view bookmarked resources with instant toast feedback.

### 3. 🔐 User Authentication & Session Security
- **Full Auth Lifecycle:** User registration (`POST /api/auth/signup`), credential verification (`POST /api/auth/login`), profile retrieval (`GET /api/auth/me`), and logout (`POST /api/auth/logout`).
- **Security:** Salted password hashing with Node.js `scryptSync` and constant-time comparison (`timingSafeEqual`).
- **Pre-Seeded Accounts:**
  - **Student:** `student@atelier.edu` / `password123`
  - **Moderator:** `moderator@atelier.edu` / `password123`
- **Protected Routing:** `RequireAuth` guard in `react-router` with graceful `authLoading` state during session restoration.

### 4. 🧭 Syllabus Coverage & Study Space
- **Interactive Syllabus Explorer:** Track covered, partial, and missing topics across university courses.
- **Moderation Queue:** Community-driven resource reporting and audit workflow.
- **Student Profile & Settings:** Manage user details, appearance, and active session sign-out.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, React Router 7, Lucide Icons, Vanilla CSS Design System.
- **Backend:** Node.js, Express 5, `node:sqlite` (SQLite DatabaseSync), Multer (file uploads), Node `crypto`.
- **Typography:** Newsreader (editorial serif), Inter (UI sans), JetBrains Mono (metadata).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ recommended, SQLite built-in)
- npm

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Swayam424/notes-sharing-platform.git
   cd notes-sharing-platform
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Express API Backend:**
   ```bash
   npm run server
   ```
   *Runs on `http://localhost:3001` and initializes SQLite database with sample records and demo users.*

4. **Start the Vite Frontend Development Server:**
   ```bash
   npm run dev
   ```
   *Opens the web app on `http://localhost:5173` with automatic API proxying.*

5. **Build for Production:**
   ```bash
   npm run build
   ```

---

## 👥 Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Student** | `student@atelier.edu` | `password123` |
| **Moderator** | `moderator@atelier.edu` | `password123` |

*(You can also register any new student account directly from the Landing Page.)*

---

## 📄 License
MIT License. Crafted with academic care for students.
