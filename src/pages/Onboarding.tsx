import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  GraduationCap, BookOpen, Target, CheckCircle2, ArrowRight, ArrowLeft,
  Sparkles, Check, School
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Subject } from '../data/mockData';

const DEGREE_OPTIONS = [
  'B.Tech / B.E.',
  'BCA / MCA',
  'B.Sc Computer Science / IT',
  'M.Tech',
  'Diploma in Engineering',
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
    accent: '#2563eb'
  },
  {
    id: 'exam_revision',
    title: 'Fast Exam Revision & PYQ Numerical Drills',
    tagline: 'Focus on 5-year frequent exam questions, high-weightage topics, and speed summaries.',
    badge: 'Exam-Oriented',
    accent: '#c84b28'
  },
  {
    id: 'concept_mastery',
    title: 'Concept Mastery & Daily Coursework',
    tagline: 'Clean unit-by-unit explanations, diagrams, and assignments review for deep understanding.',
    badge: 'Foundation First',
    accent: '#059669'
  }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, loginWithUser } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [degree, setDegree] = useState(user?.degree || 'B.Tech / B.E.');
  const [stream, setStream] = useState(user?.stream || 'Computer Science & Engineering');
  const [customStream, setCustomStream] = useState('');
  const [semester, setSemester] = useState<number>(user?.semester || 5);
  const [college, setCollege] = useState(user?.college || 'Apex Institute of Technology');

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
      // If user had no selection, preset all available
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

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 50% 20%, rgba(200, 75, 40, 0.08) 0%, #0e1117 65%)',
      color: '#f8fafc',
      fontFamily: 'var(--font-sans, system-ui, sans-serif)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2rem 1.5rem',
      position: 'relative'
    }}>
      {/* Top Brand Bar */}
      <header style={{
        maxWidth: '880px',
        width: '100%',
        margin: '0 auto 2.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #c84b28, #e06847)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(200, 75, 40, 0.35)'
          }}>
            <GraduationCap size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
              Atelier <span style={{ color: '#c84b28' }}>Notes</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Academic Workspace Setup
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[
            { num: 1, label: 'Stream' },
            { num: 2, label: 'Subjects' },
            { num: 3, label: 'Target' }
          ].map(s => {
            const isCurrent = step === s.num;
            const isDone = step > s.num;
            return (
              <div
                key={s.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isCurrent ? 'rgba(200, 75, 40, 0.2)' : isDone ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  border: isCurrent ? '1px solid #c84b28' : isDone ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                  color: isCurrent ? '#f97316' : isDone ? '#4ade80' : '#64748b',
                  transition: 'all 0.2s ease'
                }}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : <span>{s.num}</span>}
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Container Card */}
      <main style={{
        maxWidth: '880px',
        width: '100%',
        margin: '0 auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          background: 'rgba(23, 27, 36, 0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '18px',
          padding: '2.5rem',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              color: '#fca5a5',
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          {/* STEP 1: Academic Identity, Stream & Degree */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#c84b28',
                  marginBottom: '6px'
                }}>
                  <Sparkles size={13} /> Step 1 of 3: Academic Profile
                </span>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                  What stream are you studying?
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
                  We tailor your notes feed, syllabus breakdown, and PYQ archive specifically to your academic branch.
                </p>
              </div>

              {/* Degree Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                  Degree Program
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DEGREE_OPTIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDegree(d)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: degree === d ? 600 : 500,
                        background: degree === d ? 'rgba(200, 75, 40, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                        border: degree === d ? '1px solid #c84b28' : '1px solid rgba(255, 255, 255, 0.08)',
                        color: degree === d ? '#ffedd5' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stream / Branch Cards */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                  Branch / Department
                </label>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '12px'
                }}>
                  {STREAM_PRESETS.map(p => {
                    const isSelected = stream === p.name;
                    return (
                      <div
                        key={p.id}
                        onClick={() => { setStream(p.name); setCustomStream(''); }}
                        style={{
                          padding: '14px 16px',
                          borderRadius: '12px',
                          background: isSelected ? 'rgba(200, 75, 40, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                          border: isSelected ? '1.5px solid #c84b28' : '1px solid rgba(255, 255, 255, 0.08)',
                          cursor: 'pointer',
                          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}
                      >
                        <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: isSelected ? '#ffedd5' : '#e2e8f0' }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', lineHeight: 1.35 }}>
                            {p.desc}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 size={18} color="#c84b28" style={{ marginTop: '2px' }} />}
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
                      color: stream === 'other' ? '#f97316' : '#94a3b8',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0
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
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(200, 75, 40, 0.6)',
                        color: '#fff',
                        fontSize: '0.88rem'
                      }}
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Semester & College */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                    Current Semester (1 – 8)
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setSemester(sem)}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          background: semester === sem ? '#c84b28' : 'rgba(255, 255, 255, 0.05)',
                          border: semester === sem ? '1px solid #ff7b54' : '1px solid rgba(255, 255, 255, 0.08)',
                          color: '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        S{sem}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
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
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#fff',
                      fontSize: '0.88rem'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Subject & Curriculum Enrolment */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#c84b28',
                    marginBottom: '6px'
                  }}>
                    <BookOpen size={13} /> Step 2 of 3: Subject Selection
                  </span>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                    Which subjects are on your roster?
                  </h1>
                  <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
                    Select your active courses. Your dashboard will only display topics, notes, and pyqs for these subjects.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={selectAllSubjects}
                  style={{
                    background: 'rgba(200, 75, 40, 0.15)',
                    border: '1px solid rgba(200, 75, 40, 0.4)',
                    color: '#f97316',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Select All Recommended ({availableSubjects.length})
                </button>
              </div>

              {/* Subject Cards Grid */}
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
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: isChecked ? 'rgba(200, 75, 40, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                        border: isChecked ? '1.5px solid #c84b28' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div>
                          <span style={{
                            display: 'inline-block',
                            background: 'rgba(255, 255, 255, 0.08)',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            color: '#e2e8f0',
                            fontFamily: 'monospace'
                          }}>
                            {sub.code}
                          </span>
                          <h3 style={{ margin: '8px 0 0', fontSize: '0.98rem', fontWeight: 600, color: isChecked ? '#ffedd5' : '#f8fafc' }}>
                            {sub.name}
                          </h3>
                        </div>
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: isChecked ? '2px solid #c84b28' : '2px solid rgba(255, 255, 255, 0.2)',
                          background: isChecked ? '#c84b28' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {isChecked && <Check size={14} color="#fff" strokeWidth={3} />}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '8px' }}>
                        <span>{sub.units.length} Units • {totalTopics} Topics</span>
                        <span style={{ color: '#4ade80' }}>{sub.coverage}% Covered</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px dashed rgba(255, 255, 255, 0.1)'
              }}>
                <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                  Selected <strong>{selectedSubjects.length} of {availableSubjects.length}</strong> subjects for Semester {semester}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  You can modify enrolled subjects anytime in Settings
                </span>
              </div>
            </div>
          )}

          {/* STEP 3: Study Focus & Exam Target */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#c84b28',
                  marginBottom: '6px'
                }}>
                  <Target size={13} /> Step 3 of 3: Study Objective
                </span>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                  What is your primary study objective?
                </h1>
                <p style={{ color: '#94a3b8', fontSize: '0.92rem', margin: 0 }}>
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
                      style={{
                        padding: '18px 20px',
                        borderRadius: '14px',
                        background: isSelected ? 'rgba(200, 75, 40, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                        border: isSelected ? '1.5px solid #c84b28' : '1px solid rgba(255, 255, 255, 0.08)',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: isSelected ? 'rgba(200, 75, 40, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                            color: isSelected ? '#ffedd5' : '#94a3b8'
                          }}>
                            {g.badge}
                          </span>
                          <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 600, color: isSelected ? '#ffedd5' : '#f8fafc' }}>
                            {g.title}
                          </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.4 }}>
                          {g.tagline}
                        </p>
                      </div>

                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid #c84b28' : '2px solid rgba(255, 255, 255, 0.2)',
                        background: isSelected ? '#c84b28' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isSelected && <Check size={14} color="#fff" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Pill Preview */}
              <div style={{
                background: 'rgba(200, 75, 40, 0.08)',
                borderRadius: '12px',
                border: '1px solid rgba(200, 75, 40, 0.2)',
                padding: '16px 20px',
                marginTop: 'auto'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#c84b28', fontWeight: 700, marginBottom: '6px' }}>
                  Ready to Personalize Study Workspace:
                </div>
                <div style={{ fontSize: '0.9rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span><strong>{degree}</strong></span>
                  <span>•</span>
                  <span><strong>{stream === 'other' ? (customStream || 'Custom Branch') : stream}</strong></span>
                  <span>•</span>
                  <span><strong>Semester {semester}</strong></span>
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
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.5rem',
            marginTop: '2rem'
          }}>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => (s - 1) as any)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#cbd5e1',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1) {
                    const effectiveStream = stream === 'other' ? customStream.trim() : stream;
                    if (!effectiveStream) {
                      setError('Please enter or select your branch/stream.');
                      return;
                    }
                  }
                  setError(null);
                  setStep(s => (s + 1) as any);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #c84b28, #e06847)',
                  border: 'none',
                  color: '#fff',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(200, 75, 40, 0.35)'
                }}
              >
                Continue to {step === 1 ? 'Subjects' : 'Study Target'} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                  border: 'none',
                  color: '#fff',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.96rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 18px rgba(34, 197, 94, 0.35)'
                }}
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
