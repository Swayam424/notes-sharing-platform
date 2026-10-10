import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Search, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Subject } from '../data/mockData';
import { DEGREE_OPTIONS, getStreamShortCode } from '../data/degrees';

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
  const { user, setSearchOpen, setUploadOpen, switchSemester, refreshKey } = useApp();
  const [liveSubjects, setLiveSubjects] = useState<Subject[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentSem = user?.semester || 5;
  const currentStream = user?.stream || 'Computer Science & Engineering';
  const streamShortCode = getStreamShortCode(currentStream);

  const degreeObj = useMemo(() => {
    return DEGREE_OPTIONS.find(d => d.name === user?.degree || d.id === user?.degree || d.shortName === user?.degree) || DEGREE_OPTIONS[0];
  }, [user?.degree]);

  const semesterList = useMemo(() => {
    return Array.from({ length: degreeObj.totalSemesters }, (_, i) => i + 1);
  }, [degreeObj.totalSemesters]);

  useEffect(() => {
    api.getSubjects({ stream: currentStream, semester: currentSem })
      .then(setLiveSubjects)
      .catch(console.error);
  }, [currentStream, currentSem, refreshKey]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const getBreadcrumb = (): { label: string; path?: string }[] => {
    const base = [
      { label: 'Study Space', path: '/dashboard' },
      { label: `Semester ${currentSem}`, path: '/dashboard' }
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

      {/* Stream & Semester Quick Switcher */}
      {user && (
        <div className="topbar-semester-switcher" ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="topbar-sem-trigger"
            onClick={() => setDropdownOpen(prev => !prev)}
            title="Switch Active Study Semester"
            id="topbar-semester-switcher-trigger"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E8E5DF)',
              padding: '6px 13px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-deep, #1F2421)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{
              background: 'rgba(217, 93, 57, 0.12)',
              color: 'var(--color-primary, #D95D39)',
              fontWeight: 700,
              fontSize: '11px',
              padding: '2px 7px',
              borderRadius: '4px',
              letterSpacing: '0.04em'
            }}>
              {streamShortCode}
            </span>
            <span>Sem {currentSem}</span>
            <ChevronDown size={13} style={{
              color: 'var(--color-muted, #706B63)',
              transform: dropdownOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease'
            }} />
          </button>

          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '280px',
              background: 'var(--color-surface, #FFFFFF)',
              border: '1px solid var(--color-border, #E8E5DF)',
              borderRadius: '12px',
              boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
              padding: '14px',
              zIndex: 1000
            }}>
              <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border-light, #F0EFEB)' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-muted, #706B63)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Academic Workspace
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-deep, #1F2421)', marginTop: '2px' }}>
                  {currentStream}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-muted, #706B63)' }}>
                  {degreeObj.name} • {degreeObj.years} Years
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted, #706B63)', marginBottom: '8px' }}>
                Quick Semester Switcher:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {semesterList.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      switchSemester(s);
                      setDropdownOpen(false);
                    }}
                    style={{
                      padding: '7px 0',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: s === currentSem ? 600 : 500,
                      border: s === currentSem ? '1.5px solid var(--color-primary, #D95D39)' : '1px solid var(--color-border, #E8E5DF)',
                      background: s === currentSem ? 'rgba(217, 93, 57, 0.08)' : 'var(--color-surface-alt, #F9F8F6)',
                      color: s === currentSem ? 'var(--color-primary, #D95D39)' : 'var(--color-deep, #1F2421)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Sem {s}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border-light, #F0EFEB)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-muted, #706B63)' }}>
                  Edit branches & courses
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate('/settings');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary, #D95D39)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Settings →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
