import { useState, useEffect } from 'react';
import { User, Palette, Bell, HardDrive, ShieldCheck, LogOut, SlidersHorizontal, Target } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { currentUser as fallbackUser } from '../data/mockData';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user: appUser, logout } = useApp();
  const [profile, setProfile] = useState(() => appUser || fallbackUser);

  useEffect(() => {
    if (appUser) {
      setProfile(appUser);
      return;
    }
    api.getUserProfile()
      .then(p => {
        if (p) setProfile(p);
      })
      .catch(console.error);
  }, [appUser]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const streamName = (profile as any).stream || profile.department;
  const degreeName = (profile as any).degree || 'B.Tech / B.E.';
  const goalName = (profile as any).academicGoal;
  const enrolledCount = (profile as any).enrolledSubjects?.length || 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <User size={16} strokeWidth={1.5} />
            <h3 style={{ fontSize: 'var(--text-md)' }}>Academic Identity & Profile</h3>
          </div>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => navigate('/onboarding')}
            style={{ fontSize: '12px', color: 'var(--color-primary)' }}
          >
            <SlidersHorizontal size={13} /> Edit Academic Roster
          </button>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--color-primary-muted), var(--color-secondary-muted))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-primary)',
            }}>
              {profile.initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', fontFamily: 'var(--font-display)' }}>
                {profile.name}
              </div>
              <div className="text-sm text-muted" style={{ marginTop: '2px' }}>
                {degreeName} • {streamName} • Semester {profile.semester}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                <span className="badge badge-primary">{profile.role}</span>
                <span className="chip">{profile.college}</span>
                {enrolledCount > 0 && <span className="chip">{enrolledCount} enrolled subjects</span>}
                {goalName && (
                  <span className="chip chip-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Target size={11} /> {goalName}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Palette size={16} strokeWidth={1.5} />
          <h3 style={{ fontSize: 'var(--text-md)' }}>Appearance</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border-light)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Theme</div>
              <div className="text-xs text-muted">Choose your preferred color scheme</div>
            </div>
            <select className="select">
              <option>Light (Alabaster)</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>PDF Reader Mode</div>
              <div className="text-xs text-muted">Default reading mode for documents</div>
            </div>
            <select className="select">
              <option>Light</option>
              <option>Sepia</option>
              <option>Dark</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Bell size={16} strokeWidth={1.5} />
          <h3 style={{ fontSize: 'var(--text-md)' }}>Notifications</h3>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted">Notification preferences will be available when connected to a backend.</div>
        </div>
      </div>

      {/* Storage */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <HardDrive size={16} strokeWidth={1.5} />
          <h3 style={{ fontSize: 'var(--text-md)' }}>Storage</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span className="text-sm">Used</span>
            <span className="mono" style={{ fontSize: '11px' }}>128 MB / 500 MB</span>
          </div>
          <div className="progress" style={{ height: '6px' }}>
            <div className="progress-fill high" style={{ width: '25.6%' }} />
          </div>
        </div>
      </div>

      {/* Account Security & Session */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ShieldCheck size={16} strokeWidth={1.5} />
          <h3 style={{ fontSize: 'var(--text-md)' }}>Account &amp; Security</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border-light)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Authenticated Email</div>
              <div className="text-xs text-muted">{'email' in profile && profile.email ? (profile as any).email : 'student@atelier.edu'}</div>
            </div>
            <span className="badge badge-secondary">Active Session</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0 0' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Sign Out</div>
              <div className="text-xs text-muted">End your current session on this device</div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c84b28', borderColor: 'rgba(200, 75, 40, 0.3)' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
