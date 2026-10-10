import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft, Home, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw,
  Bookmark, Download, Flag, FileText, Check, X,
  Maximize2, Minimize2, Sparkles, BookOpen, Sun, Moon,
  PanelLeftClose, PanelLeft, AlertCircle, RefreshCw,
  Compass, Copy, ShieldAlert, AlertTriangle, Lock,
  CheckCircle2, Info, ExternalLink, Loader2,
  ThumbsUp, MessageSquare, Send, Lightbulb, Trash2, HelpCircle,
  Share2, Award
} from 'lucide-react';
import { api } from '../services/api';
import { savedNotesService } from '../services/savedNotes';
import { notes as fallbackNotes, subjects as fallbackSubjects, type NoteResource, type Subject, type NoteComment } from '../data/mockData';
import { getDocumentPages, type NotePageData } from '../data/noteContent';

export const REPORT_REASONS = [
  {
    category: 'incorrect_info',
    label: 'Incorrect Information',
    description: 'Factual mistakes, erroneous formulas, or misleading calculations/answers',
    icon: AlertCircle,
  },
  {
    category: 'syllabus_mismatch',
    label: "Doesn't Match Topic / Syllabus",
    description: 'Misclassified topic, wrong unit, or out of course curriculum scope',
    icon: Compass,
  },
  {
    category: 'duplicate',
    label: 'Duplicate Resource',
    description: 'Already uploaded or identical to another note in this subject',
    icon: Copy,
  },
  {
    category: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Offensive, defamatory, abusive, or non-educational material',
    icon: ShieldAlert,
  },
  {
    category: 'spam',
    label: 'Spam or Promotional',
    description: 'Advertisements, commercial links, junk content, or solicitations',
    icon: AlertTriangle,
  },
  {
    category: 'copyright',
    label: 'Copyright / Ownership Concern',
    description: 'Unauthorized publication of private/proprietary intellectual property',
    icon: Lock,
  },
];

