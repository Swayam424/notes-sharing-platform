import { useOnChange } from '../hooks/useOnChange';
import { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, LogOut,
  SlidersHorizontal, Check, CheckCircle2, GraduationCap, School, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp, type UserSession } from '../context/appState';
import { api } from '../services/api';
import type { Subject } from '../data/mockData';
import { DEGREE_OPTIONS, STREAM_PRESETS, type DegreeOption } from '../data/degrees';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user: appUser, logout, updateAcademicProfile } = useApp();
  const [profile, setProfile] = useState<UserSession>(appUser as UserSession); // route is auth-guarded

  // Edit Mode for Academic Profile
  const [isEditing, setIsEditing] = useState(false);
  const [degree, setDegree] = useState(profile.degree || 'B.Tech / B.E.');
  const [stream, setStream] = useState(profile.stream || profile.department || 'Computer Science & Engineering');
  const [customStream, setCustomStream] = useState('');
  const [semester, setSemester] = useState<number>(profile.semester || 5);
  const [college, setCollege] = useState(profile.college || 'Apex Institute of Technology');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Curricular subjects for the selected stream & semester
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>(() => {
    return profile.enrolledSubjects && profile.enrolledSubjects.length > 0
      ? profile.enrolledSubjects
      : ['os', 'dbms', 'cn', 'toc', 'se'];
  });

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
      setCollege(appUser.college || 'Apex Institute of Technology');
      if (appUser.enrolledSubjects && appUser.enrolledSubjects.length > 0) {
        setEnrolledSubjects(appUser.enrolledSubjects);
      }
    }
  }, { onMount: true });

  // Load available subjects when stream or semester changes
  useEffect(() => {
    const effStream = stream === 'other' ? customStream.trim() : stream;
    api.getSubjects({ stream: effStream, semester })
      .then(subs => {
        setAvailableSubjects(subs);
      })
      .catch(console.error);
  }, [stream, customStream, semester]);

  const toggleSubject = (id: string) => {
    setEnrolledSubjects(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setEnrolledSubjects(availableSubjects.map(s => s.id));
  };

  const clearAll = () => {
    setEnrolledSubjects([]);
  };

  const handleSaveProfile = async () => {
    setError(null);
    const effStream = stream === 'other' ? customStream.trim() : stream;
    if (!effStream) {
      setError('Please provide a stream/branch name.');
      return;
    }
    if (enrolledSubjects.length === 0) {
      setError('Please select at least one course for your roster.');
      return;
    }

    try {
      setSaving(true);
      await updateAcademicProfile({
        degree: selectedDegreeObj.name,
        stream: effStream,
        department: effStream,
        college: college.trim() || 'Apex Institute of Technology',
        semester,
        enrolledSubjects,
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
  const enrolledCount = profile.enrolledSubjects?.length || 0;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Your course, subjects and account.</p>
      </div>

      {saveSuccess && (
        <div style={{
          background: 'color-mix(in srgb, var(--color-secondary) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent)',
          color: 'var(--color-secondary, var(--color-secondary))',
          padding: '12px 18px',
          borderRadius: '8px',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 500
        }}>
          <CheckCircle2 size={16} />
          Academic profile and course roster updated successfully! Study space is refreshed.
        </div>
      )}

      {/* Academic Identity & Profile Card */}
      <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <GraduationCap size={18} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
            <h3 style={{ fontSize: 'var(--text-md)', margin: 0 }}>Academic Identity & Curriculum Roster</h3>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isEditing ? (
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => setIsEditing(true)}
                style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <SlidersHorizontal size={13} /> Edit Academic Profile
              </button>
            ) : (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => { setIsEditing(false); setError(null); }}
                style={{ fontSize: '12px' }}
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="card-body">
          {!isEditing ? (
            /* Read-Only Profile View */
            <div>
              <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 15%, transparent), color-mix(in srgb, var(--color-secondary) 15%, transparent))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-primary)',
                  border: '1px solid var(--color-border, var(--color-border))'
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
                    <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <School size={12} /> {profile.college}
                    </span>
                    <span className="chip chip-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <BookOpen size={12} /> {enrolledCount} active courses
                    </span>
                  </div>
                </div>
              </div>

              {/* Enrolled Courses Summary */}
              {availableSubjects.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border-light, var(--color-base))' }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted, var(--color-muted))', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                    Active Course Roster (Semester {profile.semester}):
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {availableSubjects.filter(s => (profile.enrolledSubjects || []).includes(s.id)).map(s => (
                      <span
                        key={s.id}
                        className="chip"
                        style={{
                          background: 'var(--color-surface-alt, var(--color-base))',
                          border: '1px solid var(--color-border, var(--color-border))',
                          color: 'var(--color-deep, var(--color-deep))',
                          fontSize: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--color-primary, var(--color-primary))' }}>{s.code}</span>
                        <span>{s.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Interactive Edit Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {error && (
                <div style={{
                  background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  color: 'var(--color-primary, var(--color-primary))',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}>
                  {error}
                </div>
              )}

              {/* 1. Degree Program */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-deep)' }}>
                  Degree Program
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                  {DEGREE_OPTIONS.map(d => {
                    const isSelected = degree === d.name;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDegree(d.name)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid var(--color-primary, var(--color-primary))' : '1px solid var(--color-border, var(--color-border))',
                          background: isSelected ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-surface, #FFFFFF)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <div style={{ fontSize: '0.88rem', fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--color-primary, var(--color-primary))' : 'var(--color-deep)' }}>
                          {d.name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted, var(--color-muted))', marginTop: '2px' }}>
                          {d.durationLabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Stream / Department */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-deep)' }}>
                  Stream / Academic Branch
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '8px' }}>
                  {STREAM_PRESETS.map(p => {
                    const isSelected = stream === p.name;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setStream(p.name); setCustomStream(''); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: isSelected ? '1.5px solid var(--color-primary, var(--color-primary))' : '1px solid var(--color-border, var(--color-border))',
                          background: isSelected ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-surface, #FFFFFF)',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <span style={{ fontSize: '18px' }}>{p.icon}</span>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: isSelected ? 600 : 500, color: isSelected ? 'var(--color-primary, var(--color-primary))' : 'var(--color-deep)' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted, var(--color-muted))' }}>
                            {p.shortCode}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Semester Selection */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep)' }}>
                    Current Semester (1 – {totalSemesters})
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted, var(--color-muted))' }}>
                    {selectedDegreeObj.years} Years Total
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {semesterList.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSemester(s)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: s === semester ? 600 : 500,
                        border: s === semester ? '1.5px solid var(--color-primary, var(--color-primary))' : '1px solid var(--color-border, var(--color-border))',
                        background: s === semester ? 'var(--color-primary, var(--color-primary))' : 'var(--color-surface, #FFFFFF)',
                        color: s === semester ? '#FFFFFF' : 'var(--color-deep)',
                        cursor: 'pointer'
                      }}
                    >
                      Sem {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. College Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-deep)' }}>
                  College / University
                </label>
                <input
                  type="text"
                  className="input"
                  value={college}
                  onChange={e => setCollege(e.target.value)}
                  placeholder="e.g. Apex Institute of Technology"
                  style={{ width: '100%', maxWidth: '480px' }}
                />
              </div>

              {/* 5. Course Roster for Stream & Semester */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep)' }}>
                      Course Roster ({availableSubjects.length} subjects found)
                    </label>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-muted, var(--color-muted))', marginLeft: '8px' }}>
                      Selected {enrolledSubjects.length} courses
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={selectAll}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Select All
                    </button>
                    <span style={{ color: 'var(--color-border)' }}>•</span>
                    <button
                      type="button"
                      onClick={clearAll}
                      style={{ background: 'none', border: 'none', color: 'var(--color-muted)', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {availableSubjects.map(sub => {
                    const isChecked = enrolledSubjects.includes(sub.id);
                    return (
                      <div
                        key={sub.id}
                        onClick={() => toggleSubject(sub.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          borderRadius: '8px',
                          border: isChecked ? '1.5px solid var(--color-primary, var(--color-primary))' : '1px solid var(--color-border, var(--color-border))',
                          background: isChecked ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)' : 'var(--color-surface, #FFFFFF)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: isChecked ? 'var(--color-primary)' : 'var(--color-muted)' }}>
                            {sub.code} • {sub.scheme}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-deep)', marginTop: '2px' }}>
                            {sub.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-secondary, var(--color-secondary))', marginTop: '2px' }}>
                            {sub.coverage}% syllabus covered
                          </div>
                        </div>

                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '5px',
                          border: isChecked ? 'none' : '1.5px solid var(--color-border, var(--color-border))',
                          background: isChecked ? 'var(--color-primary, var(--color-primary))' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isChecked && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
          <h3 style={{ fontSize: 'var(--text-md)' }}>Account &amp; Session</h3>
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
