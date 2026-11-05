import StudyBackdrop from '../components/StudyBackdrop';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  GraduationCap, CheckCircle2, ArrowRight,
  Sparkles, School
} from 'lucide-react';
import { useApp } from '../context/appState';
import { api } from '../services/api';
import './onboarding.css';
import { DEGREE_OPTIONS, STREAM_PRESETS, type DegreeOption } from '../data/degrees';
export { DEGREE_OPTIONS, type DegreeOption };

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loginWithUser } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [degree, setDegree] = useState(user?.degree || 'B.Tech / B.E.');
  const [stream, setStream] = useState(user?.stream || 'Computer Science & Engineering');
  const [customStream, setCustomStream] = useState('');
  const [semester, setSemester] = useState<number>(user?.semester || 5);
  const [college, setCollege] = useState(user?.college && user.college !== 'Apex Institute of Technology' ? user.college : '');

  const selectedDegreeObj = useMemo(() => {
    return DEGREE_OPTIONS.find(d => d.name === degree || d.id === degree || d.shortName === degree) || DEGREE_OPTIONS[0];
  }, [degree]);

  const totalSemesters = selectedDegreeObj.totalSemesters;
  const semesterList = useMemo(() => {
    return Array.from({ length: totalSemesters }, (_, i) => i + 1);
  }, [totalSemesters]);

  // Clamp semester if changing degree shortens the curriculum
  if (semester > totalSemesters) {
    setSemester(totalSemesters);
  }

  const handleSkip = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.completeOnboarding({
        degree: user?.degree || 'B.Tech / B.E.',
        stream: user?.stream || 'Computer Science & Engineering',
        college: user?.college || 'University Institute of Technology',
        semester: user?.semester || 1,
        enrolledSubjects: [],
        academicGoal: ''
      });
      loginWithUser(res.user);
      navigate('/dashboard', { replace: true });
    } catch {
      navigate('/dashboard', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    setError(null);
    setLoading(true);

    const effectiveStream = stream === 'other' ? customStream.trim() : stream;
    if (!effectiveStream) {
      setError('Please specify your academic stream or branch.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.completeOnboarding({
        degree,
        stream: effectiveStream,
        college: college.trim() || 'University Campus',
        semester,
        enrolledSubjects: [],
        academicGoal: user?.academicGoal || ''
      });

      loginWithUser(res.user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to save academic profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-root">
      <StudyBackdrop />
      {/* Ambient background atmosphere */}
      <div className="onboarding-ambient" aria-hidden="true">
        <div className="onboarding-blob-1" />
        <div className="onboarding-blob-2" />
      </div>

      {/* Top Academic Brand Header */}
      <header className="onboarding-header">
        <div className="onboarding-brand">
          <div className="onboarding-emblem">
            <GraduationCap size={22} color="#FFFFFF" strokeWidth={2} />
          </div>
          <div>
            <div className="onboarding-brand-title">
              Atelier
            </div>
            <div className="onboarding-brand-sub">
              Academic Setup
            </div>
          </div>
        </div>

        {/* Profile Setup Badge */}
        <div className="onboarding-steps-container">
          <div className="onboarding-steps-pills">
            <div className="onboarding-step-pill active done">
              <Sparkles size={12} strokeWidth={2} />
              <span>Academic Profile</span>
            </div>
          </div>
          <div className="onboarding-progress-bar">
            <div
              className="onboarding-progress-fill"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </header>

      {/* Main Paper Card */}
      <main className="onboarding-card-wrapper">
        <div className="onboarding-card">
          {error && (
            <div style={{
              background: 'var(--color-danger-light, #FCEAEA)',
              border: '1px solid rgba(196, 84, 84, 0.35)',
              color: 'var(--color-danger, #C45454)',
              padding: '0.85rem 1.1rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {/* Academic Identity, Stream & Degree */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}>
            <div>
              <span className="step-eyebrow">
                <Sparkles size={12} /> Personalized Notes Experience
              </span>
              <h1 className="step-title">
                Confirm your course & department
              </h1>
              <p className="step-subtitle">
                Tailor note discovery, weekly peer activity, and examination papers to your degree and semester.
              </p>
            </div>

            {/* Degree Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, var(--color-deep))', marginBottom: '8px' }}>
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
                      <span className="degree-pill-tag">
                        {d.durationLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stream / Branch Cards */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, var(--color-deep))', marginBottom: '8px' }}>
                Branch / Department
              </label>
              <div className="stream-grid">
                {STREAM_PRESETS.map(p => {
                  const isSelected = stream === p.name;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setStream(p.name)}
                      className={`stream-card ${isSelected ? 'active' : ''}`}
                    >
                      <div className="stream-icon-wrap" style={{
                        background: isSelected ? 'var(--color-primary, #D95D39)' : 'var(--color-surface, #FFFFFF)',
                        color: isSelected ? '#FFFFFF' : 'var(--color-primary, #D95D39)'
                      }}>
                        <span style={{ fontSize: "18px" }}>{p.icon}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-deep, var(--color-deep))' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-muted, var(--color-muted))', marginTop: '2px' }}>
                          {p.desc}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 size={18} color="var(--color-primary, #D95D39)" style={{ marginTop: '2px', flexShrink: 0 }} />}
                    </div>
                  );
                })}
              </div>

              {/* Custom write-in toggle */}
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setStream('other')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: stream === 'other' ? 'var(--color-primary, var(--color-primary))' : 'var(--color-muted, var(--color-muted))',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                    fontWeight: 500
                  }}
                >
                  + Enter another branch or specialization
                </button>
                {stream === 'other' && (
                  <input
                    type="text"
                    placeholder="e.g. Chemical Engineering, Biotechnology, Robotics..."
                    value={customStream}
                    onChange={e => setCustomStream(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '8px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1.5px solid var(--color-primary, var(--color-primary))',
                      color: 'var(--color-deep, var(--color-deep))',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Semester & College */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, var(--color-deep))', margin: 0 }}>
                    Current Semester (1 – {totalSemesters})
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted, var(--color-muted))', fontWeight: 500 }}>
                    {selectedDegreeObj.years} Years • {totalSemesters} Semesters Total
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, var(--color-deep))', marginBottom: '8px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <School size={14} /> College / University
                  </span>
                </label>
                <input
                  type="text"
                  value={college}
                  onChange={e => setCollege(e.target.value)}
                  placeholder="Enter your college or university"
                  autoComplete="off"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    background: 'var(--color-surface, #FFFFFF)',
                    border: '1px solid var(--color-border, var(--color-border))',
                    color: 'var(--color-deep, var(--color-deep))',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Action Bar / Navigation Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--color-border-light, var(--color-border))',
            paddingTop: '1.5rem',
            marginTop: '2rem'
          }}>
            <button
              type="button"
              onClick={handleSkip}
              disabled={loading}
              className="nav-btn-back"
              style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}
            >
              Skip for now
            </button>

            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="nav-btn-finish"
            >
              {loading ? 'Setting up Workspace…' : 'Launch My Workspace'} <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
