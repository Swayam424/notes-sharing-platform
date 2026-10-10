# Atelier — Academic Notes Sharing Platform
## Project Progress & Task Tracker

This document tracks all completed features, active work, and planned next steps. It is updated after each milestone.

---

## Completed Tasks

### 1. Platform Foundation & Design System
- Built full-stack architecture with React 19, TypeScript, and Vite on the frontend; Node.js, Express, and SQLite on the backend.
- Implemented Atelier aesthetic: warm Alabaster bone backgrounds, crisp paper cards, terracotta primary accents, and sage evergreen highlights.
- Created reusable App Shell with sidebar navigation, top header bar, global search command palette (`⌘K`), and universal upload modal.

### 2. User Authentication & Session Persistence
- Multi-role authentication supporting Students, Peer Contributors, and Moderators/Admins.
- Secure registration and sign-in with password hashing (PBKDF2/SHA-256) and token-based sessions.
- Automatic session hydration on page refresh with persistent local storage sync.

### 3. Scroll-Animated Landing Page
- Created interactive landing page with smooth scroll-driven stop-motion desk animation.
- Showcases live stats, curriculum features, community notes, and instant sign-in/sign-up triggers.

### 4. Personalized 2-Step Student Onboarding
- **Step 1 (Academic Profile):** Students select Degree Program (adaptive semester counts: B.Tech 8 sems, BCA 6 sems, MCA 4 sems, Dual 10 sems), Branch/Stream, Semester, and College.
- **Step 2 (Course Roster):** Dynamically loads courses matching the selected stream and semester with Select All / Deselect All controls.
- Fast launch action ("Launch My Study Space") directly sets up the profile and redirects to the study dashboard.
- Removed third page (study target / CGPA) to keep onboarding clean, fast, and frictionless.
- Added smooth horizontal paper-slide transitions and tactile card micro-animations.

### 5. Study Space Dashboard
- **Course Workspaces:** Focus strip showing only the student's enrolled courses for their active semester.
- **Frequent Exam Topics:** Highlights high-yield concepts that frequently appear in exams (e.g. 5-year appearance streaks).
- **Recent Uploads:** Quick list of newly shared peer notes with 1-click open actions.
- **Contributor Standings:** Leaderboard showcasing top students and scribes with rank badges and reputation points.

### 6. Notes Discovery & Document Reader
- Filter notes by branch, semester, subject, unit, and resource type (Handwritten PDFs, Slides, Cheatsheets, Lab Manuals).
- Instant multi-field search across titles, topics, authors, and keywords.
- Dedicated Note Detail page with full document reading view, topic chips, and download tracking.
- Peer engagement: upvotes on helpful notes, discussion comments, and errata flag categories.

### 7. My Library & Bookmarks
- Personal bookmarking service allowing students to save any note or PYQ with one click.
- Filter saved collection by resource type with local and remote synchronization.

### 8. Past Year Questions (PYQ) Exam Archive
- Archive of semester examination papers filterable by subject, year, and exam session.
- Question-by-question breakdown showing marks allocation, unit mapping, and related topic links.

### 9. Syllabus Coverage Tracker
- Visual syllabus coverage percentage meter per course.
- Unit-by-unit topic checklist displaying covered, partially covered, and missing notes.
- Direct links from syllabus topics to verified notes and exam questions.

### 10. Resource Contribution & Moderation
- Upload modal with auto-indexing to syllabus units, topics, and resource formats.
- Personal contributions dashboard showing upload history, downloads earned, and reputation.
- Community moderation system: students can report inaccurate notes, and moderators can review, dismiss, or quarantine content.

### 11. Deep Stream & Semester Curriculum Engine
- Multi-stream academic curriculum catalog covering CSE, IT, AI & Data Science, ECE, Mechanical, EE, BCA, and MCA.
- TopBar quick Semester Switcher pill (`[CSE • Sem 5 ▾]`) allowing 1-click semester changes anywhere across the platform.
- Interactive Academic Profile & Roster Editor in Settings with live course checklist, instant save, and degree customization.
### 12. 100% Dynamic Multi-Branch & Course Dashboard Adaptation
- Replaced all hardcoded CSE topics (`Deadlock`, `Normalization`, `TCP`) with dynamic topics derived directly from the student's branch and active enrolled courses (`displaySubjects`).
- **Dynamic Popular Topic Chips:** Automatically extracts high-yield topics from the student's enrolled syllabus (e.g. ECE: AM/FM Modulation, 8086 Architecture, CMOS Curves; Mech: Bernoulli Equation, Failure Theories; AI/DS: Self-Attention, K-Means).
- **Branch-Aware Search Placeholder:** Dynamically prompts with the student's actual curriculum topics and provides branch-relevant "no notes match" suggestions.
- **Dynamic Exam Radar:** Calculates top PYQ frequency topics directly from the student's courses with year streaks.
- **Dynamic Midterm Topic Gap Card:** Automatically pinpoints the lowest-coverage course and unit in the student's roster with 1-click note discovery.
- **Adaptive Hall of Scribes:** Department toggle adapts from "All Depts" to the student's specific branch (e.g. "Electronics & Communication", "Mechanical", "AI & Data Science").
- **Multi-Branch Catalog Expansion:** Enriched backend database with courses and starter verified notes for ECE, Mechanical, Electrical, AI/DS, BCA, and MCA.

