import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { api } from '../services/api';
import { savedNotesService } from '../services/savedNotes';
import { AppContext, type AppState, type UserSession } from './appState';

const SESSION_KEY = 'atelier_student_session';


export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => {
    // Eagerly restore a cached user for fast paint while we verify the token.
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  });

  const [authLoading, setAuthLoading] = useState(() => api.hasToken());

  const [searchOpen, setSearchOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeSemester, setActiveSemester] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) return JSON.parse(raw)?.semester || 1;
    } catch {
      // ignore
    }
    return 1;
  });
  const [refreshKey, setRefreshKey] = useState(0);

  // On mount, verify the persisted token against the server.
  useEffect(() => {
    // authLoading starts false when there is no stored token
    if (!api.hasToken()) return;

    api.getCurrentUser()
      .then((serverUser) => {
        if (serverUser) {
          setUser(serverUser);
          try {
            localStorage.setItem(SESSION_KEY, JSON.stringify(serverUser));
          } catch { /* ignore */ }
        } else {
          // Token was invalid / expired — clear local state.
          setUser(null);
          try {
            localStorage.removeItem(SESSION_KEY);
          } catch { /* ignore */ }
        }
      })
      .catch(() => {
        // Network error while checking — keep cached user so the page isn't blank.
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const loginWithUser = useCallback((userData: UserSession) => {
    setUser(userData);
    setActiveSemester(userData.semester || 1);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    } catch (e) {
      console.error('Error writing session:', e);
    }
    // Reset local saved notes cache so previous account notes never leak to new accounts
    savedNotesService.clear();
    savedNotesService.syncFromServer().catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // best-effort
    }
    setUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // ignore
    }
    savedNotesService.clear();
  }, []);

  const triggerRefresh = useCallback(() => setRefreshKey((prev) => prev + 1), []);

  const switchSemester = useCallback(async (newSem: number) => {
    setActiveSemester(newSem);
    if (user) {
      const updated = { ...user, semester: newSem };
      setUser(updated);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      try {
        await api.updateProfile({ semester: newSem });
      } catch (e) {
        console.error('Failed to sync semester to server:', e);
      }
    }
    triggerRefresh();
  }, [user, triggerRefresh]);

  const updateAcademicProfile = useCallback(async (fields: Partial<UserSession>) => {
    if (user) {
      const updated = { ...user, ...fields };
      setUser(updated);
      if (fields.semester !== undefined) {
        setActiveSemester(fields.semester);
      }
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      } catch { /* ignore */ }
      try {
        const res = await api.updateProfile(fields as any);
        if (res.user) {
          setUser(res.user);
          localStorage.setItem(SESSION_KEY, JSON.stringify(res.user));
        }
      } catch (e) {
        console.error('Failed to update academic profile on server:', e);
        throw e;
      }
    }
    triggerRefresh();
  }, [user, triggerRefresh]);

  const value = useMemo<AppState>(() => ({
    user,
    isAuthenticated: !!user,
    authLoading,
    loginWithUser,
    logout,
    searchOpen,
    setSearchOpen,
    uploadOpen,
    setUploadOpen,
    mobileNavOpen,
    setMobileNavOpen,
    activeSemester,
    setActiveSemester,
    switchSemester,
    updateAcademicProfile,
    refreshKey,
    triggerRefresh,
  }), [user, authLoading, loginWithUser, logout, searchOpen, uploadOpen, mobileNavOpen, activeSemester, switchSemester, updateAcademicProfile, refreshKey, triggerRefresh]);

  return (
    <AppContext.Provider
      value={value}
    >
      {children}
    </AppContext.Provider>
  );
}
