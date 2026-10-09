import {
  subjects as mockSubjects,
  notes as mockNotes,
  pyqEntries as mockPyqEntries,
  type Subject,
  type NoteResource,
  type PYQEntry,
  type ModerationItem,
  type NoteComment,
  type LeaderboardContributor
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

  async uploadNote(formData: FormData): Promise<{ success: boolean; noteId: string; message: string; note: NoteResource }> {
    const res = await authFetch('/api/notes', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to upload note');
    return data;
  },

  async updateNote(noteId: string, updates: Partial<NoteResource>): Promise<{ success: boolean; note: NoteResource; message: string }> {
    const res = await authFetch(`/api/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update note');
    return data;
  },

  async deleteNote(noteId: string): Promise<{ success: boolean; message: string }> {
    const res = await authFetch(`/api/notes/${noteId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to delete note');
    return data;
  },

  // -------------------- Note Upvotes --------------------
  async getNoteUpvoteStatus(noteId: string): Promise<{ upvoted: boolean; upvoteCount: number }> {
    try {
      const res = await authFetch(`/api/notes/${noteId}/upvote-status`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      return { upvoted: !!data.upvoted, upvoteCount: data.upvotes || 0 };
    } catch {
      return { upvoted: false, upvoteCount: 14 };
    }
  },

  async toggleNoteUpvote(noteId: string): Promise<{ upvoted: boolean; upvoteCount: number }> {
    try {
      const res = await authFetch(`/api/notes/${noteId}/upvote`, { method: 'POST' });
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      return { upvoted: !!data.upvoted, upvoteCount: data.upvotes };
    } catch {
      return { upvoted: true, upvoteCount: 15 };
    }
  },

  // -------------------- Note Comments & Discussion --------------------
  async getNoteComments(noteId: string): Promise<NoteComment[]> {
    try {
      const res = await authFetch(`/api/notes/${noteId}/comments`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      return data.comments || [];
    } catch {
      return [];
    }
  },

  async addNoteComment(noteId: string, content: string, category: string = 'General'): Promise<NoteComment> {
    const res = await authFetch(`/api/notes/${noteId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, category }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to post comment');
    return data.comment;
  },

  async toggleCommentUpvote(commentId: string): Promise<{ upvoted: boolean; upvotes: number }> {
    const res = await authFetch(`/api/comments/${commentId}/upvote`, { method: 'POST' });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to toggle comment upvote');
    return { upvoted: !!data.upvoted, upvotes: data.upvotes };
  },

  async deleteNoteComment(commentId: string): Promise<boolean> {
    const res = await authFetch(`/api/comments/${commentId}`, { method: 'DELETE' });
    const data = await res.json();
    return !!data.success;
  },

  // -------------------- Contributor Leaderboard --------------------
  async getContributorLeaderboard(department?: string): Promise<LeaderboardContributor[]> {
    try {
      const query = department && department !== 'all' ? `?department=${encodeURIComponent(department)}` : '';
      const res = await authFetch(`/api/contributors/leaderboard${query}`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      return data.leaderboard || [];
    } catch {
      return [
        {
          rank: 1,
          userId: 'user-am',
          name: 'Arjun Mehta',
          initials: 'AM',
          role: 'Student',
          college: 'Apex Institute of Technology',
          department: 'Computer Science',
          totalUploads: 6,
          totalDownloads: 489,
          totalUpvotes: 142,
          reputationScore: 2450,
          badge: 'Grand Scribe',
          tier: 'Diamond'
        },
        {
          rank: 2,
          userId: 'user-kn',
          name: 'Kavya Nair',
          initials: 'KN',
          role: 'Student',
          college: 'Apex Institute of Technology',
          department: 'Computer Science',
          totalUploads: 5,
          totalDownloads: 412,
          totalUpvotes: 118,
          reputationScore: 2050,
          badge: 'Syllabus Champion',
          tier: 'Platinum'
        },
        {
          rank: 3,
          userId: 'user-ps',
          name: 'Priya Sharma',
          initials: 'PS',
          role: 'Moderator',
          college: 'Apex Institute of Technology',
          department: 'Computer Science',
          totalUploads: 4,
          totalDownloads: 350,
          totalUpvotes: 95,
          reputationScore: 1675,
          badge: 'Distinguished Scholar',
          tier: 'Gold'
        },
        {
          rank: 4,
          userId: 'user-si',
          name: 'Sneha Iyer',
          initials: 'SI',
          role: 'Student',
          college: 'Apex Institute of Technology',
          department: 'Computer Science',
          totalUploads: 3,
          totalDownloads: 240,
          totalUpvotes: 72,
          reputationScore: 1230,
          badge: "Dean's Honor Roll",
          tier: 'Silver'
        }
      ];
    }
  },

  // -------------------- Saved Notes / Library --------------------
  async getSavedNotes(): Promise<{ success: boolean; savedNotes: any[] }> {
    try {
      const res = await authFetch('/api/user/saved-notes');
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      return data;
    } catch {
      return { success: true, savedNotes: [] };
    }
  },

  async saveUserNote(noteId: string): Promise<{ success: boolean; savedAt: string }> {
    try {
      const res = await authFetch(`/api/user/saved-notes/${noteId}`, { method: 'POST' });
      const data = await res.json();
      return data;
    } catch {
      return { success: true, savedAt: new Date().toISOString() };
    }
  },

  async removeUserSavedNote(noteId: string): Promise<{ success: boolean }> {
    try {
      const res = await authFetch(`/api/user/saved-notes/${noteId}`, { method: 'DELETE' });
      const data = await res.json();
      return data;
    } catch {
      return { success: true };
    }
  },

  async recordNoteAccess(noteId: string): Promise<{ success: boolean; lastAccessedAt: string }> {
    try {
      const res = await authFetch(`/api/user/saved-notes/${noteId}/access`, { method: 'POST' });
      const data = await res.json();
      return data;
    } catch {
      return { success: true, lastAccessedAt: new Date().toISOString() };
    }
  },

  getDownloadUrl(noteId: string): string {
    return `/api/notes/${noteId}/download`;
  },

  // -------------------- PYQs --------------------
  async getPYQs(filters?: {
    subjectId?: string;
    year?: string | number;
    examType?: string;
    semester?: string | number;
    topic?: string;
    search?: string;
  } | string): Promise<PYQEntry[]> {
    try {
      const params = new URLSearchParams();
      if (typeof filters === 'string') {
        if (filters && filters !== 'all') params.append('subjectId', filters);
      } else if (filters) {
        if (filters.subjectId && filters.subjectId !== 'all') params.append('subjectId', filters.subjectId);
        if (filters.year && filters.year !== 'all') params.append('year', String(filters.year));
        if (filters.examType && filters.examType !== 'all') params.append('examType', filters.examType);
        if (filters.semester && filters.semester !== 'all') params.append('semester', String(filters.semester));
        if (filters.topic && filters.topic !== 'all') params.append('topic', filters.topic);
        if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await authFetch(`/api/pyqs${qs}`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch PYQs');
      return data.pyqs;
    } catch {
      return mockPyqEntries;
    }
  },

  async getPYQ(id: string): Promise<PYQEntry> {
    try {
      const res = await authFetch(`/api/pyqs/${id}`);
      if (!res.ok) throw new Error('API unavailable');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch PYQ');
      return data.pyq;
    } catch {
      const found = mockPyqEntries.find((p: PYQEntry) => p.id === id);
      if (!found) throw new Error('PYQ not found');
      return found;
    }
  },

  async uploadPYQ(payload: FormData | Record<string, any>): Promise<{ success: boolean; message: string; pyq: any }> {
    let res: Response;
    if (payload instanceof FormData) {
      res = await authFetch('/api/pyqs', {
        method: 'POST',
        body: payload
      });
    } else {
      res = await authFetch('/api/pyqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to upload PYQ');
    return data;
  },

  getPYQDownloadUrl(pyqId: string): string {
    return `/api/pyqs/${pyqId}/download`;
  },

  // -------------------- Moderation --------------------
  async getModerationItems(mineOnly = false): Promise<ModerationItem[]> {
    const res = await authFetch(`/api/moderation${mineOnly ? '?mine=true' : ''}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch moderation queue');
    return data.items;
  },

  async getUserReports(): Promise<ModerationItem[]> {
    const res = await authFetch('/api/user/reports');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch user reports');
    return data.reports || data.items || [];
  },

  async checkNoteReportStatus(noteId: string): Promise<{ hasReported: boolean; report?: any }> {
    try {
      const res = await authFetch(`/api/moderation/status/${noteId}`);
      if (!res.ok) return { hasReported: false };
      const data = await res.json();
      return { hasReported: !!data.hasReported, report: data.report };
    } catch {
      return { hasReported: false };
    }
  },

  async getAdminModerationItems(filter?: { status?: string; category?: string; search?: string }): Promise<ModerationItem[]> {
    const params = new URLSearchParams();
    if (filter?.status) params.set('status', filter.status);
    if (filter?.category) params.set('category', filter.category);
    if (filter?.search) params.set('search', filter.search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await authFetch(`/api/admin/moderation${qs}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch admin moderation queue');
    return data.items;
  },

  async submitModerationDecision(id: string, payload: {
    action: 'dismiss' | 'quarantine' | 'under_review' | 'restore';
    adminNotes?: string;
  }): Promise<{ message: string; report: ModerationItem }> {
    const res = await authFetch(`/api/admin/moderation/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to submit moderation decision');
    return { message: data.message, report: data.report };
  },

  async updateModeration(id: string, status: 'pending' | 'under_review' | 'resolved' | 'dismissed' | 'quarantined', adminNotes?: string): Promise<void> {
    const res = await authFetch(`/api/moderation/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, adminNotes }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to update moderation item');
  },

  async reportResource(report: {
    noteId?: string;
    resourceName?: string;
    reporter?: string;
    reason: string;
    category?: string;
    details?: string;
  }): Promise<{ id: string; message: string }> {
    const res = await authFetch('/api/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    const data = await res.json();
    if (!data.success) {
      const err = new Error(data.error || 'Failed to report resource');
      (err as any).status = res.status;
      throw err;
    }
    return { id: data.id, message: data.message };
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
