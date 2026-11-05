import { useOnChange } from '../hooks/useOnChange';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { ArrowRight, X, Eye, EyeOff, Check } from 'lucide-react';
import { useApp } from '../context/appState';
import { api, type AuthUser } from '../services/api';
import StudyBackdrop from '../components/StudyBackdrop';
import { DEGREE_OPTIONS, STREAM_PRESETS, type DegreeOption } from '../data/degrees';
import './landing.css';

type AuthTab = 'signin' | 'signup';

const SPECIMEN_UNITS = [
  {
    name: 'Unit 3 · Memory Management',
    topics: [
      { name: 'Paging & page tables', notes: 14, years: ['22', '23', '24'], state: 'covered' },
      { name: 'Segmentation', notes: 6, years: ['23'], state: 'covered' },
      { name: 'TLB & effective access time', notes: 2, years: ['22', '24', '25'], state: 'thin' },
      { name: 'Belady’s anomaly', notes: 0, years: ['24'], state: 'gap' },
    ],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, loginWithUser } = useApp();

  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>('signin');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    degree: 'B.Tech / B.E.',
    stream: 'Computer Science & Engineering',
    customStream: '',
    semester: 5,
    college: '',
    role: 'student' as 'student' | 'moderator'
  });

  const selectedDegreeObj: DegreeOption = useMemo(() => {
    return DEGREE_OPTIONS.find(d => d.name === form.degree || d.id === form.degree) || DEGREE_OPTIONS[0];
  }, [form.degree]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // ?auth=signin|signup (from protected routes) opens the dialog, then is stripped from the URL
  const authParam = searchParams.get('auth');
  useOnChange(authParam, () => {
    if (authParam === 'signin' || authParam === 'signup') {
      setAuthTab(authParam);
      setAuthOpen(true);
    }
  }, { onMount: true });
  useEffect(() => {
    if (authParam) setSearchParams({}, { replace: true });
  }, [authParam, setSearchParams]);

  useEffect(() => {
    if (!authOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAuthOpen(false); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [authOpen, authTab]);

  const openAuth = (tab: AuthTab) => {
    if (isAuthenticated) {
      const isMod = user?.role?.toLowerCase() === 'moderator' || user?.role?.toLowerCase() === 'admin';
      return navigate(isMod ? '/admin/moderation' : '/dashboard');
    }
    setAuthTab(tab);
    setAuthError(null);
    setForm({
      name: '',
      email: '',
      password: '',
      degree: 'B.Tech / B.E.',
      stream: 'Computer Science & Engineering',
      customStream: '',
      semester: 5,
      college: '',
      role: 'student' as 'student' | 'moderator'
    });
    setAuthOpen(true);
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authTab === 'signup') {
      if (!form.name.trim()) {
        setAuthError('Please enter your full name.');
        return;
      }
      if (form.password.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
      }
    }

    setSubmitting(true);
    if (authTab === 'signup' && form.stream === 'other' && !form.customStream.trim()) {
      setAuthError('Please specify your academic branch or specialization.');
      return;
    }

    try {
      const effectiveStream = form.stream === 'other' ? form.customStream.trim() : form.stream;
      const result: { user: AuthUser } = authTab === 'signup'
        ? await api.signup({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
            degree: form.degree,
            stream: effectiveStream,
            department: effectiveStream,
            semester: form.semester,
            college: form.college.trim() || 'University Institute of Technology',
            role: form.role
          })
        : await api.login(form.email.trim(), form.password);
      loginWithUser(result.user);
      setAuthOpen(false);

      const isMod = result.user.role?.toLowerCase() === 'moderator' || result.user.role?.toLowerCase() === 'admin';
      if (isMod) {
        navigate('/admin/moderation');
      } else {
        navigate(result.user.onboardingCompleted ? '/dashboard' : '/onboarding');
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-container lp-nav__inner">
          <Link to="/" className="lp-brand" aria-label="Atelier home">
            <span className="brand-mark" aria-hidden="true">A</span>
            <span>Atelier</span>
          </Link>
          <nav className="lp-nav__links" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#features">What’s inside</a>
          </nav>
          <div className="lp-nav__actions">
            {isAuthenticated ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  const isMod = user?.role?.toLowerCase() === 'moderator' || user?.role?.toLowerCase() === 'admin';
                  navigate(isMod ? '/admin/moderation' : '/dashboard');
                }}
              >
                {user?.role?.toLowerCase() === 'moderator' || user?.role?.toLowerCase() === 'admin'
                  ? 'Open Mod Desk'
                  : 'Open study space'} <ArrowRight size={14} />
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openAuth('signin')}>Sign in</button>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => openAuth('signup')}>Get started</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <div className="lp-hero-wrap">
        <StudyBackdrop />
        <section className="lp-hero lp-container">
          <div className="lp-hero__copy">
            <p className="eyebrow lp-reveal">For university students · Free</p>
            <h1 className="lp-hero__title lp-reveal">
              Notes that follow <mark>your syllabus</mark>, not someone else’s.
            </h1>
            <p className="lp-hero__lede lp-reveal">
              Atelier maps every shared note and past paper to the exact unit and topic in your course,
              so you can see what’s covered, what keeps showing up in exams, and what nobody has written yet.
            </p>
            <div className="lp-hero__cta lp-reveal">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => openAuth('signup')}>
                {isAuthenticated ? `Continue as ${user?.name?.split(' ')[0] ?? 'you'}` : 'Create your study space'}
                <ArrowRight size={16} />
              </button>
              <a href="#how" className="btn btn-secondary btn-lg">See how it works</a>
            </div>
          </div>

          <figure className="lp-specimen lp-reveal" aria-label="Preview of a syllabus coverage view">
            <div className="lp-specimen__bar">
              <span className="mono">CS501 · Operating Systems</span>
              <span className="lp-specimen__score"><span className="mono">78%</span> covered</span>
            </div>
            {SPECIMEN_UNITS.map(unit => (
              <div key={unit.name} className="lp-specimen__unit">
                <div className="lp-specimen__unit-name">{unit.name}</div>
                <ul>
                  {unit.topics.map(t => (
                    <li key={t.name} className={`lp-topic lp-topic--${t.state}`}>
                      <span className="lp-topic__dot" aria-hidden="true" />
                      <span className="lp-topic__name">{t.name}</span>
                      <span className="lp-topic__years mono" aria-label={`Asked in ${t.years.map(y => `20${y}`).join(', ')}`}>
                        {t.years.map(y => <span key={y}>’{y}</span>)}
                      </span>
                      <span className="lp-topic__notes mono">
                        {t.notes === 0 ? 'no notes' : `${t.notes} notes`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <figcaption className="lp-specimen__caption">
              <span className="lp-topic__dot lp-topic--gap-dot" aria-hidden="true" />
              Belady’s anomaly was asked in 2024 and has no notes yet. Someone in your batch can fix that.
            </figcaption>
          </figure>
        </section>
        </div>

        <section id="how" className="lp-section lp-container">
          <div className="lp-section__head">
            <p className="eyebrow">How it works</p>
            <h2>Three steps from “what do I study” to “done”.</h2>
          </div>
          <ol className="lp-steps">
            <li>
              <span className="lp-steps__num mono">01</span>
              <h3>Pick your course</h3>
              <p>Choose your degree, stream and semester. Your subjects, units and topics load from the official scheme.</p>
            </li>
            <li>
              <span className="lp-steps__num mono">02</span>
              <h3>See the gaps</h3>
              <p>Every topic shows how many notes exist and which years it appeared in the exam. Thin spots stand out.</p>
            </li>
            <li>
              <span className="lp-steps__num mono">03</span>
              <h3>Fill them together</h3>
              <p>Upload what you have, request what you don’t. Moderators keep the library clean and correct.</p>
            </li>
          </ol>
        </section>

        <section id="features" className="lp-section lp-container">
          <div className="lp-section__head">
            <p className="eyebrow">What’s inside</p>
            <h2>Built around how exams actually work.</h2>
          </div>
          <div className="lp-features">
            <article className="lp-feature lp-feature--wide">
              <h3>Past papers, cross-referenced</h3>
              <p>
                Each question in the archive is tagged to a syllabus topic, so a topic page shows every year it was asked,
                and the notes that answer it sit right next to it.
              </p>
              <div className="lp-yearline" aria-hidden="true">
                {['2019', '2020', '2021', '2022', '2023', '2024', '2025'].map((y, i) => (
                  <span key={y} className={[1, 3, 4, 6].includes(i) ? 'is-hit' : ''}>{y}</span>
                ))}
              </div>
            </article>
            <article className="lp-feature">
              <h3>A study assistant that knows your course</h3>
              <p>Ask about a topic and get an explanation grounded in your syllabus, with links to the notes that cover it.</p>
            </article>
            <article className="lp-feature">
              <h3>Your library, in one place</h3>
              <p>Save notes and papers, pick up where you left off, and keep track of what you’ve already read.</p>
            </article>
            <article className="lp-feature">
              <h3>Moderated, not a free-for-all</h3>
              <p>Reports go to real moderators. Wrong or off-topic material gets pulled before it costs anyone marks.</p>
            </article>
            <article className="lp-feature">
              <h3>Requests</h3>
              <p>Missing a derivation from last Tuesday? Post a request and whoever has it can link it in seconds.</p>
            </article>
          </div>
        </section>

        <section className="lp-cta">
          <div className="lp-container lp-cta__inner">
            <h2>Your next exam has a syllabus. Study to it.</h2>
            <button type="button" className="btn btn-lg lp-cta__btn" onClick={() => openAuth('signup')}>
              Get started, it’s free <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>

      <footer className="lp-footer lp-container">
        <span className="lp-brand lp-brand--small"><span className="brand-mark" aria-hidden="true">A</span>Atelier</span>
        <span className="mono">Made by students, for students.</span>
      </footer>

      {authOpen && (
        <div className="sheet-overlay" onMouseDown={e => e.target === e.currentTarget && setAuthOpen(false)}>
          <div className="sheet lp-auth" role="dialog" aria-modal="true" aria-labelledby="auth-title" ref={dialogRef}>
            <div className="sheet__header">
              <div>
                <h2 className="sheet__title" id="auth-title">
                  {authTab === 'signin' ? 'Welcome back' : 'Create your study space'}
                </h2>
                <p className="sheet__subtitle">
                  {authTab === 'signin' ? 'Sign in to pick up where you left off.' : 'Choose your degree, department & course roster.'}
                </p>
              </div>
              <button type="button" className="icon-button" onClick={() => setAuthOpen(false)} aria-label="Close">
                <X size={16} />
              </button>
            </div>

            <div className="lp-auth__tabs" role="tablist">
              <button type="button" role="tab" aria-selected={authTab === 'signin'} onClick={() => { setAuthTab('signin'); setAuthError(null); }}>Sign in</button>
              <button type="button" role="tab" aria-selected={authTab === 'signup'} onClick={() => { setAuthTab('signup'); setAuthError(null); }}>Create account</button>
            </div>

            <form className="sheet__body" onSubmit={handleSubmit}>
              {authTab === 'signup' && (
                <>
                  <div className="lp-auth__section-header">
                    <span className="lp-auth__section-tag">1</span>
                    <span className="lp-auth__section-title">Account Details &amp; Role</span>
                  </div>
                  <div className="field">
                    <span className="field__label">Account Role</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                      <button
                        type="button"
                        className={`degree-pill-btn ${form.role === 'student' ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, role: 'student' })}
                        style={{ padding: '8px 12px', justifyContent: 'center' }}
                      >
                        <span>Student</span>
                      </button>
                      <button
                        type="button"
                        className={`degree-pill-btn ${form.role === 'moderator' ? 'active' : ''}`}
                        onClick={() => setForm({ ...form, role: 'moderator' })}
                        style={{ padding: '8px 12px', justifyContent: 'center' }}
                      >
                        <span>Moderator / Staff</span>
                      </button>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px', display: 'block' }}>
                      {form.role === 'moderator'
                        ? '🛡️ Gives access to flagged note inspection and community moderation desk.'
                        : '📚 Student access to notes, past papers, AI assistant, and weekly activity tracker.'}
                    </span>
                  </div>
                  <label className="field">
                    <span className="field__label">Full name</span>
                    <input
                      type="text"
                      autoComplete="name"
                      required
                      maxLength={80}
                      placeholder="e.g. Swayam Mallick"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                    />
                  </label>
                </>
              )}
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@college.edu"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <label className="field">
                <span className="field__label">Password</span>
                <div className="field__password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={authTab === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={authTab === 'signup' ? 6 : undefined}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder={authTab === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  />
                  <button
                    type="button"
                    className="field__toggle-visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {authTab === 'signup' && (
                  <div className="field__hint" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{
                      color: form.password.length >= 6 ? 'var(--color-secondary, #2E7D32)' : 'var(--color-muted)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: form.password.length >= 6 ? 600 : 400
                    }}>
                      {form.password.length >= 6 ? (
                        <><Check size={13} strokeWidth={2.5} /> Password meets requirements</>
                      ) : (
                        '• Minimum 6 characters'
                      )}
                    </span>
                  </div>
                )}
              </label>

              {authTab === 'signup' && (
                <>
                  <div className="lp-auth__section-header" style={{ marginTop: '8px' }}>
                    <span className="lp-auth__section-tag">2</span>
                    <span className="lp-auth__section-title">Academic Program & Course</span>
                  </div>

                  <div className="field-row">
                    <label className="field">
                      <span className="field__label">Degree Program</span>
                      <select
                        value={form.degree}
                        onChange={e => {
                          const newDeg = e.target.value;
                          const degObj = DEGREE_OPTIONS.find(d => d.name === newDeg) || DEGREE_OPTIONS[0];
                          setForm({
                            ...form,
                            degree: newDeg,
                            semester: Math.min(form.semester, degObj.totalSemesters)
                          });
                        }}
                      >
                        {DEGREE_OPTIONS.map(d => (
                          <option key={d.id} value={d.name}>{d.name} ({d.durationLabel})</option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span className="field__label">Branch / Department</span>
                      <select
                        value={form.stream}
                        onChange={e => setForm({ ...form, stream: e.target.value })}
                      >
                        {STREAM_PRESETS.map(s => (
                          <option key={s.id} value={s.name}>{s.name} ({s.shortCode})</option>
                        ))}
                        <option value="other">Other / Custom Branch</option>
                      </select>
                    </label>
                  </div>

                  {form.stream === 'other' && (
                    <label className="field">
                      <span className="field__label">Specify Your Branch / Department</span>
                      <input
                        type="text"
                        placeholder="e.g. Chemical Engineering, Biotechnology..."
                        value={form.customStream}
                        onChange={e => setForm({ ...form, customStream: e.target.value })}
                        required
                      />
                    </label>
                  )}

                  <div className="field-row">
                    <label className="field">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span className="field__label">Current Semester</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                          S1–S{selectedDegreeObj.totalSemesters}
                        </span>
                      </div>
                      <div className="lp-sem-selector">
                        {Array.from({ length: selectedDegreeObj.totalSemesters }, (_, i) => i + 1).map(sem => (
                          <button
                            key={sem}
                            type="button"
                            className={`lp-sem-btn ${form.semester === sem ? 'active' : ''}`}
                            onClick={() => setForm({ ...form, semester: sem })}
                          >
                            S{sem}
                          </button>
                        ))}
                      </div>
                    </label>

                    <label className="field">
                      <span className="field__label">College / University</span>
                      <input
                        type="text"
                        placeholder="e.g. Apex Institute of Technology"
                        value={form.college}
                        onChange={e => setForm({ ...form, college: e.target.value })}
                      />
                    </label>
                  </div>
                </>
              )}

              {authError && (
                <div className="form-error-box" role="alert">
                  <p className="form-error">{authError}</p>
                  {authError.toLowerCase().includes('already exists') && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '8px', width: '100%' }}
                      onClick={() => {
                        setAuthTab('signin');
                        setAuthError(null);
                      }}
                    >
                      Switch to Sign In →
                    </button>
                  )}
                  {(authError.toLowerCase().includes('create an account') || authError.toLowerCase().includes('no account exists')) && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '8px', width: '100%' }}
                      onClick={() => {
                        setAuthTab('signup');
                        setAuthError(null);
                      }}
                    >
                      Create an Account →
                    </button>
                  )}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'One moment…' : authTab === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
