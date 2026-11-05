import { NavLink, useLocation } from 'react-router';
import { LayoutDashboard, FileText, Bookmark, Bot, Menu } from 'lucide-react';
import { useApp } from '../context/appState';

export default function MobileBottomNav() {
  const location = useLocation();
  const { setMobileNavOpen, mobileNavOpen } = useApp();

  const isNavActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <NavLink
        to="/dashboard"
        className={`mobile-bottom-item ${isNavActive('/dashboard') ? 'active' : ''}`}
        id="mobile-nav-dashboard"
        onClick={() => setMobileNavOpen(false)}
      >
        <div className="mobile-bottom-icon-wrap">
          <LayoutDashboard size={20} strokeWidth={1.75} />
        </div>
        <span className="mobile-bottom-label">Home</span>
      </NavLink>

      <NavLink
        to="/notes"
        className={`mobile-bottom-item ${isNavActive('/notes') ? 'active' : ''}`}
        id="mobile-nav-notes"
        onClick={() => setMobileNavOpen(false)}
      >
        <div className="mobile-bottom-icon-wrap">
          <FileText size={20} strokeWidth={1.75} />
        </div>
        <span className="mobile-bottom-label">Notes</span>
      </NavLink>

      <NavLink
        to="/library"
        className={`mobile-bottom-item ${isNavActive('/library') ? 'active' : ''}`}
        id="mobile-nav-saved"
        onClick={() => setMobileNavOpen(false)}
      >
        <div className="mobile-bottom-icon-wrap">
          <Bookmark size={20} strokeWidth={1.75} />
        </div>
        <span className="mobile-bottom-label">Saved</span>
      </NavLink>

      <NavLink
        to="/assistant"
        className={`mobile-bottom-item ${isNavActive('/assistant') ? 'active' : ''}`}
        id="mobile-nav-assistant"
        onClick={() => setMobileNavOpen(false)}
      >
        <div className="mobile-bottom-icon-wrap" style={{ position: 'relative' }}>
          <Bot size={20} strokeWidth={1.75} style={{ color: isNavActive('/assistant') ? 'var(--color-primary)' : 'inherit' }} />
          <span className="mobile-nav-ai-pill">AI</span>
        </div>
        <span className="mobile-bottom-label">Assistant</span>
      </NavLink>

      <button
        type="button"
        className={`mobile-bottom-item ${mobileNavOpen ? 'active' : ''}`}
        id="mobile-nav-more"
        onClick={() => setMobileNavOpen(prev => !prev)}
        aria-label="Open full menu"
      >
        <div className="mobile-bottom-icon-wrap">
          <Menu size={20} strokeWidth={1.75} />
        </div>
        <span className="mobile-bottom-label">More</span>
      </button>
    </nav>
  );
}
