import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, type AuthUser } from '../services/api';

export type UserSession = AuthUser;

const SESSION_KEY = 'atelier_student_session';

interface AppState {
  user: UserSession | null;
  isAuthenticated: boolean;
  /** True while the app is verifying a stored token on first load. */
  authLoading: boolean;
  /** Call after a successful api.login / api.signup to hydrate the user into global state. */
  loginWithUser: (user: UserSession) => void;
  /** Log the current user out (clears token + session). */
  logout: () => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  uploadOpen: boolean;
  setUploadOpen: (open: boolean) => void;
  activeSemester: number;
  setActiveSemester: (sem: number) => void;
  refreshKey: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppState | null>(null);

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
  const [activeSemester, setActiveSemester] = useState(5);
  const [refreshKey, setRefreshKey] = useState(0);

  // On mount, verify the persisted token against the server.
  useEffect(() => {
    if (!api.hasToken()) {
      setAuthLoading(false);
      return;
    }

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
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    } catch (e) {
      console.error('Error writing session:', e);
    }
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
      localStorage.removeItem('folio_session');
    } catch {
      // ignore
    }
  }, []);

  const triggerRefresh = () => setRefreshKey((prev) => prev + 1);

  return (
    <AppContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        authLoading,
        loginWithUser,
        logout,
        searchOpen,
        setSearchOpen,
        uploadOpen,
        setUploadOpen,
        activeSemester,
        setActiveSemester,
        refreshKey,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
