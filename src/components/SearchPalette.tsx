import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Search, FileText, FolderOpen, Clock, Compass, ArrowRight, Bookmark, Upload } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Subject, NoteResource } from '../data/mockData';

interface SearchResult {
  type: 'subject' | 'note' | 'page';
  label: string;
  meta: string;
  path: string;
  icon: typeof FileText;
}

const staticPages: SearchResult[] = [
  { type: 'page', label: 'Dashboard', meta: 'Page', path: '/', icon: Compass },
  { type: 'page', label: 'Notes Discovery', meta: 'Page', path: '/notes', icon: FileText },
  { type: 'page', label: 'My Library (Saved Notes)', meta: 'Personal Study Collection', path: '/library', icon: Bookmark },
  { type: 'page', label: 'My Uploads', meta: 'Contributed Resources', path: '/uploads', icon: Upload },
  { type: 'page', label: 'PYQ Archive', meta: 'Page', path: '/pyq', icon: Clock },
  { type: 'page', label: 'Syllabus Coverage', meta: 'Page', path: '/syllabus', icon: Compass },
  { type: 'page', label: 'Moderation Queue', meta: 'Page', path: '/moderation', icon: FileText },
];

export default function SearchPalette() {
  const { searchOpen, setSearchOpen } = useApp();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [liveSubjects, setLiveSubjects] = useState<Subject[]>([]);
  const [liveNotes, setLiveNotes] = useState<NoteResource[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchOpen) {
      Promise.all([
        api.getSubjects(),
        api.getNotes()
      ]).then(([subs, nts]) => {
        setLiveSubjects(subs);
        setLiveNotes(nts);
      }).catch(console.error);
    }
  }, [searchOpen]);

  const results: SearchResult[] = (() => {
    if (!query.trim()) return staticPages;
    const q = query.toLowerCase();
    const matches: SearchResult[] = [];

    liveSubjects.forEach(s => {
      if (s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)) {
        matches.push({ type: 'subject', label: s.name, meta: s.code, path: `/subjects/${s.id}`, icon: FolderOpen });
      }
      s.units.forEach(u => {
        u.topics.forEach(t => {
          if (t.name.toLowerCase().includes(q)) {
            matches.push({ type: 'subject', label: t.name, meta: `${s.name} • ${u.name}`, path: `/subjects/${s.id}`, icon: FolderOpen });
          }
        });
      });
    });

    liveNotes.forEach(n => {
      if (n.title.toLowerCase().includes(q) || n.author.toLowerCase().includes(q)) {
        matches.push({ type: 'note', label: n.title, meta: `by ${n.author}`, path: `/notes/${n.id}`, icon: FileText });
      }
    });

    staticPages.forEach(p => {
      if (p.label.toLowerCase().includes(q)) matches.push(p);
    });

    return matches.slice(0, 8);
  })();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    if (searchOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setSearchOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  if (!searchOpen) return null;

  return (
    <div className="command-overlay" onClick={() => setSearchOpen(false)}>
      <div className="command-panel" onClick={e => e.stopPropagation()}>
        <div className="command-input-wrap">
          <Search size={18} strokeWidth={1.5} style={{ color: 'var(--color-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            className="command-input"
            placeholder="Search topics, notes, subjects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            id="command-palette-input"
          />
        </div>
        <div className="command-results">
          {results.length === 0 ? (
            <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
              No results found
            </div>
          ) : (
            results.map((r, i) => (
              <div
                key={`${r.path}-${i}`}
                className={`command-result-item ${i === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <r.icon className="command-result-icon" size={18} strokeWidth={1.5} />
                <span className="command-result-text">{r.label}</span>
                <span className="command-result-meta">{r.meta}</span>
                <ArrowRight size={14} style={{ color: 'var(--color-border)' }} />
              </div>
            ))
          )}
        </div>
        <div className="command-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