### 13. Collaborative Notes Sharing Core Refocus
- **1-Click Peer Share Dialog:** Added a dedicated "Share" action in the Note Detail header with direct copyable study links, formatted class WhatsApp/batch Telegram blurbs, and instant clipboard toast confirmation.
- **Student Scribe / Author Profile Sheet:** Clickable author badges on notes opening a dedicated student profile drawer displaying the author's bio, verification badge, total notes shared, student reads/downloads, upvotes, and full portfolio of shared notebooks with 1-click reading.
- **High-Definition Handwriting Magnification:** Extended reader zoom up to 300% and added a `150% Ink` quick preset button for crystal-clear legibility of student handwritten notes, mathematical derivations, and schematic diagrams.
- **Post-Upload Share CTA:** Enhanced the Note Upload success view with an instant "Share Note Link with Classmates" action.
- **Identity & Tone Realignment:** Softened exam-cramming jargon across the Dashboard:
  - *"Upcoming Midterm Topic Gap"* $\rightarrow$ *"Syllabus Notes Coverage Gap"*
  - *"Exam Radar"* $\rightarrow$ *"Trending Study Topics (Most Read by Peers)"*
  - *"Syllabus Gap Recommendation"* $\rightarrow$ *"Community Notes Spotlight"*
  - Note discussion categories realigned from test tips to collaborative note study (`Study Tip`, `Errata / Clarification`, `Question`, `Key Takeaway`).

### 14. Production Readiness Hardening & Comprehensive Security Audit
- **Security HTTP Headers (OWASP Hardening):** Injected `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`, `Cross-Origin-Opener-Policy: same-origin`, and stripped `X-Powered-By`.
- **CORS Lockdown:** Replaced wildcard access with dynamic origin whitelisting (`CLIENT_ORIGINS`) with credential support.
- **Payload & Memory DoS Defense:** Added 2MB body parser limits (`express.json({ limit: '2mb' })`) and 50MB upload boundaries to prevent memory-exhaustion attacks.
- **Multi-Tier Rate Limiting:** Implemented sliding-window rate limiters across key attack vectors:
  - Global API rate limiter (1000 req/15min).
  - Auth brute-force protection on `/api/auth/login`, `/signup`, `/register` (25 attempts/15min with HTTP 429 and `Retry-After`).
  - File upload throttling on notes & PYQs (40 uploads/hr).
- **Strict File Upload Validation:** Enforced explicit MIME types (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `docx`) and extension whitelisting in Multer `fileFilter`, rejecting executables and script payloads.
- **Path Traversal Protection:** Enforced `getSafeUploadPath` with `path.basename` and resolved boundary verification on all file downloads and deletions.
- **Database Performance & WAL Concurrency:**
  - Configured SQLite `PRAGMA journal_mode = WAL;` and `PRAGMA synchronous = NORMAL;` for high-throughput concurrent reads and writes.
  - Created 15 database indexes on foreign keys, tokens, timestamps, and search columns (`idx_notes_subject`, `idx_notes_upload_date`, `idx_sessions_token`, `idx_users_email`, etc.).
- **Operational Health Monitoring (`/api/health`):** Built structured healthcheck probe reporting database live ping, server uptime, heap/RSS memory usage, and environment status.
- **Centralized Error Handling & Graceful Shutdown:** Centralized error-handling middleware preventing stack trace leakage, paired with `SIGTERM`/`SIGINT` traps for clean SQLite handle termination.
- **Environment & Secrets Template:** Generated `.env.example` production configuration template and protected secrets in `.gitignore`.

---

## Planned Next Steps (Candidate Options)

| Option | Focus Area | Description |
| :--- | :--- | :--- |
| **Option A** | **Interactive Document Annotations** | Allow students to highlight text in terracotta/amber/sage, attach sticky margin notes, and toggle distraction-free sepia/dark reading modes. |
| **Option B** | **Student Author Profiles & Batch Collections** | Create dedicated `/authors/:name` profile pages with custom student study lists and bundle sharing ("Unit 1-5 Complete Pack"). |
| **Option C** | **Peer Study Rooms & Class Notes Discussion** | Dedicated course channels where students in the same class batch can post note requests and share private notes. |
| **Option D** | **Smart Note Search & Handwriting OCR Indexing** | Deep search that searches text inside handwritten note scans, formulas, and topic diagrams. |

---

*Last Updated: 2026-10-11*


