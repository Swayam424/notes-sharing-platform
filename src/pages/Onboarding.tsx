import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  GraduationCap, BookOpen, Target, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, Check, School
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Subject } from '../data/mockData';
import './onboarding.css';

export interface DegreeOption {
  id: string;
  name: string;
  shortName: string;
  durationLabel: string;
  years: number;
  totalSemesters: number;
}

export const DEGREE_OPTIONS: DegreeOption[] = [
  { id: 'btech', name: 'B.Tech / B.E.', shortName: 'B.Tech', durationLabel: '4 Years • 8 Sems', years: 4, totalSemesters: 8 },
  { id: 'bca', name: 'BCA', shortName: 'BCA', durationLabel: '3 Years • 6 Sems', years: 3, totalSemesters: 6 },
  { id: 'mca', name: 'MCA', shortName: 'MCA', durationLabel: '2 Years • 4 Sems', years: 2, totalSemesters: 4 },
  { id: 'bsc', name: 'B.Sc Computer Science / IT', shortName: 'B.Sc', durationLabel: '3 Years • 6 Sems', years: 3, totalSemesters: 6 },
  { id: 'mtech', name: 'M.Tech / M.E.', shortName: 'M.Tech', durationLabel: '2 Years • 4 Sems', years: 2, totalSemesters: 4 },
  { id: 'diploma', name: 'Diploma (Polytechnic)', shortName: 'Diploma', durationLabel: '3 Years • 6 Sems', years: 3, totalSemesters: 6 },
  { id: 'dual', name: 'Integrated Dual Degree (B.Tech + M.Tech)', shortName: 'Dual Degree', durationLabel: '5 Years • 10 Sems', years: 5, totalSemesters: 10 }
];

const STREAM_PRESETS = [
  { id: 'cse', name: 'Computer Science & Engineering', icon: '💻', desc: 'Algorithms, OS, DBMS, Networks, Architecture' },
  { id: 'it', name: 'Information Technology', icon: '🌐', desc: 'Software engineering, Web, Cloud, Databases' },
  { id: 'ai_ds', name: 'AI & Data Science', icon: '🤖', desc: 'Machine Learning, Neural Networks, Big Data' },
  { id: 'ece', name: 'Electronics & Communication', icon: '⚡', desc: 'Signals, Microprocessors, VLSI, Embedded' },
  { id: 'ee', name: 'Electrical Engineering', icon: '🔋', desc: 'Power Systems, Control Theory, Machines' },
  { id: 'mech', name: 'Mechanical Engineering', icon: '⚙️', desc: 'Thermodynamics, Mechanics, CAD/CAM' },
];

