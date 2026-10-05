import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import {
  ArrowLeft, Home, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw,
  Bookmark, Download, Flag, FileText, Check, X,
  Maximize2, Minimize2, Sparkles, BookOpen, Sun, Moon,
  PanelLeftClose, PanelLeft, AlertCircle, RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { notes as fallbackNotes, subjects as fallbackSubjects, type NoteResource, type Subject } from '../data/mockData';
import { getDocumentPages, type NotePageData } from '../data/noteContent';

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
  const [selectedReason, setSelectedReason] = useState('Incorrect Syllabus Mapping');
  const [reportNotes, setReportNotes] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedSuccess, setReportedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Note Data & Loading/Error states
  const [note, setNote] = useState<NoteResource | null>(null);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Saved Notes state from localStorage (synced with Notes Discovery)
  const [isSaved, setIsSaved] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
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

  // Sync saved status with localStorage
  useEffect(() => {
    if (!noteId) return;
    try {
      const stored = localStorage.getItem('atelier_saved_notes');
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        setIsSaved(ids.includes(noteId));
      }
    } catch {
      setIsSaved(false);
    }
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

  // Save / Bookmark Toggle
  const handleToggleSave = () => {
    if (!note) return;
    try {
      const stored = localStorage.getItem('atelier_saved_notes');
      const ids: string[] = stored ? JSON.parse(stored) : [];
      let nextIds: string[];
      if (ids.includes(note.id)) {
        nextIds = ids.filter(id => id !== note.id);
        setIsSaved(false);
        showToast(`Removed “${note.title.slice(0, 32)}...” from saved notes`);
      } else {
        nextIds = [...ids, note.id];
        setIsSaved(true);
        showToast(`Saved “${note.title.slice(0, 32)}...” to your collection`);
      }
      localStorage.setItem('atelier_saved_notes', JSON.stringify(nextIds));
    } catch (err) {
      console.error(err);
    }
  };

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
    if (!note) return;
    setReportSubmitting(true);
    try {
      await api.reportResource({
        resourceName: note.title,
        reason: `${selectedReason}${reportNotes ? ` - Notes: ${reportNotes}` : ''}`
      });
      setReportedSuccess(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportedSuccess(false);
        setReportNotes('');
        showToast('Report submitted for moderation review.');
      }, 1400);
    } catch (err) {
      console.error(err);
      setReportedSuccess(true);
      setTimeout(() => {
        setReportOpen(false);
        setReportedSuccess(false);
      }, 1400);
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

  // Zoom handlers
  const handleZoomIn = () => setZoom(z => Math.min(250, z + 15));
  const handleZoomOut = () => setZoom(z => Math.max(50, z - 15));
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

            {/* Action Buttons: Save/Bookmark, Download, Report, Focus Mode */}
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
                className="note-viewer-btn note-viewer-btn-report"
                onClick={() => setReportOpen(true)}
                id="btn-viewer-report"
                aria-label="Report issue with this note"
              >
                <Flag size={14} />
                <span>Report</span>
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
              <div className="note-viewer-author-badge">
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
          {/* Left Controls: Thumbnails Toggle & Page Navigation */}
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
              disabled={zoom >= 250}
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
              className="toolbar-btn"
              onClick={() => setZoom(100)}
              title="Reset Zoom to 100%"
              id="btn-zoom-reset"
            >
              100%
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
      </div>

      {/* ================================================================
          4. REPORT MODAL DIALOG
          ================================================================ */}
      {reportOpen && (
        <div className="modal-overlay" onClick={() => setReportOpen(false)}>
          <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Flag size={18} style={{ color: 'var(--color-danger)' }} />
                <h3>Report Note Resource</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setReportOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              {reportedSuccess ? (
                <div className="report-success-banner">
                  <Check size={20} />
                  <div>
                    <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-md)' }}>
                      Report Submitted
                    </div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-secondary)', marginTop: '4px' }}>
                      This resource has been flagged for administrative audit in the moderation queue. Thank you for keeping the repository accurate.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-4)' }}>
                    Flagging <strong>“{note.title}”</strong>. Please choose the primary reason for your report:
                  </p>

                  <div className="report-reasons-list">
                    {[
                      'Incorrect Syllabus Mapping',
                      'Bad Scan Quality / Unreadable',
                      'Out of Syllabus',
                      'Missing Pages / Cutoff Content',
                      'Duplicate Resource',
                      'Copyright Violation'
                    ].map(reason => (
                      <div
                        key={reason}
                        className={`report-reason-item ${selectedReason === reason ? 'selected' : ''}`}
                        onClick={() => setSelectedReason(reason)}
                      >
                        <div className={`radio-dot ${selectedReason === reason ? 'checked' : ''}`} />
                        <span className="report-reason-text">{reason}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>
                      Additional Details (Optional)
                    </label>
                    <textarea
                      className="input"
                      rows={3}
                      style={{ width: '100%', resize: 'vertical', fontSize: 'var(--text-xs)' }}
                      placeholder="Specify page numbers or relevant syllabus discrepancies..."
                      value={reportNotes}
                      onChange={e => setReportNotes(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            {!reportedSuccess && (
              <div className="modal-footer">
                <button className="btn" onClick={() => setReportOpen(false)} disabled={reportSubmitting}>
                  Cancel
                </button>
                <button
                  className="btn"
                  style={{ background: 'var(--color-danger)', borderColor: 'var(--color-danger)', color: '#fff' }}
                  onClick={handleReportSubmit}
                  disabled={reportSubmitting}
                  id="btn-submit-report"
                >
                  <Flag size={14} />
                  {reportSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
