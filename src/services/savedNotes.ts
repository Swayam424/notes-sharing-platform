import { api } from './api';

export interface SavedNoteMeta {
  savedAt: string;
  lastAccessedAt?: string;
}

const STORAGE_KEY = 'atelier_saved_notes';
const META_KEY = 'atelier_saved_notes_meta';
const EVENT_NAME = 'atelier_saved_notes_changed';

function readStoredIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to write saved notes to localStorage:', err);
  }
}

function readStoredMeta(): Record<string, SavedNoteMeta> {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStoredMeta(meta: Record<string, SavedNoteMeta>): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.error('Failed to write saved notes meta to localStorage:', err);
  }
}

function notifyChange(): void {
  try {
    const ids = readStoredIds();
    const meta = readStoredMeta();
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { ids, meta } }));
  } catch (e) {
    // Ignore in non-browser environments
  }
}

export const savedNotesService = {
  getSavedIds(): string[] {
    return readStoredIds();
  },

  getSavedMeta(): Record<string, SavedNoteMeta> {
    return readStoredMeta();
  },

  isSaved(noteId: string): boolean {
    if (!noteId) return false;
    return readStoredIds().includes(noteId);
  },

  async saveNote(noteId: string): Promise<void> {
    if (!noteId) return;
    const ids = readStoredIds();
    const meta = readStoredMeta();
    const now = new Date().toISOString();

    if (!ids.includes(noteId)) {
      ids.unshift(noteId);
      writeStoredIds(ids);
    }

    meta[noteId] = {
      savedAt: meta[noteId]?.savedAt || now,
      lastAccessedAt: meta[noteId]?.lastAccessedAt
    };
    writeStoredMeta(meta);
    notifyChange();

    // Sync with server if authenticated
    try {
      await api.saveUserNote(noteId);
    } catch {
      // Offline / unauthenticated
    }
  },

  async removeSavedNote(noteId: string): Promise<void> {
    if (!noteId) return;
    const ids = readStoredIds().filter(id => id !== noteId);
    const meta = readStoredMeta();
    delete meta[noteId];

    writeStoredIds(ids);
    writeStoredMeta(meta);
    notifyChange();

    // Sync with server
    try {
      await api.removeUserSavedNote(noteId);
    } catch {
      // Offline / unauthenticated
    }
  },

  async toggleSaveNote(noteId: string): Promise<boolean> {
    if (this.isSaved(noteId)) {
      await this.removeSavedNote(noteId);
      return false;
    } else {
      await this.saveNote(noteId);
      return true;
    }
  },

  async recordNoteAccess(noteId: string): Promise<void> {
    if (!noteId) return;
    const meta = readStoredMeta();
    const now = new Date().toISOString();

    if (meta[noteId]) {
      meta[noteId].lastAccessedAt = now;
      writeStoredMeta(meta);
      notifyChange();
    }

    try {
      await api.recordNoteAccess(noteId);
    } catch {
      // Offline / unauthenticated
    }
  },

  /** Synchronizes server-stored saved notes with local storage */
  async syncFromServer(): Promise<{ ids: string[]; meta: Record<string, SavedNoteMeta> }> {
    try {
      const res = await api.getSavedNotes();
      if (res.success && Array.isArray(res.savedNotes)) {
        const localIds = readStoredIds();
        const localMeta = readStoredMeta();

        // Merge server notes into local storage
        for (const item of res.savedNotes) {
          if (!localIds.includes(item.id)) {
            localIds.push(item.id);
          }
          if (!localMeta[item.id] || new Date(item.savedAt) > new Date(localMeta[item.id].savedAt)) {
            localMeta[item.id] = {
              savedAt: item.savedAt || new Date().toISOString(),
              lastAccessedAt: item.lastAccessedAt
            };
          }
        }

        writeStoredIds(localIds);
        writeStoredMeta(localMeta);
        notifyChange();
        return { ids: localIds, meta: localMeta };
      }
    } catch {
      // Continue with local storage if API call fails
    }
    return { ids: readStoredIds(), meta: readStoredMeta() };
  },

  subscribe(listener: (ids: string[], meta: Record<string, SavedNoteMeta>) => void): () => void {
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<{ ids: string[]; meta: Record<string, SavedNoteMeta> }>;
      if (customEvent.detail) {
        listener(customEvent.detail.ids, customEvent.detail.meta);
      } else {
        listener(readStoredIds(), readStoredMeta());
      }
    };

    window.addEventListener(EVENT_NAME, handler);
    // Also listen to storage events from other tabs
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener('storage', handler);
    };
  }
};
