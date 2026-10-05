import {
  subjects as mockSubjects,
  notes as mockNotes,
  type Subject,
  type NoteResource,
  type PYQEntry,
  type ModerationItem
} from '../data/mockData';

// ---------- Token Management ----------
const TOKEN_KEY = 'atelier_auth_token';

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    console.error('Failed to persist auth token:', e);
  }
}

function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

/** Wrapper around fetch that automatically attaches the Bearer token. */
async function authFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(url, { ...init, headers });
}

// ---------- Types ----------
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: string;
  college: string;
  department: string;
  semester: number;
  created_at?: string;
}

export interface DashboardData {
  frequentExamTopics: {
    topicName: string;
    subjectName: string;
    appearances: number;
    streak: string;
  }[];
  recentUploads: {
    id?: string;
    title: string;
    author: string;
    subject: string;
    unit: string;
    format?: string;
    timeAgo: string;
  }[];
  stats: {
    totalNotes: number;
    totalSubjects: number;
  };
}

export const api = {
  // -------------------- Auth --------------------
  async login(email: string, password: string): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Login failed');
    setToken(data.token);
    return { token: data.token, user: data.user };
  },

  async signup(fields: {
    name: string;
    email: string;
    password: string;
    college?: string;
    department?: string;
    semester?: number;
  }): Promise<{ token: string; user: AuthUser }> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Signup failed');
    setToken(data.token);
    return { token: data.token, user: data.user };
  },

  async register(fields: {
    name: string;
    email: string;
    password: string;
    college?: string;
    department?: string;
    semester?: number;
  }): Promise<{ token: string; user: AuthUser }> {
    return this.signup(fields);
  },

  async logout(): Promise<void> {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Swallow network errors — we'll clear the token locally regardless
    }
    clearToken();
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await authFetch('/api/auth/me');
      if (!res.ok) {
        clearToken();
        return null;
      }
      const data = await res.json();
      if (!data.success) {
        clearToken();
        return null;
      }
      return data.user;
    } catch {
      return null;
    }
  },

  hasToken(): boolean {
    return !!getToken();
  },

  // -------------------- Subjects --------------------
  async getSubjects(): Promise<Subject[]> {
    try {
      const res = await authFetch('/api/subjects');
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch subjects');
      return data.subjects;
    } catch {
      return mockSubjects;
    }
  },

  async getSubject(id: string): Promise<Subject> {
    try {
      const res = await authFetch(`/api/subjects/${id}`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch subject');
      return data.subject;
    } catch {
      const found = mockSubjects.find(s => s.id === id);
      if (!found) throw new Error('Subject not found');
      return found;
    }
  },

  // -------------------- Notes --------------------
  async getNotes(filters?: { subjectId?: string; unitId?: string; format?: string; search?: string }): Promise<NoteResource[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.subjectId && filters.subjectId !== 'all') params.append('subjectId', filters.subjectId);
      if (filters?.unitId && filters.unitId !== 'all') params.append('unitId', filters.unitId);
      if (filters?.format && filters.format !== 'all') params.append('format', filters.format);
      if (filters?.search) params.append('search', filters.search);

      const res = await authFetch(`/api/notes?${params.toString()}`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch notes');
      return data.notes;
    } catch {
      return mockNotes.filter(n => {
        if (filters?.subjectId && filters.subjectId !== 'all' && n.subjectId !== filters.subjectId) return false;
        if (filters?.unitId && filters.unitId !== 'all' && n.unitId !== filters.unitId) return false;
        if (filters?.format && filters.format !== 'all' && n.format.toLowerCase() !== filters.format.toLowerCase()) return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          const matches =
            n.title.toLowerCase().includes(q) ||
            (n.primaryTopic && n.primaryTopic.toLowerCase().includes(q)) ||
            (n.description && n.description.toLowerCase().includes(q));
          if (!matches) return false;
        }
        return true;
      });
    }
  },

  async getNote(id: string): Promise<NoteResource> {
    try {
      const res = await authFetch(`/api/notes/${id}`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch note');
      return data.note;
    } catch {
      const found = mockNotes.find(n => n.id === id);
      if (!found) throw new Error('Note not found');
      return found;
    }
  },

  async uploadNote(formData: FormData): Promise<{ noteId: string; message: string }> {
    const res = await authFetch('/api/notes', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to upload note');
    return data;
  },

  getDownloadUrl(noteId: string): string {
    return `/api/notes/${noteId}/download`;
  },

  // -------------------- PYQs --------------------
  async getPYQs(subjectId?: string): Promise<PYQEntry[]> {
    const url = subjectId && subjectId !== 'all' ? `/api/pyqs?subjectId=${subjectId}` : '/api/pyqs';
    const res = await authFetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch PYQs');
    return data.pyqs;
  },

  // -------------------- Moderation --------------------
  async getModerationItems(): Promise<ModerationItem[]> {
    const res = await authFetch('/api/moderation');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch moderation queue');
    return data.items;
  },

  async updateModeration(id: string, status: 'dismissed' | 'quarantined'): Promise<void> {
    const res = await authFetch(`/api/moderation/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update moderation item');
  },

  async reportResource(report: { resourceName: string; reporter?: string; reason: string }): Promise<void> {
    const res = await authFetch('/api/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to report resource');
  },

  // -------------------- Dashboard --------------------
  async getDashboardData(): Promise<DashboardData> {
    const res = await authFetch('/api/stats/dashboard');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch dashboard stats');
    return data;
  },

  // -------------------- User Profile --------------------
  async getUserProfile(): Promise<AuthUser | null> {
    try {
      const res = await authFetch('/api/user/profile');
      if (!res.ok) {
        return this.getCurrentUser();
      }
      const data = await res.json();
      if (!data.success) {
        return this.getCurrentUser();
      }
      return data.user;
    } catch {
      return this.getCurrentUser();
    }
  }
};
