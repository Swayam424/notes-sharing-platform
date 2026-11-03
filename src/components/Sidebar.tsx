import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import {
  FolderOpen, FileText, Clock, Compass,
  Upload, Flag, Settings, LayoutDashboard, LogOut, Bookmark, ShieldAlert, Bot, X
} from 'lucide-react';
import { useApp } from '../context/appState';
import { getStreamShortCode } from '../data/degrees';

type NavItem = { to: string; icon: typeof FileText; label: string; badge?: string };

const sections: { label: string; items: NavItem[] }[] = [
  {
    label: 'Study',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/subjects', icon: FolderOpen, label: 'Subjects' },
      { to: '/assistant', icon: Bot, label: 'Study Assistant', badge: 'AI' },
    ],
  },
  {
    label: 'Library',
    items: [
      { to: '/notes', icon: FileText, label: 'Discover notes' },
      { to: '/library', icon: Bookmark, label: 'Saved' },
      { to: '/pyq', icon: Clock, label: 'Past papers' },
      { to: '/syllabus', icon: Compass, label: 'Syllabus coverage' },
    ],
  },
  {
    label: 'You',
    items: [
      { to: '/uploads', icon: Upload, label: 'Uploads' },
      { to: '/moderation', icon: Flag, label: 'Reports' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, mobileNavOpen, setMobileNavOpen } = useApp();

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname, setMobileNavOpen]);

  const role = (user?.role || '').toLowerCase();
  const isStaff = role === 'moderator' || role === 'admin';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const renderItem = (item: NavItem) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={`sidebar-nav-item ${isActive(item.to) ? 'active' : ''}`}
      aria-current={isActive(item.to) ? 'page' : undefined}
    >
      <item.icon className="sidebar-nav-icon" size={17} strokeWidth={1.75} aria-hidden="true" />
      <span>{item.label}</span>
      {item.badge && <span className="sidebar-badge-ai">{item.badge}</span>}
    </NavLink>
  );

  return (
    <>
      {mobileNavOpen && (
        <div className="sidebar-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      )}
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`} id="sidebar-nav" aria-label="Primary">
        <div className="sidebar-header">
          <NavLink to="/dashboard" className="sidebar-brand" onClick={() => setMobileNavOpen(false)}>
            <span className="brand-mark" aria-hidden="true">A</span>
            <span className="sidebar-brand-text">
              <span className="sidebar-brand-name">Atelier</span>
              {user && (
                <span className="sidebar-brand-meta">
                  {getStreamShortCode(user.stream || user.department)} · Sem {user.semester}
                </span>
              )}
            </span>
          </NavLink>
          <button type="button" className="sidebar-close-btn" onClick={() => setMobileNavOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div className="sidebar-section" key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map(renderItem)}
            </div>
          ))}
          {isStaff && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Staff</div>
              {renderItem({ to: '/admin/moderation', icon: ShieldAlert, label: 'Moderation console' })}
            </div>
          )}
        </nav>

        {user && (
          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="sidebar-avatar" aria-hidden="true">{user.initials}</div>
              <div className="sidebar-user-info">
                <span className="sidebar-user-name">{user.name}</span>
                <span className="sidebar-user-role">{user.college}</span>
              </div>
              <button type="button" className="icon-button" onClick={handleLogout} aria-label="Sign out" title="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
