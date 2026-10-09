import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Bookmark,
  Download,
  Flag,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  BookOpen,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
  Copy,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Compass,
  CheckCircle2,
  Award,
  Layers,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';
import { savedNotesService } from '../services/savedNotes';
import type { PYQEntry, PYQQuestionItem, Subject } from '../data/mockData';
import { subjects as fallbackSubjects } from '../data/mockData';

const REPORT_REASONS = [
  {
    category: 'incorrect_info',
    label: 'Incorrect Information',
    description: 'Factual mistakes, erroneous formulas, or misleading question wording',
    icon: AlertCircle,
  },
  {
    category: 'syllabus_mismatch',
    label: "Doesn't Match Topic / Syllabus",
    description: 'Out of course curriculum scope, wrong semester, or wrong regulation scheme',
    icon: Compass,
  },
  {
    category: 'duplicate',
    label: 'Duplicate Resource',
    description: 'Identical question paper already uploaded for this session',
    icon: Copy,
  },
  {
    category: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Defamatory, abusive, handwritten graffiti, or non-academic material',
    icon: ShieldAlert,
  },
  {
    category: 'spam',
    label: 'Spam or Promotional',
    description: 'Advertisements, watermark spam, coaching center solicitations',
    icon: AlertTriangle,
  },
  {
    category: 'copyright',
    label: 'Copyright / Ownership Concern',
    description: 'Unauthorized publication of confidential institutional material',
    icon: Lock,
  },
];

