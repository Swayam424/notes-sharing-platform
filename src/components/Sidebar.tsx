import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import {
  BookOpen, FolderOpen, FileText, Clock, Compass,
  Upload, Flag, Settings, LayoutDashboard, Sparkles, LogOut, Bookmark, ShieldAlert
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { currentUser as fallbackUser } from '../data/mockData';
import { getStreamShortCode } from '../data/degrees';

const navItems = {
  workspace: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/subjects', icon: FolderOpen, label: 'My Subjects' },
  ],
  library: [
    { to: '/notes', icon: FileText, label: 'Notes Discovery' },
    { to: '/library', icon: Bookmark, label: 'My Library' },
    { to: '/pyq', icon: Clock, label: 'PYQ Archive' },
    { to: '/syllabus', icon: Compass, label: 'Syllabus Coverage' },
  ],
  personal: [
    { to: '/uploads', icon: Upload, label: 'My Uploads' },
    { to: '/moderation', icon: Flag, label: 'My Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ],
  showcase: [
    { to: '/', icon: Sparkles, label: 'Landing Showcase' },
  ]
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: appUser, logout } = useApp();
  const [profileUser, setProfileUser] = useState(fallbackUser);

  useEffect(() => {
    api.getUserProfile()
      .then(profile => {
        if (profile) {
          setProfileUser({
            name: profile.name || fallbackUser.name,
            initials: profile.initials || fallbackUser.initials,
            role: profile.role || fallbackUser.role,
            college: profile.college || fallbackUser.college,
            department: profile.department || fallbackUser.department,
            stream: (profile as any).stream || fallbackUser.stream,
            degree: (profile as any).degree || fallbackUser.degree,
            semester: profile.semester || fallbackUser.semester,
            enrolledSubjects: (profile as any).enrolledSubjects || fallbackUser.enrolledSubjects,
          });
        }
      })
      .catch(console.error);
  }, []);

  const currentUser = appUser || profileUser;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="sidebar" id="sidebar-nav">
      {/* Brand Header (Clickable to Landing Page) */}
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit' }} title="Visit Scroll-Animated Landing Page">
          <div className="sidebar-brand-icon">
            <BookOpen size={18} strokeWidth={1.5} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Atelier</span>
            <span className="sidebar-brand-meta">{currentUser.college} • {getStreamShortCode((currentUser as any).stream || currentUser.department)} • Sem {currentUser.semester}</span>
          </div>
        </NavLink>
      </div>

      {/* Navigation Sections */}
      <nav>
        <div className="sidebar-section">
          <div className="sidebar-section-label">Workplace</div>
          {navItems.workspace.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-nav-item ${isActive(item.to) ? 'active' : ''}`}
              end={item.to === '/'}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon className="sidebar-nav-icon" size={20} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Library</div>
          {navItems.library.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-nav-item ${isActive(item.to) ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon className="sidebar-nav-icon" size={20} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Personal</div>
          {navItems.personal.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-nav-item ${isActive(item.to) ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon className="sidebar-nav-icon" size={20} strokeWidth={1.5} />
              {item.label}
            </NavLink>
          ))}
        </div>

        {((currentUser?.role || '').toLowerCase() === 'moderator' || (currentUser?.role || '').toLowerCase() === 'admin') && (
          <div className="sidebar-section">
            <div className="sidebar-section-label" style={{ color: 'var(--color-primary)' }}>
              Administration
            </div>
            <NavLink
              to="/admin/moderation"
              className={`sidebar-nav-item ${isActive('/admin/moderation') ? 'active' : ''}`}
              id="nav-moderation-console"
            >
              <ShieldAlert className="sidebar-nav-icon" size={20} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
              Moderation Console
            </NavLink>
          </div>
        )}

        <div className="sidebar-section">
          <div className="sidebar-section-label">Showcase</div>
          {navItems.showcase.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-nav-item ${isActive(item.to) ? 'active' : ''}`}
              id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon className="sidebar-nav-icon" size={20} strokeWidth={1.5} style={{ color: 'var(--terracotta-base, #c84b28)' }} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Profile Chip & Sign Out */}
      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="sidebar-user" style={{ width: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="sidebar-avatar">{currentUser.initials}</div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{currentUser.name}</span>
              <span className="sidebar-user-role">{currentUser.role}</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out of Study Space"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--terracotta-base, #c84b28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
