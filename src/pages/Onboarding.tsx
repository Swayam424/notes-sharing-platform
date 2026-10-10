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
    accent: '#2F5233'
  },
  {
    id: 'exam_revision',
    title: 'Fast Exam Revision & PYQ Numerical Drills',
    tagline: 'Focus on 5-year frequent exam questions, high-weightage topics, and speed summaries.',
    badge: 'Exam-Oriented',
    accent: '#D95D39'
  },
  {
    id: 'concept_mastery',
    title: 'Concept Mastery & Daily Coursework',
    tagline: 'Clean unit-by-unit explanations, diagrams, and assignments review for deep understanding.',
    badge: 'Foundation First',
    accent: '#4A5568'
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
      background: 'var(--color-base, #F9F8F6)',
      color: 'var(--color-deep, #1F2421)',
      fontFamily: 'var(--font-body, "Inter", sans-serif)',
      display: 'flex',
      flexDirection: 'column',
      padding: '2.5rem 1.5rem',
      position: 'relative'
    }}>
      {/* Top Academic Brand Bar */}
      <header style={{
        maxWidth: '880px',
        width: '100%',
        margin: '0 auto 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '8px',
            background: 'var(--color-primary, #D95D39)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '2px 2px 0px rgba(31, 36, 33, 0.12)'
          }}>
            <GraduationCap size={20} color="#FFFFFF" strokeWidth={2} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
              fontWeight: 600,
              fontSize: '1.25rem',
              color: 'var(--color-deep, #1F2421)',
              letterSpacing: '-0.01em'
            }}>
              Atelier <span style={{ color: 'var(--color-primary, #D95D39)' }}>Notes</span>
            </div>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--color-muted, #8C857B)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontWeight: 500
            }}>
              Academic Workspace Personalization
            </div>
          </div>
        </div>

        {/* Tactile Step Indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {[
            { num: 1, label: 'Stream & Degree' },
            { num: 2, label: 'Course Roster' },
            { num: 3, label: 'Exam Target' }
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
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: isCurrent
                    ? 'var(--color-primary-light, #FDF0EC)'
                    : isDone
                    ? 'var(--color-secondary-light, #EAF2EB)'
                    : 'var(--color-surface-alt, #F2EFE9)',
                  border: isCurrent
                    ? '1px solid var(--color-primary, #D95D39)'
                    : isDone
                    ? '1px solid rgba(47, 82, 51, 0.35)'
                    : '1px solid var(--color-border, #E8E5DF)',
                  color: isCurrent
                    ? 'var(--color-primary, #D95D39)'
                    : isDone
                    ? 'var(--color-secondary, #2F5233)'
                    : 'var(--color-muted, #8C857B)',
                  transition: 'all 0.15s ease'
                }}
              >
                {isDone ? <Check size={12} strokeWidth={3} /> : <span>{s.num}</span>}
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Crisp White Atelier Card */}
      <main style={{
        maxWidth: '880px',
        width: '100%',
        margin: '0 auto',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          background: 'var(--color-surface, #FFFFFF)',
          border: '1px solid var(--color-border, #E8E5DF)',
          borderRadius: '16px',
          padding: '2.5rem',
          boxShadow: 'var(--shadow-elevated, 4px 4px 0px rgba(31, 36, 33, 0.06))',
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-primary, #D95D39)',
                  marginBottom: '6px'
                }}>
                  <Sparkles size={12} /> Step 1 of 3: Academic Profile
                </span>
                <h1 style={{
                  fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: 'var(--color-deep, #1F2421)',
                  margin: '0 0 6px 0',
                  letterSpacing: '-0.02em'
                }}>
                  What stream are you studying?
                </h1>
                <p style={{ color: 'var(--color-muted, #706B63)', fontSize: '0.92rem', margin: 0 }}>
                  We curate your note feeds, topic syllabus coverage, and university PYQ papers specifically to your branch.
                </p>
              </div>

              {/* Degree Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, #1F2421)', marginBottom: '8px' }}>
                  Degree Program
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {DEGREE_OPTIONS.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDegree(d)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: degree === d ? 600 : 500,
                        background: degree === d ? 'var(--color-primary-light, #FDF0EC)' : 'var(--color-surface, #FFFFFF)',
                        border: degree === d ? '1.5px solid var(--color-primary, #D95D39)' : '1px solid var(--color-border, #E8E5DF)',
                        color: degree === d ? 'var(--color-primary, #D95D39)' : 'var(--color-deep, #1F2421)',
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, #1F2421)', marginBottom: '8px' }}>
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
                          borderRadius: '10px',
                          background: isSelected ? 'var(--color-primary-light, #FDF0EC)' : 'var(--color-surface, #FFFFFF)',
                          border: isSelected ? '1.5px solid var(--color-primary, #D95D39)' : '1px solid var(--color-border, #E8E5DF)',
                          boxShadow: isSelected ? '2px 2px 0px rgba(217, 93, 57, 0.15)' : 'var(--shadow-card, 2px 2px 0px rgba(31, 36, 33, 0.04))',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}
                      >
                        <span style={{
                          fontSize: '1.25rem',
                          background: isSelected ? '#FFFFFF' : 'var(--color-surface-alt, #F2EFE9)',
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
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
                        {isSelected && <CheckCircle2 size={18} color="var(--color-primary, #D95D39)" style={{ marginTop: '2px' }} />}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-deep, #1F2421)', marginBottom: '8px' }}>
                    Current Semester (1 – 8)
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setSemester(sem)}
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '8px',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          background: semester === sem ? 'var(--color-primary, #D95D39)' : 'var(--color-surface, #FFFFFF)',
                          border: semester === sem ? '1px solid var(--color-primary-hover, #C4502F)' : '1px solid var(--color-border, #E8E5DF)',
                          color: semester === sem ? '#FFFFFF' : 'var(--color-deep, #1F2421)',
                          boxShadow: semester === sem ? '2px 2px 0px rgba(31, 36, 33, 0.12)' : 'none',
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-primary, #D95D39)',
                    marginBottom: '6px'
                  }}>
                    <BookOpen size={12} /> Step 2 of 3: Subject Selection
                  </span>
                  <h1 style={{
                    fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
                    fontSize: '2rem',
                    fontWeight: 600,
                    color: 'var(--color-deep, #1F2421)',
                    margin: '0 0 6px 0',
                    letterSpacing: '-0.02em'
                  }}>
                    Which subjects are on your roster?
                  </h1>
                  <p style={{ color: 'var(--color-muted, #706B63)', fontSize: '0.92rem', margin: 0 }}>
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
                        borderRadius: '10px',
                        background: isChecked ? 'var(--color-primary-light, #FDF0EC)' : 'var(--color-surface, #FFFFFF)',
                        border: isChecked ? '1.5px solid var(--color-primary, #D95D39)' : '1px solid var(--color-border, #E8E5DF)',
                        boxShadow: isChecked ? '2px 2px 0px rgba(217, 93, 57, 0.12)' : 'var(--shadow-card, 2px 2px 0px rgba(31, 36, 33, 0.04))',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
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
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: isChecked ? '2px solid var(--color-primary, #D95D39)' : '2px solid var(--color-border, #E8E5DF)',
                          background: isChecked ? 'var(--color-primary, #D95D39)' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', flex: 1 }}>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-primary, #D95D39)',
                  marginBottom: '6px'
                }}>
                  <Target size={12} /> Step 3 of 3: Study Objective
                </span>
                <h1 style={{
                  fontFamily: 'var(--font-display, "Newsreader", Georgia, serif)',
                  fontSize: '2rem',
                  fontWeight: 600,
                  color: 'var(--color-deep, #1F2421)',
                  margin: '0 0 6px 0',
                  letterSpacing: '-0.02em'
                }}>
                  What is your primary study objective?
                </h1>
                <p style={{ color: 'var(--color-muted, #706B63)', fontSize: '0.92rem', margin: 0 }}>
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
                        borderRadius: '12px',
                        background: isSelected ? 'var(--color-primary-light, #FDF0EC)' : 'var(--color-surface, #FFFFFF)',
                        border: isSelected ? '1.5px solid var(--color-primary, #D95D39)' : '1px solid var(--color-border, #E8E5DF)',
                        boxShadow: isSelected ? '2px 2px 0px rgba(217, 93, 57, 0.12)' : 'var(--shadow-card, 2px 2px 0px rgba(31, 36, 33, 0.04))',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
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

                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: isSelected ? '2px solid var(--color-primary, #D95D39)' : '2px solid var(--color-border, #E8E5DF)',
                        background: isSelected ? 'var(--color-primary, #D95D39)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary Paper Box */}
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
            borderTop: '1px solid var(--color-border-light, #F0EDE7)',
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
                  background: 'var(--color-surface, #FFFFFF)',
                  border: '1px solid var(--color-border, #E8E5DF)',
                  color: 'var(--color-deep, #1F2421)',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-card, 2px 2px 0px rgba(31, 36, 33, 0.04))'
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
                  background: 'var(--color-primary, #D95D39)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0px rgba(31, 36, 33, 0.12)'
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
                  background: 'var(--color-secondary, #2F5233)',
                  border: 'none',
                  color: '#FFFFFF',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.96rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '2px 2px 0px rgba(31, 36, 33, 0.12)'
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