export default function NoteDetail() {
  const { noteId } = useParams<{ noteId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as any) || {};

  // Document state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<'paper' | 'sepia' | 'dark'>('paper');
  const [focusMode, setFocusMode] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);

  // Modals & Feedback
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>('Incorrect Information');
  const [reportNotes, setReportNotes] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedSuccess, setReportedSuccess] = useState(false);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [alreadyReportedInfo, setAlreadyReportedInfo] = useState<{ id?: string; reason?: string; timestamp?: string; status?: string; details?: string } | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Peer Sharing & Author Profile State
  const [shareOpen, setShareOpen] = useState(false);
  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const [allNotesList, setAllNotesList] = useState<NoteResource[]>(fallbackNotes);

  // Note Data & Loading/Error states
  const [note, setNote] = useState<NoteResource | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Saved Notes state from localStorage (synced with Notes Discovery)
  const [isSaved, setIsSaved] = useState(false);

  // Social Engagement & Discussion state
  const [upvotesCount, setUpvotesCount] = useState(0);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [comments, setComments] = useState<NoteComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentCategory, setCommentCategory] = useState<'Study Tip' | 'Errata / Correction' | 'Question' | 'Key Takeaway' | 'General'>('Study Tip');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [activeCommentFilter, setActiveCommentFilter] = useState<'all' | 'Study Tip' | 'Errata / Correction' | 'Question' | 'Key Takeaway'>('all');

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Fetch all notes for author profiles
  useEffect(() => {
    api.getNotes().then(setAllNotesList).catch(() => setAllNotesList(fallbackNotes));
  }, []);

  // Compute author portfolio & metrics
  const authorNotes = useMemo(() => {
    if (!note?.author) return [];
    return allNotesList.filter(n => n.author.toLowerCase() === note.author.toLowerCase());
  }, [allNotesList, note?.author]);

  const authorStats = useMemo(() => {
    const totalNotes = authorNotes.length || 1;
    const totalDownloads = authorNotes.reduce((sum, n) => sum + (n.downloads || 0), 0) || (note?.downloads || 64);
    const totalUpvotes = authorNotes.reduce((sum, n) => sum + (n.upvotes || 0), 0) || (note?.upvotes || 22);
    return { totalNotes, totalDownloads, totalUpvotes };
  }, [authorNotes, note]);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showToast('Note link copied to clipboard!');
  };

  const handleCopyClassMessage = () => {
    if (!note) return;
    const msg = `📚 Check out ${note.author}'s notes on "${note.title}" (${note.subjectName || 'Course Note'}, ${note.pages} pages): ${window.location.href}`;
    navigator.clipboard.writeText(msg);
    showToast('Class group share text copied!');
  };

  // Load Note & Subject Data
  const loadData = useCallback(() => {
    if (!noteId) return;
    setLoading(true);
    setLoadError(null);

    // Initial check from fallback mock notes for instant render
    const localNote = fallbackNotes.find(n => n.id === noteId);
    if (localNote) {
      setNote(localNote);
      const localSubject = fallbackSubjects.find(s => s.id === localNote.subjectId);
      if (localSubject) setSubject(localSubject);
    }

    // Live API fetch
    api.getNote(noteId)
      .then(fetchedNote => {
        const mergedNote = localNote ? { ...localNote, ...fetchedNote } : fetchedNote;
        setNote(mergedNote);

        if (mergedNote.subjectId) {
          return api.getSubject(mergedNote.subjectId).then(fetchedSub => {
            setSubject(fetchedSub);
            setLoading(false);
          });
        }
        setLoading(false);
      })
      .catch(err => {
        if (!localNote) {
          setLoadError(err.message || 'Failed to retrieve note resource');
        }
        setLoading(false);
      });
  }, [noteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync saved status and record note access timestamp
  useEffect(() => {
    if (!noteId) return;
    setIsSaved(savedNotesService.isSaved(noteId));
    savedNotesService.recordNoteAccess(noteId);

    const unsubscribe = savedNotesService.subscribe((ids) => {
      setIsSaved(ids.includes(noteId));
    });

    // Check if current authenticated user already reported this note
    api.checkNoteReportStatus(noteId)
      .then(res => {
        if (res.hasReported) {
          setAlreadyReported(true);
          setAlreadyReportedInfo(res.report);
        } else {
          setAlreadyReported(false);
          setAlreadyReportedInfo(null);
        }
      })
      .catch(() => {});

    // Fetch live upvote status & comments
    api.getNoteUpvoteStatus(noteId).then(res => {
      setIsUpvoted(res.upvoted);
      setUpvotesCount(res.upvoteCount);
    }).catch(() => {});

    setCommentsLoading(true);
    api.getNoteComments(noteId).then(list => {
      setComments(list);
    }).catch(() => {}).finally(() => setCommentsLoading(false));

    return () => unsubscribe();
  }, [noteId]);

  // Sync page input with currentPage
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Keyboard shortcuts for distraction-free reading
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage(p => Math.max(1, p - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        if (note) setCurrentPage(p => Math.min(note.pages, p + 1));
      } else if (e.key === 'Escape') {
        if (reportOpen) {
          setReportOpen(false);
        } else if (focusMode) {
          setFocusMode(false);
        }
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom(z => Math.min(250, z + 15));
      } else if (e.key === '-') {
        e.preventDefault();
        setZoom(z => Math.max(50, z - 15));
      } else if (e.key === '0') {
        e.preventDefault();
        setZoom(100);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFocusMode(prev => !prev);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRotation(r => (r + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [note, reportOpen, focusMode]);

  // Primary topic determination
  const primaryTopic = useMemo(() => {
    if (!note) return 'General Notes';
    if (note.primaryTopic) return note.primaryTopic;
    if (note.topicNames && note.topicNames.length > 0) return note.topicNames[0];
    return 'Topic Study Material';
  }, [note]);

  // Academic unit information
  const unit = useMemo(() => {
    if (!subject || !note) return null;
    return subject.units.find(u => u.id === note.unitId);
  }, [subject, note]);

  // Realistic document pages generated for this specific note
  const documentPages: NotePageData[] = useMemo(() => {
    if (!note) return [];
    return getDocumentPages(
      note.id,
      primaryTopic,
      note.subjectName || subject?.name || 'Academic Subject',
      note.subjectCode || subject?.code || 'CS500',
      note.unitName || unit?.name || 'Unit Study Notes',
      note.author,
      note.pages || 6,
      note.format || 'Typed Notes'
    );
  }, [note, primaryTopic, subject, unit]);

  // Save / Bookmark Toggle using reactive service
  const handleToggleSave = async () => {
    if (!note) return;
    const isNowSaved = await savedNotesService.toggleSaveNote(note.id);
    setIsSaved(isNowSaved);
    showToast(isNowSaved ? `Saved “${note.title.slice(0, 32)}...” to your library` : `Removed “${note.title.slice(0, 32)}...” from your library`);
  };

  // Upvote / Helpful Toggle
  const handleToggleUpvote = async () => {
    if (!note || upvoting) return;
    setUpvoting(true);
    try {
      const res = await api.toggleNoteUpvote(note.id);
      setIsUpvoted(res.upvoted);
      setUpvotesCount(res.upvoteCount);
      showToast(res.upvoted ? 'Marked as helpful for exam prep! 👍' : 'Removed helpful vote');
    } catch (err) {
      console.error(err);
    } finally {
      setUpvoting(false);
    }
  };

  // Add Comment / Discussion Contribution
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note || !commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const newComm = await api.addNoteComment(note.id, commentText.trim(), commentCategory);
      setComments(prev => [newComm, ...prev]);
      setCommentText('');
      showToast('Contribution added to discussion thread!');
    } catch (err) {
      console.error(err);
      showToast('Failed to post contribution');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Upvote a comment
  const handleToggleCommentUpvote = async (commentId: string) => {
    try {
      const res = await api.toggleCommentUpvote(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, isUpvoted: res.upvoted, upvotes: res.upvotes } : c));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.deleteNoteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
      showToast('Comment deleted');
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered comments
  const filteredComments = useMemo(() => {
    if (activeCommentFilter === 'all') return comments;
    return comments.filter(c => c.category === activeCommentFilter);
  }, [comments, activeCommentFilter]);

  // Download Action
  const handleDownload = () => {
    if (!note) return;
    showToast(`Downloading “${note.title}” (${note.format})...`);
    const element = document.createElement('a');
    element.setAttribute('href', api.getDownloadUrl(note.id));
    element.setAttribute('download', `${note.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Report submission
  const handleReportSubmit = async () => {
    if (!note || !selectedReason) return;
    setReportSubmitting(true);
    setReportError(null);
    try {
      const activeReason = REPORT_REASONS.find(r => r.label === selectedReason);
      const res = await api.reportResource({
        noteId: note.id,
        resourceName: note.title,
        reason: selectedReason,
        category: activeReason?.category || 'other',
        details: reportNotes.trim()
      });
      setSubmittedReportId(res.id);
      setAlreadyReported(true);
      setAlreadyReportedInfo({
        id: res.id,
        reason: selectedReason,
        details: reportNotes.trim(),
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'pending'
      });
      setReportedSuccess(true);
      showToast('Report submitted for moderation review.');
    } catch (err: any) {
      console.error('Report submission error:', err);
      if (err.status === 409 || err.message?.includes('already')) {
        setAlreadyReported(true);
        setReportError('A report for this note has already been queued and is pending review.');
      } else {
        setReportError(err.message || 'Failed to submit report. Please try again.');
      }
    } finally {
      setReportSubmitting(false);
    }
  };

  // Page input submission
  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!note) return;
    const pageNum = parseInt(pageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= note.pages) {
      setCurrentPage(pageNum);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  // Zoom handlers (supports up to 300% for fine handwriting & diagrams)
  const handleZoomIn = () => setZoom(z => Math.min(300, z + 20));
  const handleZoomOut = () => setZoom(z => Math.max(50, z - 20));
  const handleFitWidth = () => setZoom(110);
  const handleRotate = () => setRotation(r => (r + 90) % 360);

  // Return to previous results (preserves active search & filters)
  const handleReturnToResults = () => {
    if (navState?.from === 'discovery') {
      navigate('/notes', { state: navState });
    } else {
      navigate('/notes');
    }
  };

  const returnLabel = useMemo(() => {
    if (navState?.searchQuery) {
      return `Results for “${navState.searchQuery}”`;
    }
    if (navState?.selectedSubject && navState.selectedSubject !== 'all') {
      return 'Subject Notes';
    }
    return 'Notes Discovery';
  }, [navState]);

  // -------------------------------------------------------------
  // 1. Loading State (Shimmering Academic Sheet)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="note-viewer-page" id="note-viewer-loading-view">
        <div className="note-viewer-header" style={{ opacity: 0.7 }}>
          <div className="note-viewer-header-top">
            <button className="note-viewer-return-btn" onClick={handleReturnToResults}>
              <ArrowLeft size={15} />
              <span>Back</span>
            </button>
            <div className="skeleton-line" style={{ width: '140px', height: '32px' }} />
          </div>
          <div className="note-viewer-meta-row">
            <div className="skeleton-line" style={{ width: '320px', height: '24px', marginBottom: '8px' }} />
            <div className="skeleton-line" style={{ width: '480px', height: '16px' }} />
          </div>
        </div>

        <div className="note-viewer-stage" style={{ justifyContent: 'center' }}>
          <div className="note-viewer-skeleton-sheet">
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #ECEAE5' }}>
              <div className="skeleton-line" style={{ width: '220px', height: '14px' }} />
              <div className="skeleton-line" style={{ width: '160px', height: '14px' }} />
            </div>
            <div className="skeleton-line" style={{ width: '70%', height: '28px', marginTop: '12px' }} />
            <div className="skeleton-line" style={{ width: '45%', height: '16px' }} />
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton-line" style={{ width: '100%', height: '14px' }} />
              <div className="skeleton-line" style={{ width: '96%', height: '14px' }} />
              <div className="skeleton-line" style={{ width: '92%', height: '14px' }} />
              <div className="skeleton-line" style={{ width: '80%', height: '14px' }} />
            </div>
            <div className="skeleton-line" style={{ width: '100%', height: '110px', marginTop: '20px' }} />
            <div style={{ textAlign: 'center', marginTop: '30px' }}>
              <span className="mono text-muted" style={{ fontSize: '13px' }}>Loading note material...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. Error / Document Unavailable State
  // -------------------------------------------------------------
  if (loadError) {
    return (
      <div className="note-viewer-page" id="note-viewer-error-view">
        <div className="note-viewer-error-card">
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(200, 50, 50, 0.1)',
            color: 'var(--color-danger, #c84b28)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertCircle size={24} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Document Unavailable
          </h2>
          <p className="text-sm text-muted" style={{ marginBottom: '20px', lineHeight: 1.5 }}>
            {loadError}. This note might have been modified, unlisted, or moved.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={loadData}>
              <RefreshCw size={14} /> Retry
            </button>
            <button className="btn btn-secondary" onClick={handleReturnToResults}>
              <ArrowLeft size={14} /> Return to Notes Discovery
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. Not Found State
  // -------------------------------------------------------------
  if (!note) {
    return (
      <div className="note-viewer-page" id="note-viewer-notfound-view">
        <div className="note-viewer-error-card">
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-muted-bg)',
            color: 'var(--color-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <FileText size={24} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Note Resource Not Found
          </h2>
          <p className="text-sm text-muted" style={{ marginBottom: '20px', lineHeight: 1.5 }}>
            We could not locate this document in the academic repository. It may have been archived or removed by a moderator.
          </p>
          <button className="btn btn-primary" onClick={handleReturnToResults}>
            <ArrowLeft size={14} /> Return to Notes Discovery
          </button>
        </div>
      </div>
    );
  }

  // Active page data from generator
  const activePageData = documentPages.find(p => p.pageNumber === currentPage) || documentPages[0] || {
    pageNumber: currentPage,
    title: note.title,
    sections: []
  };

  return (
    <div className={`note-viewer-page ${focusMode ? 'focus-mode-active' : ''}`} id="note-viewer-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="note-viewer-toast" role="status">
          <Check size={14} className="toast-check-icon" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ================================================================
          FOCUS MODE FLOATING BAR (Appears exclusively when Focus Mode is ON)
          ================================================================ */}
      {focusMode && (
        <aside className="note-viewer-focus-bar" id="focus-mode-bar" aria-label="Focus mode controls">
          <div className="focus-bar-left">
            <span className="focus-mode-badge">
              <Sparkles size={12} /> Focus Study Mode
            </span>
            <span className="focus-doc-title" title={note.title}>{note.title}</span>
          </div>

          <div className="focus-bar-center">
            <button
              className="toolbar-btn toolbar-btn-icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              title="Previous Page (←)"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--color-deep)' }}>
              Page {currentPage} of {note.pages}
            </span>
            <button
              className="toolbar-btn toolbar-btn-icon"
              onClick={() => setCurrentPage(p => Math.min(note.pages, p + 1))}
              disabled={currentPage >= note.pages}
              title="Next Page (→)"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="focus-bar-right">
            <div className="toolbar-viewmode-group" role="radiogroup" aria-label="Reading surface tone">
              <button
                className={`viewmode-btn ${viewMode === 'paper' ? 'active' : ''}`}
                onClick={() => setViewMode('paper')}
                title="Paper Mode"
              >
                Paper
              </button>
              <button
                className={`viewmode-btn ${viewMode === 'sepia' ? 'active' : ''}`}
                onClick={() => setViewMode('sepia')}
                title="Sepia Mode"
              >
                <Sun size={12} /> Sepia
              </button>
              <button
                className={`viewmode-btn ${viewMode === 'dark' ? 'active' : ''}`}
                onClick={() => setViewMode('dark')}
                title="Dark Mode"
              >
                <Moon size={12} /> Dark
              </button>
            </div>

            <button
              className="btn-exit-focus"
              onClick={() => setFocusMode(false)}
              title="Exit Focus Mode (Esc)"
              id="btn-exit-focus"
            >
              <Minimize2 size={13} />
              <span>Exit Focus (Esc)</span>
            </button>
          </div>
        </aside>
      )}

      {/* ================================================================
          1. FOCUSED HEADER: Title, Topic, Academic Metadata & Key Actions
          (Hidden during Focus Mode to give 100% viewport space to document)
          ================================================================ */}
      {!focusMode && (
        <header className="note-viewer-header" id="note-viewer-header">
          <div className="note-viewer-header-top">
            {/* Connected Return Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="note-viewer-return-btn"
                onClick={() => navigate('/dashboard')}
                aria-label="Return to Study Space workspace"
                id="btn-return-home"
              >
                <Home size={15} />
                <span>Study Space</span>
              </button>

              <button
                className="note-viewer-return-btn"
                onClick={handleReturnToResults}
                aria-label="Return to Notes Discovery results"
                id="btn-return-discovery"
              >
                <ArrowLeft size={15} />
                <span>{returnLabel}</span>
              </button>
            </div>

            {/* Action Buttons: Save/Bookmark, Share, Upvote, Discussion, Download, Report, Focus Mode */}
            <div className="note-viewer-actions">
              {/* Save / Bookmark Button */}
              <button
                className={`note-viewer-btn note-viewer-btn-save ${isSaved ? 'saved' : ''}`}
                onClick={handleToggleSave}
                id="btn-viewer-save"
                aria-label={isSaved ? "Saved in collection" : "Save note for later"}
              >
                <Bookmark size={15} fill={isSaved ? 'currentColor' : 'none'} />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>

              {/* Share Note Button */}
              <button
                className="note-viewer-btn note-viewer-btn-share"
                onClick={() => setShareOpen(true)}
                id="btn-viewer-share"
                title="Share this note with classmates or batch study groups"
                aria-label="Share note"
              >
                <Share2 size={15} />
                <span>Share</span>
              </button>

              {/* Upvote / Helpful Button */}
              <button
                className={`note-viewer-btn note-viewer-btn-upvote ${isUpvoted ? 'active upvoted' : ''}`}
                onClick={handleToggleUpvote}
                disabled={upvoting}
                id="btn-viewer-upvote"
                title={isUpvoted ? "You marked this peer note as helpful" : "Mark as helpful peer note"}
                aria-label="Upvote note as helpful"
              >
                <ThumbsUp size={15} fill={isUpvoted ? 'currentColor' : 'none'} />
                <span>{upvotesCount} Helpful</span>
              </button>

              {/* Discussion Drawer Toggle Button */}
              <button
                className={`note-viewer-btn note-viewer-btn-discussion ${showDiscussion ? 'active' : ''}`}
                onClick={() => setShowDiscussion(!showDiscussion)}
                id="btn-viewer-discussion"
                title="Toggle note discussion and peer clarifications"
                aria-label="Toggle discussion thread"
              >
                <MessageSquare size={15} />
                <span>Discussion ({comments.length})</span>
              </button>

              {/* Download Button */}
              <button
                className="note-viewer-btn note-viewer-btn-download"
                onClick={handleDownload}
                id="btn-viewer-download"
                aria-label="Download original note document"
              >
                <Download size={15} />
                <span>Download</span>
              </button>

              {/* Report Button */}
              <button
                className={`note-viewer-btn note-viewer-btn-report ${alreadyReported ? 'active' : ''}`}
                onClick={() => setReportOpen(true)}
                id="btn-viewer-report"
                aria-label={alreadyReported ? 'View report status for this note' : 'Report issue with this note'}
                style={alreadyReported ? { color: 'var(--color-primary)', borderColor: 'var(--color-primary)', background: 'var(--color-primary-light)' } : undefined}
                title={alreadyReported ? 'Report pending review' : 'Report an issue with this note'}
              >
                <Flag size={14} />
                <span>{alreadyReported ? 'Reported' : 'Report'}</span>
              </button>

              {/* Distraction-Free / Focus Toggle */}
              <button
                className={`note-viewer-btn note-viewer-btn-icon ${focusMode ? 'active' : ''}`}
                onClick={() => setFocusMode(true)}
                title="Distraction-Free Focus Mode (F)"
                id="btn-viewer-focus"
                aria-label="Enter distraction-free focus mode"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>

          {/* Note Metadata & Academic Context Line */}
          <div className="note-viewer-meta-row">
            <div className="note-viewer-title-group">
              {/* Topic Badge */}
              <span className="note-viewer-topic-chip" id="viewer-topic-badge">
                <Sparkles size={12} style={{ color: 'var(--color-primary)' }} />
                {primaryTopic}
              </span>

              {/* Note Title */}
              <h1 className="note-viewer-title" title={note.title}>
                {note.title}
              </h1>
            </div>

            {/* Academic Context Badges */}
            <div className="note-viewer-academic-specs">
              <span
                className="note-viewer-spec-pill"
                onClick={() => navigate(`/subjects/${note.subjectId}`)}
                style={{ cursor: 'pointer' }}
                title={`View ${note.subjectName || 'subject'} syllabus & units`}
              >
                {note.subjectCode || subject?.code || 'CS'} {note.subjectName || subject?.name || 'Course'}
              </span>
              <span className="note-viewer-spec-dot">•</span>
              <span className="note-viewer-spec-unit">
                {note.unitName || unit?.name || 'Unit Material'}
              </span>
              <span className="note-viewer-spec-dot">•</span>
              <span className="note-viewer-spec-dept">
                {note.department || 'Computer Science'} • Sem {note.semester || 5}
              </span>
              <span className="note-viewer-spec-dot">•</span>

              {/* Author */}
              <div
                className="note-viewer-author-badge note-author-clickable"
                onClick={() => setAuthorModalOpen(true)}
                title={`View ${note.author}'s student profile and uploaded notes`}
              >
                <div className="note-viewer-author-initials">{note.authorInitials}</div>
                <span>{note.author}</span>
              </div>

              <span className="note-viewer-spec-dot">•</span>

              {/* Format & Specs */}
              <span className="note-viewer-format-tag">
                <FileText size={11} /> {note.format}
              </span>
              <span className="note-viewer-spec-dot">•</span>
              <span className="mono text-muted" style={{ fontSize: '11px' }}>
                {note.pages} pages ({note.fileSizeFormatted || '3.2 MB'})
              </span>
            </div>
          </div>
        </header>
      )}

      {/* ================================================================
          2. DOCUMENT VIEWER TOOLBAR (Page navigation, Zoom, View Modes)
          ================================================================ */}
      <div className="note-viewer-toolbar-wrapper">
        <div className="note-viewer-toolbar" id="note-viewer-toolbar" role="toolbar" aria-label="Document viewer controls">
          {/* Left Controls: Thumbnails Toggle, Discussion Toggle & Page Navigation */}
          <div className="toolbar-group">
            <button
              className={`toolbar-btn ${showThumbnails ? 'active' : ''}`}
              onClick={() => setShowThumbnails(!showThumbnails)}
              title="Toggle Page Thumbnails"
              id="btn-toggle-thumbnails"
              aria-label="Toggle page preview thumbnails"
            >
              {showThumbnails ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
              <span className="toolbar-btn-text">Thumbnails</span>
            </button>

            <button
              className={`toolbar-btn ${showDiscussion ? 'active' : ''}`}
              onClick={() => setShowDiscussion(!showDiscussion)}
              title="Toggle Community Discussion & Errata"
              id="btn-toolbar-discussion"
              aria-label="Toggle community discussion & errata rail"
            >
              <MessageSquare size={14} />
              <span className="toolbar-btn-text">Discussion ({comments.length})</span>
            </button>

            <div className="toolbar-divider" />

            {/* Previous Page */}
            <button
              className="toolbar-btn toolbar-btn-icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              title="Previous Page (←)"
              id="btn-page-prev"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page Jump Input */}
            <form onSubmit={handlePageInputSubmit} className="toolbar-page-form">
              <span className="toolbar-page-label">Page</span>
              <input
                type="text"
                className="toolbar-page-input"
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onBlur={handlePageInputSubmit}
                aria-label="Current page number"
                id="input-page-number"
              />
              <span className="toolbar-page-total">of {note.pages}</span>
            </form>

            {/* Next Page */}
            <button
              className="toolbar-btn toolbar-btn-icon"
              onClick={() => setCurrentPage(p => Math.min(note.pages, p + 1))}
              disabled={currentPage >= note.pages}
              title="Next Page (→)"
              id="btn-page-next"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Center Controls: Zoom Level & Presets */}
          <div className="toolbar-group">
            <button
              className="toolbar-btn toolbar-btn-icon"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              title="Zoom Out (-)"
              id="btn-zoom-out"
              aria-label="Zoom out"
            >
              <ZoomOut size={15} />
            </button>

            <span className="toolbar-zoom-indicator mono" title="Current zoom level">
              {zoom}%
            </span>

            <button
              className="toolbar-btn toolbar-btn-icon"
              onClick={handleZoomIn}
              disabled={zoom >= 300}
              title="Zoom In (+)"
              id="btn-zoom-in"
              aria-label="Zoom in"
            >
              <ZoomIn size={15} />
            </button>

            <button
              className="toolbar-btn"
              onClick={handleFitWidth}
              title="Fit to comfortable reading width"
              id="btn-fit-width"
            >
              Fit Width
            </button>

            <button
              className={`toolbar-btn ${zoom === 100 ? 'active' : ''}`}
              onClick={() => setZoom(100)}
              title="Standard 100% Zoom"
              id="btn-zoom-100"
            >
              100%
            </button>

            <button
              className={`toolbar-btn ${zoom === 150 ? 'active' : ''}`}
              onClick={() => setZoom(150)}
              title="Handwriting Magnification (150%)"
              id="btn-zoom-150"
            >
              150% Ink
            </button>
          </div>

          {/* Right Controls: Rotation, Eye Care Reading Modes */}
          <div className="toolbar-group">
            <button
              className="toolbar-btn toolbar-btn-icon"
              onClick={handleRotate}
              title="Rotate 90° Clockwise (R)"
              id="btn-rotate-doc"
              aria-label="Rotate document 90 degrees"
            >
              <RotateCw size={14} />
            </button>

            <div className="toolbar-divider" />

            {/* View Modes */}
            <div className="toolbar-viewmode-group" role="radiogroup" aria-label="Reading surface tone">
              <button
                className={`viewmode-btn ${viewMode === 'paper' ? 'active' : ''}`}
                onClick={() => setViewMode('paper')}
                title="Paper Mode (Standard Alabaster)"
                id="btn-mode-paper"
              >
                Paper
              </button>

              <button
                className={`viewmode-btn ${viewMode === 'sepia' ? 'active' : ''}`}
                onClick={() => setViewMode('sepia')}
                title="Sepia Mode (Warm Eye-Care)"
                id="btn-mode-sepia"
              >
                <Sun size={12} />
                Sepia
              </button>

              <button
                className={`viewmode-btn ${viewMode === 'dark' ? 'active' : ''}`}
                onClick={() => setViewMode('dark')}
                title="Dark Mode (High Contrast)"
                id="btn-mode-dark"
              >
                <Moon size={12} />
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* Reading Progress Indicator Bar */}
        <div className="note-viewer-reading-progress">
          <div
            className="reading-progress-fill"
            style={{ width: `${Math.round((currentPage / note.pages) * 100)}%` }}
            title={`Reading progress: ${Math.round((currentPage / note.pages) * 100)}%`}
          />
        </div>
      </div>

      {/* ================================================================
          3. MAIN DOCUMENT VIEWING CANVAS (Maximized, Distraction-Free)
          ================================================================ */}
      <div className="note-viewer-stage" ref={containerRef} id="note-viewer-stage">
        {/* Optional Page Thumbnails Rail (Collapsible) */}
        {showThumbnails && (
          <aside className="note-viewer-thumbnails-rail" id="thumbnails-rail" aria-label="Page navigation thumbnails">
            <div className="thumbnails-rail-header">
              <span className="mono" style={{ fontSize: '11px', fontWeight: 'var(--weight-semibold)', color: 'var(--color-muted)' }}>
                DOCUMENT PAGES ({note.pages})
              </span>
              <button
                className="btn-icon btn-ghost btn-sm"
                onClick={() => setShowThumbnails(false)}
                title="Close Thumbnails"
              >
                <X size={14} />
              </button>
            </div>

            <div className="thumbnails-rail-list">
              {Array.from({ length: note.pages }).map((_, idx) => {
                const pNum = idx + 1;
                const isSelected = pNum === currentPage;
                const pagePreview = documentPages.find(p => p.pageNumber === pNum);

                return (
                  <div
                    key={pNum}
                    className={`thumbnail-card ${isSelected ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pNum)}
                    id={`thumb-page-${pNum}`}
                  >
                    <div className="thumbnail-paper-preview">
                      <div className="thumbnail-header-mock" />
                      <div className="thumbnail-text-mock-short" />
                      <div className="thumbnail-text-mock" />
                      <div className="thumbnail-text-mock" />
                      <div className="thumbnail-text-mock-short" />
                      <div className="thumbnail-page-number-mock">{pNum}</div>
                    </div>
                    <div className="thumbnail-info">
                      <span className="thumbnail-page-title">
                        {pagePreview ? pagePreview.title.slice(0, 24) : `Page ${pNum}`}
                      </span>
                      <span className="mono text-muted" style={{ fontSize: '10px' }}>
                        Page {pNum}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Central Document Reader Canvas Container */}
        <div className={`note-viewer-canvas-scroll ${viewMode}`} id="canvas-scroll-viewport">
          <div
            className="note-viewer-page-viewport"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 120ms ease-out'
            }}
          >
            {/* The Document Paper Sheet */}
            <article
              className={`academic-paper-sheet ${viewMode}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: 'transform 180ms ease'
              }}
              ref={canvasRef}
              id={`document-sheet-p${currentPage}`}
            >
              {/* Paper Watermark & University Header */}
              <div className="paper-running-header">
                <div className="paper-masthead-left">
                  <BookOpen size={12} className="paper-seal-icon" />
                  <span>ATELIER ACADEMIC NOTES ARCHIVE • {note.subjectCode || 'CS501'}</span>
                </div>
                <div className="paper-masthead-right mono">
                  VERIFIED SYLLABUS DOCUMENT • UNIT {note.unitId ? note.unitId.replace(/^[a-z]+-u/i, '') : '1'}
                </div>
              </div>

              {/* Document Title Banner */}
              <div className="paper-title-banner">
                <div className="paper-format-ribbon">
                  <span>{note.format}</span>
                </div>

                <h2 className="paper-document-title">
                  {activePageData.title}
                </h2>

                <div className="paper-document-subline">
                  <span>{note.subjectName || subject?.name}</span>
                  <span>•</span>
                  <span>{activePageData.subtitle || note.unitName || unit?.name}</span>
                  <span>•</span>
                  <span>Contributed by <strong>{note.author}</strong></span>
                </div>
              </div>

              {/* Document Body Sections */}
              <div className="paper-document-body">
                {activePageData.sections && activePageData.sections.length > 0 ? (
                  activePageData.sections.map((sec, idx) => (
                    <div key={idx} className="paper-section-block">
                      {sec.heading && (
                        <h3 className="paper-section-heading">
                          {sec.heading}
                        </h3>
                      )}

                      {/* Text Section */}
                      {sec.type === 'text' && sec.content && (
                        <p className="paper-section-text">
                          {sec.content}
                        </p>
                      )}

                      {/* Formula Section */}
                      {sec.type === 'formula' && sec.content && (
                        <div className="paper-formula-box">
                          <div className="paper-formula-label mono">MATHEMATICAL FORMULATION</div>
                          <pre className="paper-formula-content">{sec.content}</pre>
                        </div>
                      )}

                      {/* Callout Section */}
                      {sec.type === 'callout' && sec.content && (
                        <div className={`paper-callout-box ${sec.calloutType || 'info'}`}>
                          <Sparkles size={16} className="callout-icon" />
                          <div className="callout-body">
                            <div className="callout-title mono">
                              {sec.calloutType === 'exam_tip' ? 'EXAMINATION HIGH-YIELD TIP' : 'CORE PRINCIPLE'}
                            </div>
                            <p className="callout-text">{sec.content}</p>
                          </div>
                        </div>
                      )}

                      {/* Bullet List Section */}
                      {sec.type === 'bullet_list' && sec.items && (
                        <ul className="paper-bullet-list">
                          {sec.items.map((item, itemIdx) => (
                            <li key={itemIdx} className="paper-bullet-item">
                              <span className="bullet-marker">•</span>
                              <span className="bullet-content">{item}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Table Section */}
                      {sec.type === 'table' && sec.tableData && (
                        <div className="paper-table-wrapper">
                          <table className="paper-table">
                            <thead>
                              <tr>
                                {sec.tableData.headers.map((h, hIdx) => (
                                  <th key={hIdx}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {sec.tableData.rows.map((row, rIdx) => (
                                <tr key={rIdx}>
                                  {row.map((cell, cIdx) => (
                                    <td key={cIdx} className={cIdx === 0 ? 'font-medium' : ''}>
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="paper-default-content">
                    <p className="paper-section-text">
                      {note.description || 'Comprehensive syllabus-aligned lecture notes.'}
                    </p>
                    <div className="paper-formula-box">
                      <pre className="paper-formula-content">
                        {`Core Concept: ${primaryTopic}\nSubject Code: ${note.subjectCode || 'CS501'}\nVerified Unit: ${note.unitName || 'Unit Notes'}`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              {/* Paper Running Footer */}
              <footer className="paper-running-footer">
                <div className="paper-footer-left">
                  <span className="mono">ID: {note.id.toUpperCase()}</span>
                  <span className="paper-footer-sep">•</span>
                  <span>{note.department || 'Computer Science'}</span>
                  <span className="paper-footer-sep">•</span>
                  <span>Semester {note.semester || 5}</span>
                </div>

                <div className="paper-footer-center mono">
                  — Page {currentPage} of {note.pages} —
                </div>

                <div className="paper-footer-right">
                  <span className="paper-verified-stamp">
                    <Check size={11} /> {note.syllabusMatch || 'Syllabus Aligned'}
                  </span>
                </div>
              </footer>
            </article>

            {/* Bottom Quick Page Turner Controls */}
            <div className="document-bottom-turner">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setCurrentPage(p => Math.max(1, p - 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage <= 1}
              >
                <ChevronLeft size={14} /> Previous Page
              </button>

              <span className="mono text-muted" style={{ fontSize: '12px' }}>
                Page {currentPage} of {note.pages}
              </span>

              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setCurrentPage(p => Math.min(note.pages, p + 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                disabled={currentPage >= note.pages}
              >
                Next Page <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Optional Community Discussion & Errata Rail (Collapsible Right Rail) */}
        {showDiscussion && (
          <aside className="note-viewer-discussion-rail" id="discussion-rail" aria-label="Community discussion and errata">
            <div className="discussion-rail-header">
              <div className="discussion-header-title">
                <MessageSquare size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: '13px' }}>Discussion & Errata</span>
                <span className="discussion-count-pill mono">{comments.length}</span>
              </div>
              <button
                className="btn-icon btn-ghost btn-sm"
                onClick={() => setShowDiscussion(false)}
                title="Close Discussion"
              >
                <X size={14} />
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="discussion-filter-pills" role="tablist">
              {(['all', 'Study Tip', 'Errata / Correction', 'Question', 'Key Takeaway'] as const).map(filterKey => {
                const count = filterKey === 'all'
                  ? comments.length
                  : comments.filter(c => (c.category as string) === filterKey || (filterKey === 'Study Tip' && (c.category as string) === 'Exam Tip')).length;
                return (
                  <button
                    key={filterKey}
                    type="button"
                    className={`discussion-filter-pill ${activeCommentFilter === filterKey ? 'active' : ''}`}
                    onClick={() => setActiveCommentFilter(filterKey)}
                  >
                    {filterKey === 'all' ? 'All' : filterKey.split(' ')[0]} ({count})
                  </button>
                );
              })}
            </div>

            {/* New Comment / Contribution Composer Form */}
            <form onSubmit={handleAddComment} className="discussion-composer-card">
              <div className="discussion-category-selector">
                <span className="mono" style={{ fontSize: '10px', color: 'var(--color-muted)', letterSpacing: '0.04em' }}>TYPE:</span>
                <div className="category-chips-row">
                  {(['Study Tip', 'Errata / Correction', 'Question', 'Key Takeaway', 'General'] as const).map(cat => (
                    <button
                      type="button"
                      key={cat}
                      className={`cat-chip-btn ${commentCategory === cat ? 'active' : ''} ${cat.toLowerCase().replace(/[^a-z]/g, '-')}`}
                      onClick={() => setCommentCategory(cat)}
                    >
                      {cat === 'Study Tip' && <Sparkles size={11} />}
                      {cat === 'Errata / Correction' && <AlertTriangle size={11} />}
                      {cat === 'Question' && <HelpCircle size={11} />}
                      {cat === 'Key Takeaway' && <BookOpen size={11} />}
                      <span>{cat === 'Errata / Correction' ? 'Errata' : cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="discussion-input-wrapper">
                <textarea
                  className="discussion-textarea"
                  rows={2}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder={
                    commentCategory === 'Study Tip'
                      ? 'Share a helpful study tip, diagram explanation, or conceptual shortcut…'
                      : commentCategory === 'Errata / Correction'
                      ? 'Point out a formula typo, correction, or clarification in this note…'
                      : commentCategory === 'Question'
                      ? 'Ask a question or request clarification on this unit’s concepts…'
                      : 'Add a helpful comment or note explanation for fellow students…'
                  }
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm discussion-submit-btn"
                  disabled={submittingComment || !commentText.trim()}
                >
                  {submittingComment ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                  <span>Post</span>
                </button>
              </div>
            </form>

            {/* List of Comments */}
            <div className="discussion-comments-list">
              {commentsLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-muted)' }}>
                  <Loader2 size={18} className="spin" style={{ margin: '0 auto var(--space-2)' }} />
                  <span style={{ fontSize: '12px' }}>Loading discussion…</span>
                </div>
              ) : filteredComments.length === 0 ? (
                <div className="discussion-empty-state">
                  <Lightbulb size={24} style={{ color: 'var(--color-muted)', marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--color-muted)' }}>
                    {activeCommentFilter === 'all'
                      ? 'No comments yet. Be the first to share an exam tip or errata note!'
                      : `No posts under "${activeCommentFilter}".`}
                  </p>
                </div>
              ) : (
                filteredComments.map(c => {
                  const isModeratorUser = c.userRole?.toLowerCase() === 'moderator' || c.userRole?.toLowerCase() === 'admin';
                  return (
                    <div key={c.id} className="discussion-comment-card">
                      <div className="comment-card-header">
                        <div className="comment-author-info">
                          <div className={`comment-avatar ${isModeratorUser ? 'moderator' : ''}`}>
                            {c.userInitials}
                          </div>
                          <div className="comment-author-names">
                            <span className="comment-author-name">{c.userName}</span>
                            {isModeratorUser && (
                              <span className="comment-role-badge">Staff</span>
                            )}
                          </div>
                        </div>

                        {c.category && c.category !== 'General' && (
                          <span className={`comment-cat-badge ${c.category.toLowerCase().replace(/[^a-z]/g, '-')}`}>
                            {c.category === 'Exam Tip' && <Sparkles size={10} />}
                            {c.category === 'Errata / Correction' && <AlertTriangle size={10} />}
                            {c.category === 'Question' && <HelpCircle size={10} />}
                            {c.category === 'Key Takeaway' && <BookOpen size={10} />}
                            {c.category === 'Errata / Correction' ? 'Errata' : c.category}
                          </span>
                        )}
                      </div>

                      <div className="comment-card-body">
                        {c.content}
                      </div>

                      <div className="comment-card-footer">
                        <span className="comment-time mono">{c.createdAt}</span>

                        <div className="comment-footer-actions">
                          <button
                            className={`comment-upvote-action ${c.isUpvoted ? 'active' : ''}`}
                            onClick={() => handleToggleCommentUpvote(c.id)}
                            title="Helpful comment"
                          >
                            <ThumbsUp size={12} fill={c.isUpvoted ? 'currentColor' : 'none'} />
                            <span>{c.upvotes || 0}</span>
                          </button>

                          {(c.userId === 'user-student' || isModeratorUser) && (
                            <button
                              className="comment-delete-action"
                              onClick={() => handleDeleteComment(c.id)}
                              title="Delete comment"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ================================================================
          4. REPORT MODAL DIALOG
          ================================================================ */}
      {reportOpen && (
        <div className="modal-overlay" onClick={() => setReportOpen(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Flag size={18} style={{ color: alreadyReported ? 'var(--color-primary)' : 'var(--color-danger)' }} />
                <h3>{reportedSuccess ? 'Report Submitted' : alreadyReported ? 'Report Status' : 'Report Note Resource'}</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setReportOpen(false)} aria-label="Close dialog">
                <X size={16} />
              </button>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1 }}>
              {reportedSuccess ? (
                <div className="report-success-card">
                  <div className="report-success-icon-wrap">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 style={{ margin: 'var(--space-1) 0 2px', fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-deep)' }}>
                    Report Received & Queued
                  </h3>
                  <span className="mono text-muted" style={{ fontSize: '11.5px' }}>
                    Reference: #{submittedReportId || 'm-pending'}
                  </span>

                  <div className="report-note-summary" style={{ width: '100%', marginTop: 'var(--space-2)' }}>
                    <FileText size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                      <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-deep)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {note.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        Flagged for: <strong style={{ color: 'var(--color-deep)' }}>{selectedReason}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="report-assurance-box" style={{ width: '100%', textAlign: 'left' }}>
                    <Info size={18} style={{ color: 'var(--color-secondary)', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      <strong>Non-destructive policy:</strong> This note remains accessible to students in the repository while our moderation team evaluates the report.
                    </div>
                  </div>
                </div>
              ) : alreadyReported ? (
                <div style={{ padding: 'var(--space-3) 0' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.28)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fbbf24',
                    margin: '0 auto var(--space-3)'
                  }}>
                    <AlertCircle size={24} />
                  </div>
                  <h3 style={{ textAlign: 'center', marginBottom: '4px', fontSize: 'var(--text-md)', color: 'var(--color-deep)' }}>
                    Report Pending Review
                  </h3>
                  <p className="text-sm text-muted" style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                    You have already submitted a report for <strong>“{note.title}”</strong>.
                  </p>

                  <div className="report-note-summary" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                      <span className="text-muted">Reason:</span>
                      <strong style={{ color: 'var(--color-deep)' }}>{alreadyReportedInfo?.reason || selectedReason}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                      <span className="text-muted">Status:</span>
                      <span className="report-status-badge report-status-pending">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                        Pending Moderator Review
                      </span>
                    </div>
                    {alreadyReportedInfo?.timestamp && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}>
                        <span className="text-muted">Submitted:</span>
                        <span className="mono text-muted">{alreadyReportedInfo.timestamp}</span>
                      </div>
                    )}
                  </div>

                  <div className="report-assurance-box" style={{ marginTop: 'var(--space-4)' }}>
                    <Info size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                      Submitting a report alerts our review team. The resource remains available to ensure uninterrupted study for classmates.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="report-note-summary">
                    <FileText size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-deep)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {note.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        Topic: {primaryTopic} • {note.pages} pages
                      </div>
                    </div>
                  </div>

                  <div className="report-assurance-box">
                    <Info size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong>Academic Feedback Channel:</strong> Reporting flags issues for human moderator review. Submitting a report <strong>does NOT immediately delete or hide</strong> the note.
                    </div>
                  </div>

                  <p className="text-xs text-muted" style={{ marginBottom: 'var(--space-2)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Select Problem Reason <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </p>

                  <div className="report-reasons-list">
                    {REPORT_REASONS.map(r => {
                      const IconComponent = r.icon;
                      const isSelected = selectedReason === r.label;
                      return (
                        <div
                          key={r.category}
                          className={`report-reason-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedReason(r.label)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setSelectedReason(r.label); }}
                        >
                          <div className="report-reason-icon">
                            <IconComponent size={16} />
                          </div>
                          <div className="report-reason-content">
                            <div className="report-reason-title">{r.label}</div>
                            <div className="report-reason-desc">{r.description}</div>
                          </div>
                          <div className={`radio-dot ${isSelected ? 'checked' : ''}`} />
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                      <label className="text-xs text-muted" style={{ fontWeight: 'var(--weight-medium)' }}>
                        Additional Explanation (Optional)
                      </label>
                      <span className="text-xs text-muted">
                        {reportNotes.length} / 500
                      </span>
                    </div>
                    <textarea
                      className="input"
                      rows={3}
                      maxLength={500}
                      style={{ width: '100%', resize: 'vertical', fontSize: 'var(--text-xs)', lineHeight: '1.5' }}
                      placeholder="Specify page numbers, incorrect equations, or syllabus mismatch details..."
                      value={reportNotes}
                      onChange={e => setReportNotes(e.target.value)}
                    />
                  </div>

                  {reportError && (
                    <div style={{
                      padding: '8px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: 'var(--radius-sm)',
                      color: '#f87171',
                      fontSize: '12px',
                      marginTop: 'var(--space-3)'
                    }}>
                      {reportError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              {reportedSuccess ? (
                <>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setReportOpen(false);
                      setReportedSuccess(false);
                    }}
                  >
                    Continue Reading
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setReportOpen(false);
                      setReportedSuccess(false);
                      navigate('/moderation');
                    }}
                  >
                    <ExternalLink size={14} />
                    Track in My Reports
                  </button>
                </>
              ) : alreadyReported ? (
                <>
                  <button className="btn btn-ghost" onClick={() => setReportOpen(false)}>
                    Close
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setReportOpen(false);
                      navigate('/moderation');
                    }}
                  >
                    <ExternalLink size={14} />
                    View in My Reports
                  </button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={() => setReportOpen(false)} disabled={reportSubmitting}>
                    Cancel
                  </button>
                  <button
                    className="btn"
                    style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: '#fff' }}
                    onClick={handleReportSubmit}
                    disabled={reportSubmitting || !selectedReason}
                    id="btn-submit-report"
                  >
                    {reportSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Flag size={14} />
                        Submit Report
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          SHARE NOTE WITH CLASSMATES MODAL
          ================================================================ */}
      {shareOpen && (
        <div className="modal-backdrop" onClick={() => setShareOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '520px', width: '92%' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Share2 size={18} style={{ color: 'var(--color-primary)' }} />
                <h3 id="share-modal-title" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)' }}>
                  Share Note with Peers
                </h3>
              </div>
              <button
                className="btn-icon"
                onClick={() => setShareOpen(false)}
                aria-label="Close share dialog"
              >
                <X size={16} />
              </button>
            </div>

            <div className="share-modal-body">
              <div>
                <label className="text-xs text-muted" style={{ fontWeight: 'var(--weight-semibold)', display: 'block', marginBottom: '6px' }}>
                  DIRECT STUDY LINK
                </label>
                <div className="share-copy-box">
                  <input
                    type="text"
                    readOnly
                    value={window.location.href}
                    className="share-copy-input"
                  />
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleCopyLink}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <Copy size={13} /> Copy Link
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted" style={{ fontWeight: 'var(--weight-semibold)', display: 'block', marginBottom: '6px' }}>
                  ONE-CLICK SHARING CHANNELS
                </label>
                <div className="share-channel-grid">
                  <div
                    className="share-channel-card"
                    onClick={handleCopyClassMessage}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="share-channel-icon" style={{ background: '#DCFCE7', color: '#166534' }}>
                      💬
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Class WhatsApp</div>
                      <div className="mono text-muted" style={{ fontSize: '10px' }}>Copy formatted text</div>
                    </div>
                  </div>

                  <div
                    className="share-channel-card"
                    onClick={() => {
                      const text = `Check out this note on ${note?.title}: ${window.location.href}`;
                      window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="share-channel-icon" style={{ background: '#E0F2FE', color: '#0369A1' }}>
                      ✈️
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>Telegram Batch</div>
                      <div className="mono text-muted" style={{ fontSize: '10px' }}>Send to channel</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--color-base)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div className="mono text-muted" style={{ fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}>
                  Resource Summary Preview
                </div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-deep)' }}>
                  {note?.title}
                </div>
                <div className="mono text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                  by {note?.author} • {note?.format} • {note?.pages} pages
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShareOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          STUDENT AUTHOR / SCRIBE PROFILE MODAL
          ================================================================ */}
      {authorModalOpen && note && (
        <div className="modal-backdrop" onClick={() => setAuthorModalOpen(false)}>
          <div
            className="modal-card"
            style={{ maxWidth: '580px', width: '92%', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="author-modal-name"
          >
            <div className="modal-header" style={{ padding: '12px 18px' }}>
              <span className="mono text-muted" style={{ fontSize: '11px', letterSpacing: '0.05em' }}>
                STUDENT SCRIBE PROFILE
              </span>
              <button
                className="btn-icon"
                onClick={() => setAuthorModalOpen(false)}
                aria-label="Close author profile"
              >
                <X size={16} />
              </button>
            </div>

            {/* Author Profile Hero */}
            <div className="author-profile-hero">
              <div className="author-hero-avatar">
                {note.authorInitials || 'ST'}
              </div>
              <div className="author-hero-info">
                <h3 className="author-hero-name" id="author-modal-name">
                  {note.author}
                  <span className="badge badge-primary" style={{ fontSize: '10px', padding: '2px 8px' }}>
                    <Award size={11} /> Verified Peer Scribe
                  </span>
                </h3>
                <div className="author-hero-meta">
                  {note.department || 'Academic Department'} • Apex Institute of Technology
                  <br />
                  <span>Shares handwritten lecture notes, formula sheets, and numerical proofs.</span>
                </div>
              </div>
            </div>

            {/* Author Stats Row */}
            <div className="author-stats-grid">
              <div className="author-stat-card">
                <div className="author-stat-val">{authorStats.totalNotes}</div>
                <div className="author-stat-lbl">Notes Shared</div>
              </div>
              <div className="author-stat-card">
                <div className="author-stat-val">{authorStats.totalDownloads}</div>
                <div className="author-stat-lbl">Student Reads</div>
              </div>
              <div className="author-stat-card">
                <div className="author-stat-val">{authorStats.totalUpvotes}</div>
                <div className="author-stat-lbl">Helpful Upvotes</div>
              </div>
            </div>

            {/* All Notes Uploaded by this Student */}
            <div style={{ padding: '12px 20px 4px' }}>
              <div className="mono text-muted" style={{ fontSize: '11px', fontWeight: 'var(--weight-semibold)' }}>
                NOTEBOOKS SHARED BY {note.author.toUpperCase()} ({authorNotes.length})
              </div>
            </div>

            <div className="author-notes-list">
              {authorNotes.length > 0 ? (
                authorNotes.map(n => (
                  <div key={n.id} className="author-note-item">
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-deep)' }}>
                        {n.title}
                      </div>
                      <div className="mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>
                        {n.subjectName || n.subjectId} • {n.format} • {n.pages} pages • {n.downloads || 0} reads
                      </div>
                    </div>
                    {n.id === note.id ? (
                      <span className="chip chip-secondary" style={{ fontSize: '10px' }}>
                        Currently Reading
                      </span>
                    ) : (
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '11px' }}
                        onClick={() => {
                          setAuthorModalOpen(false);
                          navigate(`/notes/${n.id}`);
                        }}
                      >
                        Read Note →
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted" style={{ padding: '16px', textAlign: 'center' }}>
                  Currently viewing this student's uploaded notes.
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', padding: '12px 18px' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setAuthorModalOpen(false)}
              >
                Close Profile
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setAuthorModalOpen(false);
                  navigate(`/notes?q=${encodeURIComponent(note.author)}`);
                }}
              >
                Browse All in Discovery →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
