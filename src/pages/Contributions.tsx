import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Upload,
  Trash2,
  Star,
  CheckCircle2,
  Search,
  LayoutGrid,
  List,
  Edit3,
  Download,
  BookOpen,
  Clock,
  AlertCircle,
  RotateCcw,
  ChevronDown,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import EditNoteModal from '../components/EditNoteModal';
import type { NoteResource, Subject } from '../data/mockData';

const FORMAT_OPTIONS = [
  'All Formats',
  'Handwritten PDF',
  'Typed Notes',
  'Typed Slides',
  'Lab Manual',
  'Cheatsheet'
];

type SortOption = 'recent' | 'downloads' | 'title' | 'pages';
type ViewMode = 'grid' | 'list';

export default function Contributions() {
  const navigate = useNavigate();
  const { setUploadOpen, refreshKey, triggerRefresh } = useApp();

  // Data State
  const [myUploads, setMyUploads] = useState<NoteResource[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('All Formats');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Edit & Delete State
  const [editingNote, setEditingNote] = useState<NoteResource | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getNotes(),
      api.getUserProfile(),
      api.getSubjects()
    ]).then(([allNotes, profile, subjects]) => {
      setSubjectsList(subjects);
      const userName = profile?.name || '';
      const userId = profile?.id || '';

      // Find notes authored by or uploaded by the authenticated user
      const userNotes = allNotes.filter(n => {
        if (userId && n.userId && n.userId === userId) return true;
        if (userName && n.author && n.author.toLowerCase() === userName.toLowerCase()) return true;
        return false;
      });

      // If user has specific uploads, show them; otherwise fallback to sample uploads for demo
      setMyUploads(userNotes.length > 0 ? userNotes : allNotes.slice(0, 4));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [refreshKey]);

  // Contribution Summary Metrics
  const totalDownloads = useMemo(() => {
    return myUploads.reduce((acc, n) => acc + (n.downloads || 0), 0);
  }, [myUploads]);

  const totalPages = useMemo(() => {
    return myUploads.reduce((acc, n) => acc + (n.pages || 0), 0);
  }, [myUploads]);

  // Contributed subjects for the filter dropdown
  const contributedSubjects = useMemo(() => {
    const ids = new Set(myUploads.map(n => n.subjectId));
    return subjectsList.filter(s => ids.has(s.id));
  }, [myUploads, subjectsList]);

  // Filtered & Sorted Uploads
  const displayedUploads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = myUploads.filter(note => {
      // 1. Text Search
      if (q) {
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesTopic = note.primaryTopic?.toLowerCase().includes(q) || false;
        const matchesSubject = note.subjectName?.toLowerCase().includes(q) || false;
        const matchesCode = note.subjectCode?.toLowerCase().includes(q) || false;
        const matchesUnit = note.unitName?.toLowerCase().includes(q) || false;
        const matchesDesc = note.description?.toLowerCase().includes(q) || false;
        const matchesTags = note.tags?.some(t => t.toLowerCase().includes(q)) || false;

        if (!matchesTitle && !matchesTopic && !matchesSubject && !matchesCode && !matchesUnit && !matchesDesc && !matchesTags) {
          return false;
        }
      }

      // 2. Subject Filter
      if (selectedSubject !== 'all' && note.subjectId !== selectedSubject) {
        return false;
      }

      // 3. Format Filter
      if (selectedFormat !== 'All Formats' && note.format.toLowerCase() !== selectedFormat.toLowerCase()) {
        return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'all') {
        const noteStatus = note.status || 'published';
        if (noteStatus.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.uploadDate || '').getTime() - new Date(a.uploadDate || '').getTime();
      }
      if (sortBy === 'downloads') {
        return (b.downloads || 0) - (a.downloads || 0);
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'pages') {
        return (b.pages || 0) - (a.pages || 0);
      }
      return 0;
    });

    return filtered;
  }, [myUploads, searchQuery, selectedSubject, selectedFormat, selectedStatus, sortBy]);

  // Actions
  const handleDelete = async (noteId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove it from the platform.`)) {
      return;
    }

    setDeletingId(noteId);
    try {
      await api.deleteNote(noteId);
      setMyUploads(prev => prev.filter(n => n.id !== noteId));
      setActionSuccess(`"${title}" has been deleted.`);
      setTimeout(() => setActionSuccess(null), 3500);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (note: NoteResource, e: React.MouseEvent) => {
    e.stopPropagation();
    const element = document.createElement('a');
    element.setAttribute('href', api.getDownloadUrl(note.id));
    element.setAttribute('download', `${note.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleOpenEdit = (note: NoteResource, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingNote(note);
  };

  const handleNoteUpdated = (updated: NoteResource) => {
    setMyUploads(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n));
    setActionSuccess(`Updated details for “${updated.title}”.`);
    setTimeout(() => setActionSuccess(null), 3500);
    triggerRefresh();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedFormat('All Formats');
    setSelectedStatus('all');
    setSortBy('recent');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSubject !== 'all' ||
    selectedFormat !== 'All Formats' ||
    selectedStatus !== 'all' ||
    sortBy !== 'recent';

  // Helper to render publication status badge
  const renderStatusBadge = (status?: string) => {
    const s = (status || 'published').toLowerCase();
    if (s === 'processing') {
      return (
        <span
          className="badge"
          style={{
            background: 'var(--color-warning-light)',
            color: '#b45309',
            border: '1px solid rgba(229, 169, 60, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Clock size={11} /> Indexing
        </span>
      );
    }
    if (s === 'flagged') {
      return (
        <span
          className="badge"
          style={{
            background: 'var(--color-danger-light)',
            color: 'var(--color-danger)',
            border: '1px solid rgba(196, 84, 84, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <AlertCircle size={11} /> Under Review
        </span>
      );
    }
    return (
      <span
        className="badge badge-secondary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
      >
        <CheckCircle2 size={11} /> Published
      </span>
    );
  };

  return (
    <div>
      {/* Edit Note Modal */}
      <EditNoteModal
        note={editingNote}
        isOpen={!!editingNote}
        onClose={() => setEditingNote(null)}
        onSaved={handleNoteUpdated}
      />

      {/* Header */}
      <div className="page-header" style={{ paddingBottom: 'var(--space-2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Upload size={18} />
              </div>
              <h1 className="page-title" style={{ margin: 0 }}>My Uploads</h1>
            </div>
            <p className="page-subtitle" style={{ margin: 'var(--space-1) 0 0' }}>
              Manage your contributed study notes, update syllabus topic mappings, and track peer access.
            </p>

            <div className="library-stats-pills">
              <span className="library-stat-pill">
                <strong>{myUploads.length}</strong> resources shared
              </span>
              <span className="library-stat-pill">
                <strong>{totalDownloads}</strong> peer downloads
              </span>
              <span className="library-stat-pill">
                <strong>{totalPages}</strong> pages contributed
              </span>
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setUploadOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload size={16} /> Upload New Resource
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionSuccess && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          padding: 'var(--space-3) var(--space-4)',
          background: 'var(--color-secondary-light)',
          color: 'var(--color-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          fontSize: 'var(--text-sm)',
          border: '1px solid var(--color-border)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: 'var(--space-12) 0', textAlign: 'center', color: 'var(--color-muted)' }}>
          Loading your contributions...
        </div>
      ) : myUploads.length === 0 ? (
        /* Empty State (0 Uploads) */
        <div className="library-empty-box">
          <div className="library-empty-icon">
            <Upload size={32} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', margin: '0 0 var(--space-2)' }}>
            You haven't contributed any notes yet
          </h2>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: '0 auto var(--space-6)', maxWidth: '440px' }}>
            Share your lecture notes, handwritten formula sheets, or exam solutions with classmates across your department to help fellow students prepare for exams.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => setUploadOpen(true)}
            style={{ padding: 'var(--space-3) var(--space-6)', fontSize: 'var(--text-sm)' }}
          >
            <Upload size={16} /> Upload Your First Resource
          </button>

          <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-5)', textAlign: 'left' }}>
            <span className="mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: 'var(--space-3)' }}>
              TIPS FOR A HIGH-IMPACT CONTRIBUTION
            </span>
            <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-deep-soft)', lineHeight: 1.8 }}>
              <li><strong>Topic-First:</strong> Designate a clear Primary Topic so students finding notes during revision find yours immediately.</li>
              <li><strong>Clean Scans:</strong> Upload legible PDFs or documents with clear headings and formulas.</li>
              <li><strong>Helpful Context:</strong> Mention whether your notes include solved university questions or lab proofs.</li>
            </ul>
          </div>
        </div>
      ) : (
        /* Populated Uploads View */
        <div>
          {/* Interactive Toolbar */}
          <div className="library-toolbar">
            <div className="library-toolbar-left">
              {/* Search Box */}
              <div className="library-search-wrapper">
                <Search size={14} className="library-search-icon" />
                <input
                  type="text"
                  className="library-search-input"
                  placeholder="Filter your uploads by title, topic, or tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="library-search-clear"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Subject Filter */}
              <div className="discovery-select-wrapper">
                <select
                  className="discovery-select"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  aria-label="Filter by subject"
                >
                  <option value="all">All Subjects ({contributedSubjects.length})</option>
                  {contributedSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="discovery-select-arrow" />
              </div>

              {/* Status Filter */}
              <div className="discovery-select-wrapper">
                <select
                  className="discovery-select"
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">All Statuses</option>
                  <option value="published">Published</option>
                  <option value="processing">Indexing</option>
                  <option value="flagged">Under Review</option>
                </select>
                <ChevronDown size={13} className="discovery-select-arrow" />
              </div>

              {/* Format Filter */}
              <div className="discovery-select-wrapper">
                <select
                  className="discovery-select"
                  value={selectedFormat}
                  onChange={e => setSelectedFormat(e.target.value)}
                  aria-label="Filter by format"
                >
                  {FORMAT_OPTIONS.map(fmt => (
                    <option key={fmt} value={fmt}>{fmt}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="discovery-select-arrow" />
              </div>

              {/* Reset button */}
              {hasActiveFilters && (
                <button
                  className="discovery-reset-btn"
                  onClick={resetFilters}
                  title="Reset filters"
                >
                  <RotateCcw size={11} /> Reset
                </button>
              )}
            </div>

            <div className="library-toolbar-right">
              {/* Sort Dropdown */}
              <div className="discovery-select-wrapper">
                <select
                  className="discovery-select"
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as SortOption)}
                  aria-label="Sort uploads"
                >
                  <option value="recent">Sort: Recently Uploaded</option>
                  <option value="downloads">Sort: Most Downloaded</option>
                  <option value="title">Sort: Title (A-Z)</option>
                  <option value="pages">Sort: Page Count</option>
                </select>
                <ChevronDown size={13} className="discovery-select-arrow" />
              </div>

              {/* Grid / List Switcher */}
              <div className="library-view-switcher">
                <button
                  className={`library-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Grid View"
                  aria-label="Grid View"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  className={`library-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title="List View"
                  aria-label="List View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Filter count notice */}
          {hasActiveFilters && (
            <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
              Showing {displayedUploads.length} of {myUploads.length} contributions
            </div>
          )}

          {/* No matches state */}
          {displayedUploads.length === 0 ? (
            <div style={{
              padding: 'var(--space-10) var(--space-6)',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              margin: 'var(--space-4) 0'
            }}>
              <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
                No uploads match your active search or filters.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
                <RotateCcw size={13} /> Clear Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="library-grid">
              {displayedUploads.map(note => {
                const subject = subjectsList.find(s => s.id === note.subjectId);
                const unit = subject?.units.find(u => u.id === note.unitId);
                const subjectName = note.subjectName || subject?.name || 'Course';
                const subjectCode = note.subjectCode || subject?.code || 'CS';
                const unitName = note.unitName || unit?.name || 'Unit Study Resource';
                const displayTopic = note.primaryTopic || 'Core Concept';

                return (
                  <article
                    key={note.id}
                    className="library-card"
                    onClick={() => navigate(`/notes/${note.id}`)}
                  >
                    <div className="library-card-top">
                      <div className="library-card-badges">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {renderStatusBadge(note.status)}
                          <span className="library-topic-star-badge" title="Primary syllabus topic">
                            <Star size={11} fill="currentColor" /> {displayTopic}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Edit details"
                            aria-label={`Edit ${note.title}`}
                            onClick={e => handleOpenEdit(note, e)}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            title="Delete note"
                            aria-label={`Delete ${note.title}`}
                            disabled={deletingId === note.id}
                            onClick={e => handleDelete(note.id, note.title, e)}
                          >
                            <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                          </button>
                        </div>
                      </div>

                      <h3 className="library-card-title" title={`Open ${note.title}`}>
                        {note.title}
                      </h3>

                      <div className="library-academic-path">
                        <span
                          style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-deep-soft)' }}
                          onClick={e => {
                            e.stopPropagation();
                            navigate(`/subjects/${note.subjectId}`);
                          }}
                        >
                          {subjectCode} {subjectName}
                        </span>
                        <span>•</span>
                        <span>{unitName}</span>
                      </div>

                      {note.description && (
                        <p className="library-card-desc">
                          {note.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                        <span className="chip" style={{ fontSize: '11px' }}>{note.format}</span>
                        <span className="chip" style={{ fontSize: '11px' }}>{note.pages} pages</span>
                        <span className="chip" style={{ fontSize: '11px' }}>{note.downloads || 0} downloads</span>
                        {note.tags && note.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="chip" style={{ fontSize: '11px' }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="library-card-footer">
                      <span className="mono text-muted" style={{ fontSize: '11px' }}>
                        Uploaded {note.uploadDate}
                      </span>

                      <div className="library-card-actions">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Download note"
                          aria-label="Download note"
                          onClick={e => handleDownload(note, e)}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                          onClick={e => handleOpenEdit(note, e)}
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                          onClick={() => navigate(`/notes/${note.id}`)}
                        >
                          <BookOpen size={13} /> View Note
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* COMPACT LIST VIEW */
            <div className="library-list">
              {displayedUploads.map(note => {
                const subject = subjectsList.find(s => s.id === note.subjectId);
                const subjectName = note.subjectName || subject?.name || 'Course';
                const subjectCode = note.subjectCode || subject?.code || 'CS';
                const displayTopic = note.primaryTopic || 'Core Concept';

                return (
                  <div
                    key={note.id}
                    className="library-list-row"
                    onClick={() => navigate(`/notes/${note.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          {renderStatusBadge(note.status)}
                          <span className="library-topic-star-badge" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            <Star size={10} fill="currentColor" /> {displayTopic}
                          </span>
                          <span className="mono text-muted" style={{ fontSize: '11px' }}>
                            {subjectCode} {subjectName} • {note.format} • {note.pages}p • {note.downloads || 0} downloads
                          </span>
                        </div>

                        <h4 style={{
                          margin: '3px 0 0',
                          fontSize: 'var(--text-sm)',
                          fontFamily: 'var(--font-display)',
                          color: 'var(--color-deep)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {note.title}
                        </h4>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
                      <span className="mono text-muted" style={{ fontSize: '11px' }}>
                        {note.uploadDate}
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Download note"
                          onClick={e => handleDownload(note, e)}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit details"
                          onClick={e => handleOpenEdit(note, e)}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Delete note"
                          disabled={deletingId === note.id}
                          onClick={e => handleDelete(note.id, note.title, e)}
                        >
                          <Trash2 size={14} style={{ color: 'var(--color-danger)' }} />
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => navigate(`/notes/${note.id}`)}
                        >
                          <BookOpen size={12} /> View
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
