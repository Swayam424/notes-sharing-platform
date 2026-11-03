import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Search, Plus, ChevronRight, ChevronDown, Menu } from 'lucide-react';
import { useApp } from '../context/appState';
import { api } from '../services/api';
import type { Subject } from '../data/mockData';
import { DEGREE_OPTIONS, getStreamShortCode } from '../data/degrees';

const routeTitles: Record<string, { label: string; path: string }[]> = {
  '/': [{ label: 'Home', path: '/' }],
  '/dashboard': [{ label: 'Dashboard', path: '/dashboard' }],
  '/workspace': [{ label: 'Dashboard', path: '/dashboard' }],
  '/subjects': [{ label: 'Subjects', path: '/subjects' }],
  '/notes': [{ label: 'Discover notes', path: '/notes' }],
  '/library': [{ label: 'Saved', path: '/library' }],
  '/pyq': [{ label: 'Past papers', path: '/pyq' }],
  '/syllabus': [{ label: 'Syllabus coverage', path: '/syllabus' }],
  '/uploads': [{ label: 'Uploads', path: '/uploads' }],
  '/contributions': [{ label: 'Uploads', path: '/uploads' }],
  '/moderation': [{ label: 'Reports', path: '/moderation' }],
  '/settings': [{ label: 'Settings', path: '/settings' }],
};

export default function TopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setSearchOpen, setUploadOpen, switchSemester, refreshKey, setMobileNavOpen } = useApp();
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
    const base: { label: string; path?: string }[] = [];
    const path = location.pathname;

    // Check for subject detail routes
    const subjectMatch = path.match(/^\/subjects\/([^/]+)/);
    if (subjectMatch) {
      const subject = liveSubjects.find(s => s.id === subjectMatch[1]);
      return [
        ...base,
        { label: 'Subjects', path: '/subjects' },
        { label: subject ? subject.name : 'Subject Overview' }
      ];
    }

    if (/^\/pyq\/[^/]+/.test(path)) {
      return [{ label: 'Past papers', path: '/pyq' }, { label: 'Paper' }];
    }

    // Check for note detail routes
    const noteMatch = path.match(/^\/notes\/([^/]+)/);
    if (noteMatch) {
      return [
        ...base,
        { label: 'Discover notes', path: '/notes' },
        { label: 'Note' }
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
      {/* Mobile Hamburger Menu Toggle */}
      <button
        type="button"
        className="topbar-mobile-menu-btn"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation menu"
        title="Open menu"
      >
        <Menu size={20} strokeWidth={1.8} />
      </button>

      {/* Mobile Brand / Page Title */}
      <div className="topbar-mobile-title">
        <span className="topbar-mobile-brand">Atelier</span>
        <ChevronRight size={12} className="topbar-mobile-sep" />
        <span className="topbar-mobile-page">{breadcrumb[breadcrumb.length - 1]?.label || 'Dashboard'}</span>
      </div>

      {/* Breadcrumb (Desktop / Laptop View) */}
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
              border: '1px solid var(--color-border, var(--color-border))',
              padding: '6px 13px',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-deep, var(--color-deep))',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{
              background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
              color: 'var(--color-primary, var(--color-primary))',
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
              color: 'var(--color-muted, var(--color-muted))',
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
              border: '1px solid var(--color-border, var(--color-border))',
              borderRadius: '12px',
              boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.05)',
              padding: '14px',
              zIndex: 1000
            }}>
              <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border-light, var(--color-base))' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-muted, var(--color-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Academic Workspace
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-deep, var(--color-deep))', marginTop: '2px' }}>
                  {currentStream}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-muted, var(--color-muted))' }}>
                  {degreeObj.name} • {degreeObj.years} Years
                </div>
              </div>

              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted, var(--color-muted))', marginBottom: '8px' }}>
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
                      border: s === currentSem ? '1.5px solid var(--color-primary, var(--color-primary))' : '1px solid var(--color-border, var(--color-border))',
                      background: s === currentSem ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-surface-alt, var(--color-base))',
                      color: s === currentSem ? 'var(--color-primary, var(--color-primary))' : 'var(--color-deep, var(--color-deep))',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Sem {s}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border-light, var(--color-base))', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-muted, var(--color-muted))' }}>
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
                    color: 'var(--color-primary, var(--color-primary))',
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

      {/* Search (Desktop) */}
      <button
        className="topbar-search topbar-desktop-only"
        onClick={() => setSearchOpen(true)}
        id="topbar-search-trigger"
        aria-label="Open search"
      >
        <Search size={16} strokeWidth={1.5} />
        <span className="topbar-search-text">Search notes, topics…</span>
        <span className="topbar-search-kbd">⌘K</span>
      </button>

      {/* Upload Button (Desktop) */}
      <button
        className="btn btn-primary topbar-desktop-only"
        onClick={() => setUploadOpen(true)}
        id="topbar-upload-btn"
      >
        <Plus size={16} strokeWidth={2} />
        Upload Resource
      </button>

      {/* Mobile Action Buttons */}
      <div className="topbar-mobile-actions">
        <button
          type="button"
          className="topbar-mobile-icon-btn"
          onClick={() => setSearchOpen(true)}
          aria-label="Search topics and notes"
          title="Search"
        >
          <Search size={18} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          className="topbar-mobile-icon-btn topbar-mobile-upload-btn"
          onClick={() => setUploadOpen(true)}
          aria-label="Upload resource"
          title="Upload Resource"
        >
          <Plus size={18} strokeWidth={2.2} />
        </button>
      </div>
    </header>
  );
}
