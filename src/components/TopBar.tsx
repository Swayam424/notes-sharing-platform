import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Subject } from '../data/mockData';

const routeTitles: Record<string, { label: string; path: string }[]> = {
  '/': [{ label: 'Landing Showcase', path: '/' }],
  '/dashboard': [{ label: 'Study Space', path: '/dashboard' }],
  '/workspace': [{ label: 'Study Space', path: '/dashboard' }],
  '/subjects': [{ label: 'My Subjects', path: '/subjects' }],
  '/notes': [{ label: 'Notes Discovery', path: '/notes' }],
  '/library': [{ label: 'My Library', path: '/library' }],
  '/pyq': [{ label: 'PYQ Archive', path: '/pyq' }],
  '/syllabus': [{ label: 'Syllabus Coverage', path: '/syllabus' }],
  '/uploads': [{ label: 'My Uploads', path: '/uploads' }],
  '/contributions': [{ label: 'My Uploads', path: '/uploads' }],
  '/moderation': [{ label: 'Moderation Queue', path: '/moderation' }],
  '/settings': [{ label: 'Settings', path: '/settings' }],
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setSearchOpen, setUploadOpen } = useApp();
  const [liveSubjects, setLiveSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    api.getSubjects().then(setLiveSubjects).catch(console.error);
  }, []);

  const getBreadcrumb = (): { label: string; path?: string }[] => {
    const base = [
      { label: 'Study Space', path: '/dashboard' },
      { label: 'Semester 5', path: '/dashboard' }
    ];
    const path = location.pathname;

    // Check for subject detail routes
    const subjectMatch = path.match(/^\/subjects\/([^/]+)/);
    if (subjectMatch) {
      const subject = liveSubjects.find(s => s.id === subjectMatch[1]);
      return [
        ...base,
        { label: 'My Subjects', path: '/subjects' },
        { label: subject ? subject.name : 'Subject Overview' }
      ];
    }

    // Check for note detail routes
    const noteMatch = path.match(/^\/notes\/([^/]+)/);
    if (noteMatch) {
      return [
        ...base,
        { label: 'Notes Discovery', path: '/notes' },
        { label: 'Document Reader' }
      ];
    }

    // Default route titles
    const titles = routeTitles[path];
    if (titles) return [...base, ...titles];

    return base;
  };

  const breadcrumb = getBreadcrumb();

  return (
    <header className="topbar" id="topbar">
      {/* Breadcrumb */}
      <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
        {breadcrumb.map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {i > 0 && <ChevronRight size={12} className="topbar-breadcrumb-sep" />}
            {item.path && i < breadcrumb.length - 1 ? (
              <button
                className="topbar-breadcrumb-item"
                onClick={() => navigate(item.path!)}
                style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
              >
                {item.label}
              </button>
            ) : (
              <span className={`topbar-breadcrumb-item ${i === breadcrumb.length - 1 ? 'current' : ''}`}>
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="topbar-spacer" />

      {/* Search */}
      <button
        className="topbar-search"
        onClick={() => setSearchOpen(true)}
        id="topbar-search-trigger"
        aria-label="Open search"
      >
        <Search size={16} strokeWidth={1.5} />
        <span className="topbar-search-text">Search topics, notes...</span>
        <span className="topbar-search-kbd">⌘K</span>
      </button>

      {/* Upload Button */}
      <button
        className="btn btn-primary"
        onClick={() => setUploadOpen(true)}
        id="topbar-upload-btn"
      >
        <Plus size={16} strokeWidth={2} />
        Upload Resource
      </button>
    </header>
  );
}
