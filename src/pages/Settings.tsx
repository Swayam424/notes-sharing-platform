import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { LogOut, Check, Edit2, ShieldCheck, School, GraduationCap } from 'lucide-react';
import { useApp, type UserSession } from '../context/appState';
import { useOnChange } from '../hooks/useOnChange';
import { DEGREE_OPTIONS, STREAM_PRESETS, type DegreeOption } from '../data/degrees';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user: appUser, logout, updateAcademicProfile } = useApp();
  const [profile, setProfile] = useState<UserSession>(appUser || {
    id: 'u1',
    email: 'student@atelier.edu',
    name: 'Student User',
    initials: 'SU',
    role: 'student',
    college: 'University Campus',
    department: 'Computer Science & Engineering',
    stream: 'Computer Science & Engineering',
    degree: 'B.Tech / B.E.',
    semester: 5,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [degree, setDegree] = useState(profile.degree || 'B.Tech / B.E.');
  const [stream, setStream] = useState(profile.stream || profile.department || 'Computer Science & Engineering');
  const [customStream, setCustomStream] = useState('');
  const [semester, setSemester] = useState<number>(profile.semester || 5);
  const [college, setCollege] = useState(profile.college || 'University Campus');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDegreeObj: DegreeOption = useMemo(() => {
    return DEGREE_OPTIONS.find(d => d.name === degree || d.id === degree || d.shortName === degree) || DEGREE_OPTIONS[0];
  }, [degree]);

  const totalSemesters = selectedDegreeObj.totalSemesters;
  const semesterList = useMemo(() => {
    return Array.from({ length: totalSemesters }, (_, i) => i + 1);
  }, [totalSemesters]);

  // Clamp semester if degree changes
  if (semester > totalSemesters) {
    setSemester(totalSemesters);
  }

  // Sync profile when appUser changes
  useOnChange(appUser, () => {
    if (appUser) {
      setProfile(appUser);
      setDegree(appUser.degree || 'B.Tech / B.E.');
      setStream(appUser.stream || appUser.department || 'Computer Science & Engineering');
      setSemester(appUser.semester || 5);
      setCollege(appUser.college || 'University Campus');
    }
  }, { onMount: true });

  const handleSaveProfile = async () => {
    setError(null);
    const effStream = stream === 'other' ? customStream.trim() : stream;
    if (!effStream) {
      setError('Please provide a stream/branch name.');
      return;
    }

    try {
      setSaving(true);
      await updateAcademicProfile({
        degree: selectedDegreeObj.name,
        stream: effStream,
        department: effStream,
        college: college.trim() || 'University Campus',
        semester,
        enrolledSubjects: [],
      });
      setSaveSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setError(err?.message || 'Failed to save academic profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const streamName = profile.stream || profile.department;
  const degreeName = profile.degree || 'B.Tech / B.E.';

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Your degree, department, semester, and college profile.</p>
      </div>

      {saveSuccess && (
        <div style={{
          background: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)',
          border: '1px solid var(--color-secondary)',
          color: 'var(--color-secondary)',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={16} /> Academic profile updated successfully.
        </div>
      )}

      {error && (
        <div style={{
          background: 'var(--color-danger-light, #FCEAEA)',
          border: '1px solid var(--color-danger, #C45454)',
          color: 'var(--color-danger, #C45454)',
          padding: '10px 14px',
          borderRadius: '8px',
          marginBottom: '16px',
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {/* Academic Identity & Studio Scope Card */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <GraduationCap size={18} strokeWidth={1.5} color="var(--color-primary)" />
            <h3 style={{ fontSize: 'var(--text-md)', margin: 0 }}>Academic Identity &amp; Program</h3>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Edit2 size={13} /> Edit Profile
            </button>
          )}
        </div>

        <div className="card-body">
          {!isEditing ? (
            /* Read-Only Academic Summary */
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Degree Program
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-deep)', marginTop: '4px' }}>
                    {degreeName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                    {selectedDegreeObj.years} Years • {totalSemesters} Semesters
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Branch / Department
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-deep)', marginTop: '4px' }}>
                    {streamName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                    Engineering &amp; Sciences
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Current Semester
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-deep)', marginTop: '4px' }}>
                    Semester {profile.semester}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                    Active term
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    College / University
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-deep)', marginTop: '4px' }}>
                    {profile.college || 'University Campus'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                    Campus Community
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Editing Academic Profile */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Degree Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep)', marginBottom: '8px' }}>
                  Degree Program
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DEGREE_OPTIONS.map(d => {
                    const isSelected = degree === d.name;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          setDegree(d.name);
                          if (semester > d.totalSemesters) {
                            setSemester(d.totalSemesters);
                          }
                        }}
                        className={`degree-pill-btn ${isSelected ? 'active' : ''}`}
                      >
                        <span>{d.name}</span>
                        <span className="degree-pill-tag">{d.durationLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Stream / Branch Preset Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep)', marginBottom: '8px' }}>
                  Branch / Department
                </label>
                <div className="stream-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
                  {STREAM_PRESETS.map(p => {
                    const isSelected = stream === p.name;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setStream(p.name)}
                        className={`stream-card ${isSelected ? 'active' : ''}`}
                        style={{ padding: '10px 12px' }}
                      >
                        <div className="stream-icon-wrap" style={{
                          width: '32px', height: '32px',
                          background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: isSelected ? '#FFFFFF' : 'var(--color-primary)'
                        }}>
                          <span style={{ fontSize: "16px" }}>{p.icon}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--color-deep)' }}>
                            {p.name}
                          </div>
                        </div>
                        {isSelected && <Check size={16} color="var(--color-primary)" />}
                      </div>
                    );
                  })}
                </div>

                {/* Custom stream write-in */}
                <div style={{ marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setStream('other')}
                    style={{
                      background: 'none', border: 'none',
                      color: stream === 'other' ? 'var(--color-primary)' : 'var(--color-muted)',
                      fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', padding: 0
                    }}
                  >
                    + Enter custom branch or specialization
                  </button>
                  {stream === 'other' && (
                    <input
                      type="text"
                      placeholder="e.g. Chemical Engineering, Robotics, AI & Data Science..."
                      value={customStream}
                      onChange={e => setCustomStream(e.target.value)}
                      style={{
                        width: '100%', marginTop: '6px', padding: '8px 12px',
                        borderRadius: '6px', border: '1.5px solid var(--color-primary)',
                        fontSize: '0.85rem', outline: 'none'
                      }}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* 3. Semester Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep)', marginBottom: '8px' }}>
                  Semester (Term {semester} of {totalSemesters})
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {semesterList.map(sem => (
                    <button
                      key={sem}
                      type="button"
                      onClick={() => setSemester(sem)}
                      className={`sem-btn ${semester === sem ? 'active' : ''}`}
                    >
                      S{sem}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. College Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep)', marginBottom: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <School size={14} /> College / University Name
                  </span>
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={e => setCollege(e.target.value)}
                  placeholder="e.g. Apex Institute of Technology"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--color-border)', fontSize: '0.88rem', outline: 'none'
                  }}
                />
              </div>

              {/* Form Actions */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '10px', paddingTop: '16px', borderTop: '1px solid var(--color-border-light)' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} /> {saving ? 'Saving Profile…' : 'Save Academic Changes'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account Security & Session */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <ShieldCheck size={16} strokeWidth={1.5} />
          <h3 style={{ fontSize: 'var(--text-md)', margin: 0 }}>Account &amp; Session</h3>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border-light)' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Student Email</div>
              <div className="text-xs text-muted">{'email' in profile && profile.email ? (profile as any).email : 'student@atelier.edu'}</div>
            </div>
            <span className="badge badge-secondary">Active Academic Session</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) 0 0' }}>
            <div>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Sign Out</div>
              <div className="text-xs text-muted">Safely disconnect session on this workstation</div>
            </div>
            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', borderColor: 'color-mix(in srgb, var(--color-primary) 30%, transparent)' }}
            >
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