const GOAL_OPTIONS = [
  {
    id: 'cgpa_topper',
    title: 'High CGPA & End-Semester Topper',
    tagline: 'Comprehensive coverage of all units, lecture notes, formulas, and errata verification.',
    badge: 'Comprehensive Mode',
  },
  {
    id: 'exam_revision',
    title: 'Fast Exam Revision & PYQ Numerical Drills',
    tagline: 'Focus on 5-year frequent exam questions, high-weightage topics, and speed summaries.',
    badge: 'Exam-Oriented',
  },
  {
    id: 'concept_mastery',
    title: 'Concept Mastery & Daily Coursework',
    tagline: 'Clean unit-by-unit explanations, diagrams, and assignments review for deep understanding.',
    badge: 'Foundation First',
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loginWithUser } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [slideDir, setSlideDir] = useState<'forward' | 'backward'>('forward');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [degree, setDegree] = useState(user?.degree || 'B.Tech / B.E.');
  const [stream, setStream] = useState(user?.stream || 'Computer Science & Engineering');
  const [customStream, setCustomStream] = useState('');
  const [semester, setSemester] = useState<number>(user?.semester || 5);
  const [college, setCollege] = useState(user?.college || 'Apex Institute of Technology');

  const selectedDegreeObj = useMemo(() => {
    return DEGREE_OPTIONS.find(d => d.name === degree || d.id === degree || d.shortName === degree) || DEGREE_OPTIONS[0];
  }, [degree]);

  const totalSemesters = selectedDegreeObj.totalSemesters;
  const semesterList = useMemo(() => {
    return Array.from({ length: totalSemesters }, (_, i) => i + 1);
  }, [totalSemesters]);

  // When degree changes, clamp current semester if it exceeds the new total semesters
  useEffect(() => {
    if (semester > totalSemesters) {
      setSemester(totalSemesters);
    }
  }, [totalSemesters, semester]);

  // Subjects & Goals
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() => {
    if (user?.enrolledSubjects && user.enrolledSubjects.length > 0) {
      return user.enrolledSubjects;
    }
    return ['os', 'dbms', 'cn', 'toc', 'se'];
  });
  const [academicGoal, setAcademicGoal] = useState<string>(user?.academicGoal || 'High CGPA & End-Semester Topper');

  useEffect(() => {
    api.getSubjects().then(subs => {
      setAvailableSubjects(subs);
      if (!user?.enrolledSubjects || user.enrolledSubjects.length === 0) {
        setSelectedSubjects(subs.map(s => s.id));
      }
    }).catch(console.error);
  }, [user]);

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllSubjects = () => {
    setSelectedSubjects(availableSubjects.map(s => s.id));
  };

  const goToNextStep = () => {
    if (step === 1) {
      const effectiveStream = stream === 'other' ? customStream.trim() : stream;
      if (!effectiveStream) {
        setError('Please enter or select your branch/stream.');
        return;
      }
    }
    setError(null);
    setSlideDir('forward');
    setStep(s => (s + 1) as any);
  };

  const goToPrevStep = () => {
    setError(null);
    setSlideDir('backward');
    setStep(s => (s - 1) as any);
  };

  const handleFinish = async () => {
    setError(null);
    setLoading(true);

    const effectiveStream = stream === 'other' ? customStream.trim() : stream;
    if (!effectiveStream) {
      setError('Please specify your academic stream or branch.');
      setLoading(false);
      setStep(1);
      return;
    }

    if (selectedSubjects.length === 0) {
      setError('Please select at least one active subject for your semester studio.');
      setLoading(false);
      setStep(2);
      return;
    }

    try {
      const res = await api.completeOnboarding({
        degree,
        stream: effectiveStream,
        college: college.trim() || 'Apex Institute of Technology',
        semester,
        enrolledSubjects: selectedSubjects,
        academicGoal
      });

      loginWithUser(res.user);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to save academic profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="onboarding-root">
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
              Atelier <span style={{ color: 'var(--color-primary, #D95D39)' }}>Notes</span>
            </div>
            <div className="onboarding-brand-sub">
              Academic Studio Personalization
            </div>
          </div>
        </div>

        {/* Step Indicator with Progress Bar */}
        <div className="onboarding-steps-container">
          <div className="onboarding-steps-pills">
            {[
              { num: 1, label: 'Stream & Degree' },
              { num: 2, label: 'Course Roster' },
              { num: 3, label: 'Study Target' }
            ].map(s => {
              const isCurrent = step === s.num;
              const isDone = step > s.num;
              return (
                <div
                  key={s.num}
                  className={`onboarding-step-pill ${isCurrent ? 'active' : ''} ${isDone ? 'done' : ''}`}
                >
                  {isDone ? <Check size={12} strokeWidth={3} /> : <span>{s.num}</span>}
                  <span>{s.label}</span>
                </div>
              );
            })}
          </div>
          <div className="onboarding-progress-bar">
            <div
              className="onboarding-progress-fill"
              style={{ width: `${progressPct}%` }}
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

          {/* STEP 1: Academic Identity, Stream & Degree */}
          {step === 1 && (
            <div
              key="step-1"
              className={`slide-${slideDir}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}
            >
              <div>
                <span className="step-eyebrow">
                  <Sparkles size={12} /> Step 1 of 3: Academic Profile
                </span>
                <h1 className="step-title">
                  What stream are you studying?
                </h1>
                <p className="step-subtitle">
                  We curate your note feeds, topic syllabus coverage, and university PYQ papers specifically to your branch.
                </p>
              </div>

              {/* Degree Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, #1F2421)', marginBottom: '8px' }}>
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, #1F2421)', marginBottom: '8px' }}>
                  Branch / Department
                </label>
                <div className="stream-grid">
                  {STREAM_PRESETS.map(p => {
                    const isSelected = stream === p.name;
                    return (
                      <div
                        key={p.id}
                        onClick={() => { setStream(p.name); setCustomStream(''); }}
                        className={`stream-card ${isSelected ? 'selected' : ''}`}
                      >
                        <span className="stream-icon-box">
                          {p.icon}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            color: isSelected ? 'var(--color-primary, #D95D39)' : 'var(--color-deep, #1F2421)'
                          }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted, #706B63)', marginTop: '4px', lineHeight: 1.35 }}>
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
                      color: stream === 'other' ? 'var(--color-primary, #D95D39)' : 'var(--color-muted, #706B63)',
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
                        border: '1.5px solid var(--color-primary, #D95D39)',
                        color: 'var(--color-deep, #1F2421)',
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, #1F2421)', margin: 0 }}>
                      Current Semester (1 – {totalSemesters})
                    </label>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted, #706B63)', fontWeight: 500 }}>
                      {selectedDegreeObj.years} Years • {totalSemesters} Semesters
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, #1F2421)', marginBottom: '8px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <School size={14} /> College / University
                    </span>
                  </label>
                  <input
                    type="text"
                    value={college}
                    onChange={e => setCollege(e.target.value)}
                    placeholder="e.g. Apex Institute of Technology"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '8px',
                      background: 'var(--color-surface, #FFFFFF)',
                      border: '1px solid var(--color-border, #E8E5DF)',
                      color: 'var(--color-deep, #1F2421)',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Subject & Curriculum Enrolment */}
          {step === 2 && (
            <div
              key="step-2"
              className={`slide-${slideDir}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span className="step-eyebrow">
                    <BookOpen size={12} /> Step 2 of 3: Subject Selection
                  </span>
                  <h1 className="step-title">
                    Which subjects are on your roster?
                  </h1>
                  <p className="step-subtitle">
                    Select your active courses. Your workspace will prioritize topic outlines, notes, and pyqs for these subjects.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={selectAllSubjects}
                  style={{
                    background: 'var(--color-primary-light, #FDF0EC)',
                    border: '1px solid var(--color-primary, #D95D39)',
                    color: 'var(--color-primary, #D95D39)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 150ms ease'
                  }}
                >
                  Select All Recommended ({availableSubjects.length})
                </button>
              </div>

              {/* Subject Cards Grid with micro-animations */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                gap: '14px',
                maxHeight: '420px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}>
                {availableSubjects.map(sub => {
                  const isChecked = selectedSubjects.includes(sub.id);
                  const totalTopics = sub.units.reduce((acc: number, u) => acc + (u.topics?.length || 0), 0);

                  return (
                    <div
                      key={sub.id}
                      onClick={() => toggleSubject(sub.id)}
                      className={`course-card ${isChecked ? 'selected' : ''}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            background: 'var(--color-surface-alt, #F2EFE9)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            color: 'var(--color-deep, #1F2421)',
                            fontFamily: 'var(--font-mono, monospace)'
                          }}>
                            {sub.code}
                          </span>
                          <h3 style={{
                            margin: '8px 0 0',
                            fontSize: '0.96rem',
                            fontWeight: 600,
                            color: isChecked ? 'var(--color-primary, #D95D39)' : 'var(--color-deep, #1F2421)'
                          }}>
                            {sub.name}
                          </h3>
                        </div>
                        <div className="course-checkbox">
                          {isChecked && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.75rem',
                        color: 'var(--color-muted, #706B63)',
                        borderTop: '1px solid var(--color-border-light, #F0EDE7)',
                        paddingTop: '8px'
                      }}>
                        <span>{sub.units.length} Units • {totalTopics} Topics</span>
                        <span style={{ color: 'var(--color-secondary, #2F5233)', fontWeight: 600 }}>
                          {sub.coverage}% Covered
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                background: 'var(--color-surface-alt, #F2EFE9)',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid var(--color-border, #E8E5DF)'
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-deep, #1F2421)' }}>
                  Selected <strong>{selectedSubjects.length} of {availableSubjects.length}</strong> subjects for Semester {semester}
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-muted, #706B63)' }}>
                  Adjustable anytime in Settings
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Study Focus & Exam Target */}
          {step === 3 && (
            <div
              key="step-3"
              className={`slide-${slideDir}`}
              style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}
            >
              <div>
                <span className="step-eyebrow">
                  <Target size={12} /> Step 3 of 3: Study Objective
                </span>
                <h1 className="step-title">
                  What is your primary study objective?
                </h1>
                <p className="step-subtitle">
                  This shapes which quick topics, frequent exam streaks, and peer notes take priority on your study desk.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {GOAL_OPTIONS.map(g => {
                  const isSelected = academicGoal === g.title;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setAcademicGoal(g.title)}
                      className={`goal-card ${isSelected ? 'selected' : ''}`}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isSelected ? 'rgba(217, 93, 57, 0.15)' : 'var(--color-surface-alt, #F2EFE9)',
                            color: isSelected ? 'var(--color-primary, #D95D39)' : 'var(--color-deep, #1F2421)'
                          }}>
                            {g.badge}
                          </span>
                          <h3 style={{
                            margin: 0,
                            fontSize: '1rem',
                            fontWeight: 600,
                            color: isSelected ? 'var(--color-primary, #D95D39)' : 'var(--color-deep, #1F2421)'
                          }}>
                            {g.title}
                          </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--color-muted, #706B63)', lineHeight: 1.4 }}>
                          {g.tagline}
                        </p>
                      </div>

                      <div className="goal-radio">
                        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Paper Deck */}
              <div style={{
                background: 'var(--color-surface-alt, #F2EFE9)',
                borderRadius: '10px',
                border: '1px solid var(--color-border, #E8E5DF)',
                padding: '16px 20px',
                marginTop: 'auto'
              }}>
                <div style={{
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-primary, #D95D39)',
                  fontWeight: 600,
                  marginBottom: '6px'
                }}>
                  Configured Study Space:
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-deep, #1F2421)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  flexWrap: 'wrap'
                }}>
                  <span><strong>{selectedDegreeObj.name} ({selectedDegreeObj.years} Years)</strong></span>
                  <span>•</span>
                  <span><strong>{stream === 'other' ? (customStream || 'Custom Branch') : stream}</strong></span>
                  <span>•</span>
                  <span><strong>Semester {semester} of {totalSemesters}</strong></span>
                  <span>•</span>
                  <span><strong>{selectedSubjects.length} enrolled subjects</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar / Navigation Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--color-border-light, #F0EDE7)',
            paddingTop: '1.5rem',
            marginTop: '2rem'
          }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={goToPrevStep}
                disabled={loading}
                className="nav-btn-back"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="nav-btn-next"
              >
                Continue to {step === 1 ? 'Subjects' : 'Study Target'} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                className="nav-btn-finish"
              >
                {loading ? 'Setting up Workspace…' : 'Launch My Study Space'} <ArrowRight size={18} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
