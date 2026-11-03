import { createContext, useContext } from 'react';
import type { AuthUser } from '../services/api';

export type UserSession = AuthUser;

export interface AppState {
  user: UserSession | null;
  isAuthenticated: boolean;
  /** True while the app is verifying a stored token on first load. */
  authLoading: boolean;
  /** Call after a successful api.login / api.signup to hydrate the user into global state. */
  loginWithUser: (user: UserSession) => void;
  /** Log the current user out (clears token + session). */
  logout: () => Promise<void>;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  uploadOpen: boolean;
  setUploadOpen: (open: boolean) => void;
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
  activeSemester: number;
  setActiveSemester: (sem: number) => void;
  switchSemester: (sem: number) => Promise<void>;
  updateAcademicProfile: (fields: Partial<UserSession>) => Promise<void>;
  refreshKey: number;
  triggerRefresh: () => void;
}

export const AppContext = createContext<AppState | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
