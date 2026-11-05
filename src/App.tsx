import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import MobileBottomNav from './components/MobileBottomNav';
import SearchPalette from './components/SearchPalette';
import UploadModal from './components/UploadModal';
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NotesLibrary = lazy(() => import('./pages/NotesLibrary'));
const NoteDetail = lazy(() => import('./pages/NoteDetail'));
const MyLibrary = lazy(() => import('./pages/MyLibrary'));
const PYQArchive = lazy(() => import('./pages/PYQArchive'));
const PYQDetail = lazy(() => import('./pages/PYQDetail'));
const Contributions = lazy(() => import('./pages/Contributions'));
const ModerationQueue = lazy(() => import('./pages/ModerationQueue'));
const AdminModeration = lazy(() => import('./pages/AdminModeration'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const StudyAssistant = lazy(() => import('./pages/StudyAssistant'));

import { useApp } from './context/appState';

function PageLoader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="page-loader__bar" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, authLoading } = useApp();

  if (authLoading) return <PageLoader label="Restoring your session" />;

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
    return <Navigate to="/dashboard" replace />;
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
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
        <MobileBottomNav />
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
        <Suspense fallback={<PageLoader />}>
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
            <Route path="subjects" element={<Navigate to="/notes" replace />} />
            <Route path="subjects/:subjectId" element={<Navigate to="/notes" replace />} />
            <Route path="notes" element={<NotesLibrary />} />
            <Route path="notes/:noteId" element={<NoteDetail />} />
            <Route path="library" element={<MyLibrary />} />
            <Route path="saved-notes" element={<Navigate to="/library" replace />} />
            <Route path="pyq" element={<PYQArchive />} />
            <Route path="pyq/:pyqId" element={<PYQDetail />} />
            <Route path="syllabus" element={<Navigate to="/dashboard" replace />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </AppProvider>
    </BrowserRouter>
  );
}
