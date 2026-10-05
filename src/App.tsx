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
import PYQArchive from './pages/PYQArchive';
import SyllabusCoverage from './pages/SyllabusCoverage';
import Contributions from './pages/Contributions';
import ModerationQueue from './pages/ModerationQueue';
import SettingsPage from './pages/Settings';

import { useApp } from './context/AppContext';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useApp();

  if (authLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#0e1117',
        color: '#94a3b8',
        fontFamily: 'Inter, system-ui, sans-serif',
        gap: '14px'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          borderTopColor: '#c84b28',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: '13px', letterSpacing: '0.02em' }}>Restoring workspace session…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/?auth=signin" replace />;
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

          {/* Protected Interconnected Study Space Workspace */}
          <Route
            element={
              <RequireAuth>
                <AppShell />
              </RequireAuth>
            }
          >
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workspace" element={<Navigate to="/dashboard" replace />} />
            <Route path="subjects" element={<MySubjects />} />
            <Route path="subjects/:subjectId" element={<SubjectOverview />} />
            <Route path="notes" element={<NotesLibrary />} />
            <Route path="notes/:noteId" element={<NoteDetail />} />
            <Route path="pyq" element={<PYQArchive />} />
            <Route path="syllabus" element={<SyllabusCoverage />} />
            <Route path="contributions" element={<Contributions />} />
            <Route path="moderation" element={<ModerationQueue />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
