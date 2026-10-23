import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import SearchPalette from './components/SearchPalette';
import UploadModal from './components/UploadModal';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MySubjects from './pages/MySubjects';
import SubjectOverview from './pages/SubjectOverview';
import NotesLibrary from './pages/NotesLibrary';
import NoteDetail from './pages/NoteDetail';
import MyLibrary from './pages/MyLibrary';
import PYQArchive from './pages/PYQArchive';
import PYQDetail from './pages/PYQDetail';
import SyllabusCoverage from './pages/SyllabusCoverage';
import Contributions from './pages/Contributions';
import ModerationQueue from './pages/ModerationQueue';
import AdminModeration from './pages/AdminModeration';
import SettingsPage from './pages/Settings';
import Onboarding from './pages/Onboarding';
import StudyAssistant from './pages/StudyAssistant';

import { useApp } from './context/AppContext';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, authLoading } = useApp();

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--color-base, #F9F8F6)',
        color: 'var(--color-deep, #1F2421)',
        fontFamily: 'var(--font-body, Inter, sans-serif)',
        gap: '14px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2.5px solid rgba(217, 93, 57, 0.2)',
          borderTopColor: 'var(--color-primary, #D95D39)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '13px', letterSpacing: '0.02em', color: 'var(--color-muted, #706B63)' }}>
          Restoring academic studio session…
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/?auth=signin" replace />;
  }
  if (user && !user.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function RequireAuthForOnboarding({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useApp();

  if (authLoading) return null;
  if (!isAuthenticated) {
    return <Navigate to="/?auth=signin" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, authLoading } = useApp();

  if (authLoading) return null;
  if (!isAuthenticated) return <Navigate to="/?auth=signin" replace />;

  const isAuthorized = user && (user.role?.toLowerCase() === 'moderator' || user.role?.toLowerCase() === 'admin');
  if (!isAuthorized) {
    return <Navigate to="/moderation" replace />;
  }

  return <>{children}</>;
}

function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <SearchPalette />
      <UploadModal />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Scroll-Animated Landing Page Showcase */}
          <Route path="/" element={<LandingPage />} />

          {/* Academic Stream & Subject Onboarding */}
          <Route
            path="/onboarding"
            element={
              <RequireAuthForOnboarding>
                <Onboarding />
              </RequireAuthForOnboarding>
            }
          />

          {/* Protected Interconnected Study Space Workspace */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="assistant" element={<StudyAssistant />} />
            <Route path="workspace" element={<Navigate to="/dashboard" replace />} />
            <Route path="subjects" element={<MySubjects />} />
            <Route path="subjects/:subjectId" element={<SubjectOverview />} />
            <Route path="notes" element={<NotesLibrary />} />
            <Route path="notes/:noteId" element={<NoteDetail />} />
            <Route path="library" element={<MyLibrary />} />
            <Route path="saved-notes" element={<Navigate to="/library" replace />} />
            <Route path="pyq" element={<PYQArchive />} />
            <Route path="pyq/:pyqId" element={<PYQDetail />} />
            <Route path="syllabus" element={<SyllabusCoverage />} />
            <Route path="uploads" element={<Contributions />} />
            <Route path="contributions" element={<Contributions />} />
            <Route path="moderation" element={<ModerationQueue />} />
            <Route path="my-reports" element={<ModerationQueue />} />
            <Route
              path="admin/moderation"
              element={
                <RequireAdmin>
                  <AdminModeration />
                </RequireAdmin>
              }
            />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
