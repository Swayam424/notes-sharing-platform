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
- Cleaned up obsolete study target references across Settings and Profile.

---

## Planned Next Steps (Candidate Options)

| Option | Focus Area | Description |
| :--- | :--- | :--- |
| **Option A** | **AI Study Copilot & Flashcards** | Add an AI study drawer inside the Note Detail reader to generate 1-click TL;DR summaries, key exam takeaways, and 5-question revision flashcards. |
| **Option B** | **Interactive Document Annotations** | Allow students to highlight text in terracotta/amber/sage, attach sticky margin notes, and toggle distraction-free sepia/dark reading modes. |
| **Option C** | **PYQ Solved Solutions & Answer Keys** | Add community crowdsourced step-by-step solutions for exam questions with verified badges and peer voting. |
| **Option D** | **Peer Study Rooms & Batch Discussion** | Allow students enrolled in the same course/semester to start collaborative study threads and share private batch notes. |

---

*Last Updated: 2026-10-11*