export default function PYQDetail() {
  const { pyqId } = useParams<{ pyqId: string }>();
  const navigate = useNavigate();

  // PYQ data state
  const [pyq, setPyq] = useState<PYQEntry | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reading canvas state
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'paper' | 'sepia' | 'dark'>('paper');
  const [fullscreen, setFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  // Saved / Bookmark state
  const [isSaved, setIsSaved] = useState(false);

  // Reporting modal state
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Incorrect Information');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Load PYQ details and subject metadata
  useEffect(() => {
    if (!pyqId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      api.getPYQ(pyqId),
      api.getSubjects(),
      api.checkNoteReportStatus(pyqId)
    ]).then(([fetchedPyq, fetchedSubjects, reportStatus]) => {
      setPyq(fetchedPyq);
      const matchedSubject = (fetchedSubjects.length > 0 ? fetchedSubjects : fallbackSubjects)
        .find(s => s.id === fetchedPyq.subjectId);
      setSubject(matchedSubject || null);
      setIsSaved(savedNotesService.isSaved(pyqId));

      if (reportStatus.hasReported) {
        setAlreadyReported(true);
      }
    }).catch(err => {
      console.error('Failed to load PYQ details:', err);
      setError('Unable to load this examination paper. It may have been archived or is temporarily unavailable.');
    }).finally(() => {
      setLoading(false);
    });

    const unsubscribe = savedNotesService.subscribe((savedIds) => {
      setIsSaved(savedIds.includes(pyqId));
    });

    return () => unsubscribe();
  }, [pyqId]);

  // Handle Save / Bookmark
  const handleToggleSave = async () => {
    if (!pyq) return;
    try {
      if (isSaved) {
        await savedNotesService.removeSavedNote(pyq.id);
        showToast('Removed paper from My Library');
      } else {
        await savedNotesService.saveNote(pyq.id);
        showToast('Saved paper to My Library');
      }
    } catch {
      showToast('Action logged locally');
    }
  };

  // Handle Download
  const handleDownload = async () => {
    if (!pyq) return;
    try {
      const res = await fetch(`/api/pyqs/${pyq.id}/download`);
      const data = await res.json();
      showToast(`Downloading: ${data.fileName || `${pyq.title || 'Paper'}.pdf`}`);
      // Create synthetic link
      const blob = new Blob([`Examination Paper: ${pyq.title}\n\nSession: ${pyq.month} ${pyq.year}\nSubject: ${pyq.subjectName || subject?.name}\n\nFull questions available in Atelier reader canvas.`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || `${(pyq.title || 'PYQ-Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('Download initiated');
    }
  };

  // Handle Jump to Question
  const scrollToQuestion = (questionId: string) => {
    setActiveQuestionId(questionId);
    const element = document.getElementById(questionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.style.transition = 'background-color 0.4s ease';
      const origBg = element.style.backgroundColor;
      element.style.backgroundColor = 'rgba(200, 75, 40, 0.12)';
      setTimeout(() => {
        element.style.backgroundColor = origBg;
      }, 1500);
    }
  };

  // Handle Report Submission
  const handleSubmitReport = async () => {
    if (!pyq) return;
    const activeReason = REPORT_REASONS.find(r => r.label === selectedReason);
    setReportSubmitting(true);
    setReportError(null);

    try {
      const res = await fetch('/api/moderation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('atelier_token') || ''}`
        },
        body: JSON.stringify({
          noteId: pyq.id,
          resourceName: pyq.title,
          category: activeReason?.category || 'incorrect_info',
          reason: selectedReason,
          details: reportDetails.trim()
        })
      });

      const data = await res.json();
      if (!res.ok && res.status !== 409) {
        throw new Error(data.error || 'Failed to submit report');
      }

      if (res.status === 409) {
        setAlreadyReported(true);
        setReportError(data.error);
        return;
      }

      setReportSuccess(true);
      setAlreadyReported(true);
      showToast('Report submitted for administrative review');
      setTimeout(() => {
        setReportOpen(false);
        setReportSuccess(false);
        setReportDetails('');
      }, 1800);
    } catch (err: any) {
      setReportError(err.message || 'Unable to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  // Structured questions calculation
  const questionsList = useMemo<PYQQuestionItem[]>(() => {
    if (!pyq) return [];
    if (pyq.questions && pyq.questions.length > 0) {
      return pyq.questions;
    }
    // Fallback synthesize from topic mapping if questions array is empty
    if (pyq.topicMapping && pyq.topicMapping.length > 0) {
      return pyq.topicMapping.flatMap((m, mIdx) => [
        {
          id: `q-syn-${mIdx}-1`,
          qNumber: `${mIdx + 1}(a)`,
          question: `Explain fundamental principles and operational dynamics of ${m.topicName} with detailed theoretical justifications.`,
          marks: 7,
          unitName: `Unit ${((mIdx % 5) + 1)}`,
          topicName: m.topicName
        },
        {
          id: `q-syn-${mIdx}-2`,
          qNumber: `${mIdx + 1}(b)`,
          question: `Provide comparative analysis, system design constraints, and edge cases for ${m.topicName}.`,
          marks: 7,
          unitName: `Unit ${((mIdx % 5) + 1)}`,
          topicName: m.topicName
        }
      ]);
    }
    return [];
  }, [pyq]);

  // Section divisions (Section A: questions with marks <= 5, Section B: questions with marks > 5)
  const sectionAQuestions = useMemo(() => {
    return questionsList.filter(q => q.marks <= 5);
  }, [questionsList]);

  const sectionBQuestions = useMemo(() => {
    return questionsList.filter(q => q.marks > 5);
  }, [questionsList]);

  // Topic distribution breakdown for sidebar
  const topicDistribution = useMemo(() => {
    if (!pyq) return [];
    if (pyq.topicMapping && pyq.topicMapping.length > 0) {
      return pyq.topicMapping;
    }
    // Derive from questions
    const map = new Map<string, number>();
    questionsList.forEach(q => {
      const t = q.topicName || 'General Curriculum';
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([topicName, count]) => ({
      topicId: topicName.toLowerCase().replace(/\s+/g, '-'),
      topicName,
      count
    }));
  }, [pyq, questionsList]);

  // Reading Canvas Theme Styles
  const themeStyles = useMemo(() => {
    switch (viewMode) {
      case 'sepia':
        return {
          wrapperBg: '#f4ecd8',
          paperBg: '#fbf0d9',
          color: '#3d3024',
          borderColor: '#e2d4bc',
          subColor: '#7a6652',
          cardBg: '#f2e5cc'
        };
      case 'dark':
        return {
          wrapperBg: '#090d16',
          paperBg: '#111827',
          color: '#f1f5f9',
          borderColor: '#1e293b',
          subColor: '#94a3b8',
          cardBg: '#1e293b'
        };
      case 'paper':
      default:
        return {
          wrapperBg: '#f0f2f5',
          paperBg: '#ffffff',
          color: '#0f172a',
          borderColor: '#e2e8f0',
          subColor: '#475569',
          cardBg: '#f8fafc'
        };
    }
  }, [viewMode]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '75vh',
        gap: '16px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '3px solid rgba(200, 75, 40, 0.2)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>
          Rendering academic examination canvas…
        </span>
      </div>
    );
  }

  if (error || !pyq) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center', padding: 'var(--space-6)' }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto var(--space-4)'
        }}>
          <AlertCircle size={28} />
        </div>
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-2)' }}>Examination Paper Unavailable</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
          {error || 'The requested question paper cannot be displayed.'}
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/pyq')}>
          <ArrowLeft size={16} /> Return to PYQ Archive
        </button>
      </div>
    );
  }

  const paperTitle = pyq.title || `${pyq.subjectName || subject?.name || 'Academic'} — ${pyq.month} ${pyq.year} Examination Paper`;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: fullscreen ? '100vh' : 'calc(100vh - var(--topbar-height) - 40px)',
      position: fullscreen ? 'fixed' : 'relative',
      top: fullscreen ? 0 : 'auto',
      left: fullscreen ? 0 : 'auto',
      right: fullscreen ? 0 : 'auto',
      bottom: fullscreen ? 0 : 'auto',
      zIndex: fullscreen ? 9999 : 1,
      background: 'var(--color-bg)',
      borderRadius: fullscreen ? 0 : 'var(--radius-lg)',
      overflow: 'hidden',
      border: fullscreen ? 'none' : '1px solid var(--color-border)'
    }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'absolute',
          top: '64px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          background: '#0f172a',
          color: '#ffffff',
          padding: '8px 18px',
          borderRadius: '24px',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <CheckCircle2 size={16} color="#10b981" />
          {toastMessage}
        </div>
      )}

      {/* Reader Top Bar */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Left: Back + Context */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/pyq')}
            title="Return to PYQ Archive"
            style={{ padding: '6px 10px', flexShrink: 0 }}
          >
            <ArrowLeft size={16} />
            <span style={{ fontSize: '12px' }}>Archive</span>
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="chip chip-primary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                <Calendar size={11} style={{ marginRight: '4px' }} />
                {pyq.month} {pyq.year} • {pyq.examType || 'End Semester'}
              </span>
              <span className="chip" style={{ fontSize: '11px', padding: '2px 8px' }}>
                {pyq.subjectCode || subject?.code || 'CS501'} • {pyq.subjectName || subject?.name}
              </span>
              {pyq.primaryTopic && (
                <span className="chip chip-secondary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                  {pyq.primaryTopic}
                </span>
              )}
            </div>
            <h1 style={{
              fontSize: '15px',
              fontFamily: 'var(--font-display)',
              margin: '3px 0 0',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {paperTitle}
            </h1>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          {/* Zoom Controls */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--color-border)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setZoom(z => Math.max(75, z - 15))}
              disabled={zoom <= 75}
              title="Zoom out"
              style={{ padding: '4px 6px', height: '28px' }}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '11px', minWidth: '40px', textAlign: 'center', fontWeight: 600 }} className="mono">
              {zoom}%
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setZoom(z => Math.min(150, z + 15))}
              disabled={zoom >= 150}
              title="Zoom in"
              style={{ padding: '4px 6px', height: '28px' }}
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Theme Modes */}
          <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--color-border)' }}>
            <button
              className={`btn btn-ghost btn-sm ${viewMode === 'paper' ? 'active' : ''}`}
              onClick={() => setViewMode('paper')}
              title="Clean Paper Theme"
              style={{ padding: '4px 8px', height: '28px', background: viewMode === 'paper' ? 'var(--color-surface)' : 'transparent' }}
            >
              <Sun size={13} />
            </button>
            <button
              className={`btn btn-ghost btn-sm ${viewMode === 'sepia' ? 'active' : ''}`}
              onClick={() => setViewMode('sepia')}
              title="Sepia Warm Theme"
              style={{ padding: '4px 8px', height: '28px', background: viewMode === 'sepia' ? '#f4ecd8' : 'transparent', color: viewMode === 'sepia' ? '#7a6652' : 'inherit' }}
            >
              <BookOpen size={13} />
            </button>
            <button
              className={`btn btn-ghost btn-sm ${viewMode === 'dark' ? 'active' : ''}`}
              onClick={() => setViewMode('dark')}
              title="Focus Dark Theme"
              style={{ padding: '4px 8px', height: '28px', background: viewMode === 'dark' ? '#1e293b' : 'transparent' }}
            >
              <Moon size={13} />
            </button>
          </div>

          {/* Sidebar Toggle */}
          <button
            className={`btn btn-ghost btn-sm ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Questions Index & Exam Context"
            style={{ padding: '6px 10px', height: '32px' }}
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            <span style={{ fontSize: '12px' }}>Index</span>
          </button>

          {/* Fullscreen */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFullscreen(!fullscreen)}
            title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen Reader'}
            style={{ padding: '6px 8px', height: '32px' }}
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>

          <div style={{ width: '1px', height: '18px', background: 'var(--color-border)', margin: '0 2px' }} />

          {/* Save / Bookmark Button */}
          <button
            className={`btn btn-sm ${isSaved ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleToggleSave}
            title={isSaved ? 'Saved in My Library' : 'Save Paper to My Library'}
            style={{ padding: '6px 12px', height: '32px', gap: '6px' }}
          >
            <Bookmark size={14} fill={isSaved ? 'currentColor' : 'none'} />
            <span style={{ fontSize: '12px' }}>{isSaved ? 'Saved' : 'Save Paper'}</span>
          </button>

          {/* Download Button */}
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDownload}
            title="Download PDF"
            style={{ padding: '6px 12px', height: '32px', gap: '6px' }}
          >
            <Download size={14} />
            <span style={{ fontSize: '12px' }}>Download</span>
          </button>

          {/* Report Button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setReportOpen(true)}
            title="Report / Flag this question paper"
            style={{ padding: '6px 10px', height: '32px', color: alreadyReported ? '#f59e0b' : 'var(--color-muted)' }}
          >
            <Flag size={14} />
            <span style={{ fontSize: '12px' }}>{alreadyReported ? 'Reported' : 'Report'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Central Examination Paper Canvas */}
        <div
          ref={canvasRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            background: themeStyles.wrapperBg,
            padding: '28px 20px',
            display: 'flex',
            justifyContent: 'center',
            transition: 'background 0.3s ease'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '820px',
              background: themeStyles.paperBg,
              color: themeStyles.color,
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
              border: `1px solid ${themeStyles.borderColor}`,
              padding: '40px 48px',
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              lineHeight: 1.6,
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease, background 0.3s ease, color 0.3s ease'
            }}
          >
            {/* University Paper Header */}
            <div style={{
              textAlign: 'center',
              borderBottom: `2px double ${themeStyles.borderColor}`,
              paddingBottom: '24px',
              marginBottom: '28px'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: themeStyles.subColor,
                marginBottom: '4px'
              }}>
                {pyq.author || 'Apex Technical University & Autonomous Examination Board'}
              </div>
              <h2 style={{
                fontSize: '19px',
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                margin: '6px 0',
                letterSpacing: '-0.01em'
              }}>
                B.Tech. Degree Examination — {pyq.month} {pyq.year}
              </h2>
              <div style={{ fontSize: '13px', fontWeight: 600, color: themeStyles.subColor }}>
                Semester {pyq.semester || 5} • Department of {pyq.department || 'Computer Science & Engineering'}
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                marginTop: '18px',
                paddingTop: '16px',
                borderTop: `1px dashed ${themeStyles.borderColor}`,
                fontSize: '12px'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ color: themeStyles.subColor }}>Course Code: </span>
                  <strong>{pyq.subjectCode || subject?.code || 'CS501'}</strong>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ color: themeStyles.subColor }}>Course Name: </span>
                  <strong>{pyq.subjectName || subject?.name}</strong>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ color: themeStyles.subColor }}>Time Allowed: </span>
                  <strong>3 Hours</strong>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <span style={{ color: themeStyles.subColor }}>Maximum Marks: </span>
                  <strong>{pyq.totalMarks || 100} Marks</strong>
                </div>
              </div>
            </div>

            {/* Candidate Instructions */}
            <div style={{
              background: themeStyles.cardBg,
              border: `1px solid ${themeStyles.borderColor}`,
              borderRadius: 'var(--radius-md)',
              padding: '14px 18px',
              fontSize: '12px',
              color: themeStyles.subColor,
              marginBottom: '32px'
            }}>
              <strong style={{ color: themeStyles.color, display: 'block', marginBottom: '4px' }}>
                Instructions to Candidates:
              </strong>
              <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li>Answer all questions from Section A and all questions with internal choice from Section B.</li>
                <li>Make suitable assumptions wherever necessary and state them clearly.</li>
                <li>Figures to the right indicate full marks assigned to respective questions.</li>
                <li>Neat diagrams and architectural sketches must be drawn wherever applicable.</li>
              </ol>
            </div>

            {/* Section A */}
            {sectionAQuestions.length > 0 && (
              <div style={{ marginBottom: '36px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${themeStyles.borderColor}`,
                  paddingBottom: '8px',
                  marginBottom: '16px'
                }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>
                    SECTION A — Short Concept Questions
                  </h3>
                  <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: themeStyles.subColor }}>
                    [{sectionAQuestions.reduce((a, b) => a + b.marks, 0)} Marks]
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {sectionAQuestions.map((q) => (
                    <div
                      key={q.id}
                      id={q.id}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: activeQuestionId === q.id ? '1px solid var(--color-primary)' : '1px solid transparent'
                      }}
                    >
                      <span className="mono" style={{ fontWeight: 700, minWidth: '36px', color: 'var(--color-primary)' }}>
                        Q{q.qNumber}.
                      </span>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 6px', fontSize: '14px' }}>{q.question}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                          {q.topicName && (
                            <span className="chip chip-secondary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                              {q.topicName}
                            </span>
                          )}
                          {q.unitName && (
                            <span style={{ color: themeStyles.subColor }}>{q.unitName}</span>
                          )}
                        </div>
                      </div>
                      <div className="mono" style={{ fontWeight: 600, fontSize: '12px', color: themeStyles.subColor, whiteSpace: 'nowrap' }}>
                        [{q.marks}M]
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section B */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${themeStyles.borderColor}`,
                paddingBottom: '8px',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, letterSpacing: '0.04em' }}>
                  SECTION B — Analytical & Long Problems
                </h3>
                <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: themeStyles.subColor }}>
                  [{sectionBQuestions.reduce((a, b) => a + b.marks, 0) || (pyq.totalMarks || 100) - (sectionAQuestions.reduce((a, b) => a + b.marks, 0))} Marks]
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {(sectionBQuestions.length > 0 ? sectionBQuestions : questionsList).map((q) => (
                  <div
                    key={q.id}
                    id={q.id}
                    style={{
                      display: 'flex',
                      gap: '14px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: activeQuestionId === q.id ? '1px solid var(--color-primary)' : '1px solid transparent',
                      background: activeQuestionId === q.id ? 'rgba(200, 75, 40, 0.05)' : 'transparent'
                    }}
                  >
                    <span className="mono" style={{ fontWeight: 700, minWidth: '40px', color: 'var(--color-primary)' }}>
                      Q{q.qNumber}.
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: 1.55 }}>
                        {q.question}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', flexWrap: 'wrap' }}>
                        {q.topicName && (
                          <span className="chip chip-secondary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            {q.topicName}
                          </span>
                        )}
                        {q.unitName && (
                          <span style={{ color: themeStyles.subColor }}>{q.unitName}</span>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(q.question);
                            showToast(`Copied Q${q.qNumber} prompt to clipboard`);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '0 6px', height: '20px', fontSize: '10px', color: themeStyles.subColor }}
                          title="Copy question text"
                        >
                          <Copy size={11} /> Copy
                        </button>
                      </div>
                    </div>
                    <div className="mono" style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                      [{q.marks} Marks]
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* End of Examination Footer */}
            <div style={{
              textAlign: 'center',
              borderTop: `1px solid ${themeStyles.borderColor}`,
              paddingTop: '20px',
              marginTop: '40px',
              fontSize: '11px',
              color: themeStyles.subColor,
              letterSpacing: '0.08em',
              textTransform: 'uppercase'
            }}>
              *** END OF EXAMINATION PAPER ***
            </div>
          </div>
        </div>

        {/* Collapsible Right Sidebar: Exam Overview & Questions Index */}
        {sidebarOpen && (
          <aside style={{
            width: '320px',
            borderLeft: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            flexShrink: 0
          }}>
            {/* Sidebar Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={16} color="var(--color-primary)" />
                <h3 style={{ fontSize: '13px', fontWeight: 600, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Paper Specifications
                </h3>
              </div>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                {questionsList.length} Questions
              </span>
            </div>

            {/* Exam Context Data Card */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px' }}>
                <div style={{ background: 'var(--color-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-muted)', display: 'block' }}>EXAM SESSION</span>
                  <strong>{pyq.month} {pyq.year}</strong>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-muted)', display: 'block' }}>EXAM TYPE</span>
                  <strong>{pyq.examType || 'End Semester'}</strong>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-muted)', display: 'block' }}>MAX MARKS</span>
                  <strong>{pyq.totalMarks || 100} Marks</strong>
                </div>
                <div style={{ background: 'var(--color-bg)', padding: '8px 10px', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-muted)', display: 'block' }}>PAGES / SIZE</span>
                  <strong>{pyq.pages || 4} pgs • {pyq.fileSize || '1.6 MB'}</strong>
                </div>
              </div>

              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-muted)' }}>
                <span>Contributor: </span>
                <strong style={{ color: 'var(--color-text)' }}>{pyq.author || 'Apex Examination Board'}</strong>
              </div>
            </div>

            {/* Topic Coverage Distribution */}
            <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Layers size={14} color="var(--color-primary)" />
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Topic Coverage
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {topicDistribution.map((t, idx) => {
                  const count = t.count || 2;
                  const percent = Math.min(100, Math.round((count / (pyq.questionCount || 12)) * 100));
                  return (
                    <div key={idx} style={{ fontSize: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                          {t.topicName}
                        </span>
                        <span className="mono" style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                          {count}Q
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '2px' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Questions Quick-Jump Index */}
            <div style={{ padding: '16px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <FileCheck size={14} color="var(--color-primary)" />
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Questions Index
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {questionsList.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => scrollToQuestion(q.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: activeQuestionId === q.id ? 'rgba(200, 75, 40, 0.1)' : 'var(--color-bg)',
                      border: activeQuestionId === q.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong className="mono" style={{ fontSize: '12px', color: 'var(--color-primary)' }}>
                          Q{q.qNumber}
                        </strong>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                          {q.topicName || q.unitName}
                        </span>
                      </div>
                    </div>
                    <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text)' }}>
                      {q.marks}M
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Flag / Report Modal */}
      {reportOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '18px 22px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Flag size={18} color="#ef4444" />
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                  Report Examination Paper
                </h3>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setReportOpen(false)}
                style={{ padding: '4px 8px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '22px' }}>
              <div style={{ marginBottom: '14px', fontSize: '13px', color: 'var(--color-muted)' }}>
                Target: <strong style={{ color: 'var(--color-text)' }}>{pyq.title}</strong>
              </div>

              {reportSuccess && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: '#10b981',
                  marginBottom: '16px'
                }}>
                  Report submitted successfully for administrative review.
                </div>
              )}

              {alreadyReported && !reportSuccess && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: '#f59e0b',
                  marginBottom: '16px'
                }}>
                  You have already submitted an active feedback report for this paper. Our moderation team is currently reviewing it.
                </div>
              )}

              {reportError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  color: '#ef4444',
                  marginBottom: '16px'
                }}>
                  {reportError}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)' }}>
                  SELECT PROBLEM CATEGORY
                </label>
                {REPORT_REASONS.map((r) => {
                  const Icon = r.icon;
                  const isSelected = selectedReason === r.label;
                  return (
                    <div
                      key={r.category}
                      onClick={() => setSelectedReason(r.label)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                        background: isSelected ? 'rgba(200, 75, 40, 0.08)' : 'var(--color-bg)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={16} color={isSelected ? 'var(--color-primary)' : 'var(--color-muted)'} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500 }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                          {r.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: '6px' }}>
                  ADDITIONAL DETAILS (OPTIONAL)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Specify question number, syllabus discrepancy, or page error…"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setReportOpen(false)}
                  disabled={reportSubmitting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitReport}
                  disabled={reportSubmitting}
                >
                  {reportSubmitting ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
