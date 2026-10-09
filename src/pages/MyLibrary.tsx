import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Bookmark,
  BookOpen,
  Download,
  Search,
  LayoutGrid,
  List,
  ArrowRight,
  Star,
  RotateCcw,
  FileText,
  CheckCircle2,
  ChevronDown,
  X,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { savedNotesService, type SavedNoteMeta } from '../services/savedNotes';
import type { Subject } from '../data/mockData';
import { notes as fallbackNotes, subjects as fallbackSubjects } from '../data/mockData';

const FORMAT_OPTIONS = [
  'All Formats',
  'Handwritten PDF',
  'Typed Notes',
  'Typed Slides',
  'Lab Manual',
  'Cheatsheet'
];

type SortOption = 'recentSaved' | 'recentAccessed' | 'title' | 'downloads' | 'pages';
type ViewMode = 'grid' | 'list';

export default function MyLibrary() {
  const navigate = useNavigate();

  // Data State
  const [allNotes, setAllNotes] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() => savedNotesService.getSavedIds());
  const [savedMeta, setSavedMeta] = useState<Record<string, SavedNoteMeta>>(() => savedNotesService.getSavedMeta());
  const [loading, setLoading] = useState(true);

  // Filter & Search State
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'all' | 'notes' | 'pyq'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedUnit, setSelectedUnit] = useState('all');
  const [selectedFormat, setSelectedFormat] = useState('All Formats');
  const [sortBy, setSortBy] = useState<SortOption>('recentSaved');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRemovedNote, setLastRemovedNote] = useState<string | null>(null);

  // Load Notes, PYQs, Subjects & Sync Server Saved Notes
  useEffect(() => {
    setLoading(true);

    Promise.all([
      api.getNotes(),
      api.getPYQs(),
      api.getSubjects(),
      savedNotesService.syncFromServer()
    ]).then(([fetchedNotes, fetchedPyqs, fetchedSubjects, syncedData]) => {
      const mergedMap = new Map<string, any>();
      fallbackNotes.forEach(n => mergedMap.set(n.id, { ...n, resourceType: 'note' }));
      fetchedNotes.forEach(n => {
        const existing = mergedMap.get(n.id);
        mergedMap.set(n.id, { ...existing, ...n, resourceType: 'note' });
      });

      // Merge PYQ question papers so saved PYQs show in My Library
      fetchedPyqs.forEach(p => {
        mergedMap.set(p.id, {
          id: p.id,
          title: p.title || `${p.subjectName || 'Academic'} — ${p.month} ${p.year} Examination Paper`,
          author: p.author || 'Apex Examination Board',
          authorInitials: 'EX',
          subjectId: p.subjectId,
          subjectName: p.subjectName || '',
          subjectCode: p.subjectCode || '',
          unitId: 'all',
          unitName: 'Comprehensive Paper',
          topicIds: [],
          primaryTopic: p.primaryTopic || 'Course Curriculum',
          description: `${p.questionCount} past year questions from ${p.month} ${p.year} examination.`,
          tags: ['pyq', p.examType?.toLowerCase() || 'exam'],
          format: 'Question Paper',
          pages: p.pages || 4,
          filePath: '',
          fileSize: p.fileSize || '1.6 MB',
          uploadDate: p.uploadDate || '2025-08-15',
          downloads: p.downloads || 0,
          topicMatchCount: 1,
          totalTopics: 1,
          syllabusMatch: `${p.questionCount} Questions`,
          resourceType: 'pyq',
          pyqYear: p.year,
          pyqMonth: p.month,
          pyqExamType: p.examType || 'End Semester',
          pyqQuestionCount: p.questionCount
        });
      });

      setAllNotes(Array.from(mergedMap.values()));
      setSubjectsList(fetchedSubjects.length > 0 ? fetchedSubjects : fallbackSubjects);
      setSavedIds(syncedData.ids);
      setSavedMeta(syncedData.meta);
    }).catch(err => {
      console.error('Failed to load library data:', err);
      setAllNotes(fallbackNotes);
      setSubjectsList(fallbackSubjects);
    }).finally(() => {
      setLoading(false);
    });

    // Subscribe to reactive saved note updates
    const unsubscribe = savedNotesService.subscribe((ids, meta) => {
      setSavedIds(ids);
      setSavedMeta(meta);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filter subjects for the unit dropdown
  const currentSubjectObj = subjectsList.find(s => s.id === selectedSubject);
  const availableUnits = currentSubjectObj ? currentSubjectObj.units : [];

  // Filter saved notes list
  const savedNotesList = useMemo(() => {
    return allNotes.filter(n => savedIds.includes(n.id));
  }, [allNotes, savedIds]);

  // Unique subjects present in the student's saved collection
  const savedSubjects = useMemo(() => {
    const subIds = new Set(savedNotesList.map(n => n.subjectId));
    return subjectsList.filter(s => subIds.has(s.id));
  }, [savedNotesList, subjectsList]);

  // Total pages across saved collection
  const totalPagesSaved = useMemo(() => {
    return savedNotesList.reduce((acc, n) => acc + (n.pages || 0), 0);
  }, [savedNotesList]);

  // Filtered and sorted saved notes
  const displayedNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = savedNotesList.filter(note => {
      // 0. Resource Type Filter (Notes vs PYQs)
      if (resourceTypeFilter === 'notes' && note.resourceType === 'pyq') return false;
      if (resourceTypeFilter === 'pyq' && note.resourceType !== 'pyq') return false;

      // 1. Text Search Filter (Topic-First)
      if (q) {
        const matchesPrimaryTopic = note.primaryTopic?.toLowerCase().includes(q) || false;
        const matchesTopicNames = note.topicNames?.some((t: string) => t.toLowerCase().includes(q)) || false;
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesDesc = note.description?.toLowerCase().includes(q) || false;
        const matchesSubject = note.subjectName?.toLowerCase().includes(q) || false;
        const matchesCode = note.subjectCode?.toLowerCase().includes(q) || false;
        const matchesTags = note.tags?.some((t: string) => t.toLowerCase().includes(q)) || false;
        const matchesUnit = note.unitName?.toLowerCase().includes(q) || false;

        if (!matchesPrimaryTopic && !matchesTopicNames && !matchesTitle && !matchesDesc && !matchesSubject && !matchesCode && !matchesTags && !matchesUnit) {
          return false;
        }
      }

      // 2. Subject Filter
      if (selectedSubject !== 'all' && note.subjectId !== selectedSubject) {
        return false;
      }

      // 3. Unit Filter
      if (selectedUnit !== 'all' && note.unitId !== selectedUnit) {
        return false;
      }

      // 4. Format Filter
      if (selectedFormat !== 'All Formats' && note.format.toLowerCase() !== selectedFormat.toLowerCase()) {
        return false;
      }

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sortBy === 'recentSaved') {
        const timeA = savedMeta[a.id]?.savedAt || a.uploadDate || '';
        const timeB = savedMeta[b.id]?.savedAt || b.uploadDate || '';
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      }
      if (sortBy === 'recentAccessed') {
        const timeA = savedMeta[a.id]?.lastAccessedAt || savedMeta[a.id]?.savedAt || a.uploadDate || '';
        const timeB = savedMeta[b.id]?.lastAccessedAt || savedMeta[b.id]?.savedAt || b.uploadDate || '';
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'downloads') {
        return (b.downloads || 0) - (a.downloads || 0);
      }
      if (sortBy === 'pages') {
        return (b.pages || 0) - (a.pages || 0);
      }
      return 0;
    });

    return filtered;
  }, [savedNotesList, searchQuery, selectedSubject, selectedUnit, selectedFormat, sortBy, savedMeta]);

  // Actions
  const handleOpenNote = async (noteId: string) => {
    await savedNotesService.recordNoteAccess(noteId);
    const item = allNotes.find(n => n.id === noteId);
    if (item?.resourceType === 'pyq' || noteId.startsWith('pyq-')) {
      navigate(`/pyq/${noteId}`);
    } else {
      navigate(`/notes/${noteId}`);
    }
  };

  const handleRemoveNote = async (noteId: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await savedNotesService.removeSavedNote(noteId);
    setLastRemovedNote(noteId);
    setToastMessage(`Removed “${title.slice(0, 32)}...” from your library`);
    setTimeout(() => {
      setToastMessage(prev => prev?.includes(title.slice(0, 20)) ? null : prev);
    }, 4000);
  };

  const handleUndoRemove = async () => {
    if (lastRemovedNote) {
      await savedNotesService.saveNote(lastRemovedNote);
      setLastRemovedNote(null);
      setToastMessage('Restored resource to your library');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleDownload = (note: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const isPyq = note.resourceType === 'pyq' || note.id?.startsWith('pyq-');
    const downloadUrl = isPyq ? api.getPYQDownloadUrl(note.id) : api.getDownloadUrl(note.id);
    const element = document.createElement('a');
    element.setAttribute('href', downloadUrl);
    element.setAttribute('download', `${note.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSubject('all');
    setSelectedUnit('all');
    setSelectedFormat('All Formats');
    setSortBy('recentSaved');
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSubject !== 'all' ||
    selectedUnit !== 'all' ||
    selectedFormat !== 'All Formats' ||
    sortBy !== 'recentSaved';

  const formatRelativeTime = (isoString?: string): string => {
    if (!isoString) return 'Recently';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          background: 'var(--color-deep)',
          color: 'white',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: 'var(--text-sm)',
          animation: 'fadeIn 0.2s ease'
        }}>
          <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
          <span>{toastMessage}</span>
          {lastRemovedNote && (
            <button
              onClick={handleUndoRemove}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                color: 'white',
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Undo
            </button>
          )}
          <button
            onClick={() => setToastMessage(null)}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: 2 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Page Header */}
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
                <Bookmark size={18} fill="currentColor" />
              </div>
              <h1 className="page-title" style={{ margin: 0 }}>My Library</h1>
            </div>
            <p className="page-subtitle" style={{ margin: 'var(--space-1) 0 0' }}>
              Your private study collection of saved lecture notes, revision summaries, and exam materials.
            </p>

            <div className="library-stats-pills">
              <span className="library-stat-pill">
                <strong>{savedNotesList.length}</strong> resources saved
              </span>
              <span className="library-stat-pill">
                <strong>{savedSubjects.length}</strong> subjects
              </span>
              <span className="library-stat-pill">
                <strong>{totalPagesSaved}</strong> total pages
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/notes')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Search size={15} /> Discover More Notes
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: 'var(--space-12) 0', textAlign: 'center', color: 'var(--color-muted)' }}>
          Loading your personal study library...
        </div>
      ) : savedNotesList.length === 0 ? (
        /* Thoughtful Empty State (0 Saved Notes) */
        <div className="library-empty-box">
          <div className="library-empty-icon">
            <Bookmark size={32} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', margin: '0 0 var(--space-2)' }}>
            Your personal study collection is empty
          </h2>
          <p className="text-muted" style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: '0 auto var(--space-6)', maxWidth: '440px' }}>
            As you explore syllabus topics in Notes Discovery or read notes in the document viewer, bookmark useful materials to build your curated study space for exams.
          </p>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/notes')}
            style={{ padding: 'var(--space-3) var(--space-6)', fontSize: 'var(--text-sm)' }}
          >
            <Search size={16} /> Explore Notes Discovery
          </button>

          <div style={{ marginTop: 'var(--space-8)', borderTop: '1px solid var(--color-border-light)', paddingTop: 'var(--space-5)' }}>
            <span className="mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: 'var(--space-3)' }}>
              POPULAR SYLLABUS SUBJECTS TO EXPLORE
            </span>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {subjectsList.slice(0, 3).map(sub => (
                <button
                  key={sub.id}
                  className="library-jump-chip"
                  onClick={() => navigate(`/notes?subjectId=${sub.id}`)}
                >
                  <FileText size={12} style={{ color: 'var(--color-primary)' }} />
                  <span>{sub.code} {sub.name}</span>
                  <ArrowRight size={11} style={{ color: 'var(--color-muted)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Populated Library View */
        <div>
          {/* Resource Type Filter Tabs */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '2px' }}>
            <button
              className={`filter-tab ${resourceTypeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setResourceTypeFilter('all')}
            >
              All Resources ({savedNotesList.length})
            </button>
            <button
              className={`filter-tab ${resourceTypeFilter === 'notes' ? 'active' : ''}`}
              onClick={() => setResourceTypeFilter('notes')}
            >
              Study Notes ({savedNotesList.filter(n => n.resourceType !== 'pyq').length})
            </button>
            <button
              className={`filter-tab ${resourceTypeFilter === 'pyq' ? 'active' : ''}`}
              onClick={() => setResourceTypeFilter('pyq')}
            >
              PYQ Question Papers ({savedNotesList.filter(n => n.resourceType === 'pyq').length})
            </button>
          </div>

          {/* Interactive Toolbar */}
          <div className="library-toolbar">
            <div className="library-toolbar-left">
              {/* Search Box */}
              <div className="library-search-wrapper">
                <Search size={14} className="library-search-icon" />
                <input
                  type="text"
                  className="library-search-input"
                  placeholder="Find in saved resources by title, topic, or keyword..."
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
                  onChange={e => {
                    setSelectedSubject(e.target.value);
                    setSelectedUnit('all');
                  }}
                  aria-label="Filter by subject"
                >
                  <option value="all">All Subjects ({savedSubjects.length})</option>
                  {savedSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="discovery-select-arrow" />
              </div>

              {/* Unit Filter (conditional if subject selected) */}
              {availableUnits.length > 0 && selectedSubject !== 'all' && (
                <div className="discovery-select-wrapper">
                  <select
                    className="discovery-select"
                    value={selectedUnit}
                    onChange={e => setSelectedUnit(e.target.value)}
                    aria-label="Filter by unit"
                  >
                    <option value="all">All Units ({availableUnits.length})</option>
                    {availableUnits.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="discovery-select-arrow" />
                </div>
              )}

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
                  aria-label="Sort notes"
                >
                  <option value="recentSaved">Sort: Recently Saved</option>
                  <option value="recentAccessed">Sort: Recently Read</option>
                  <option value="title">Sort: Title (A-Z)</option>
                  <option value="downloads">Sort: Most Downloaded</option>
                  <option value="pages">Sort: Page Count</option>
                </select>
                <ChevronDown size={13} className="discovery-select-arrow" />
              </div>

              {/* Grid / List View Switcher */}
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

          {/* Results Summary if filtering */}
          {hasActiveFilters && (
            <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
              Showing {displayedNotes.length} of {savedNotesList.length} saved study resources
            </div>
          )}

          {/* No Filter Matches State */}
          {displayedNotes.length === 0 ? (
            <div style={{
              padding: 'var(--space-10) var(--space-6)',
              textAlign: 'center',
              background: 'var(--color-surface)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              margin: 'var(--space-4) 0'
            }}>
              <p style={{ margin: '0 0 var(--space-3)', color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
                No saved notes match your active search or filters.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={resetFilters}>
                <RotateCcw size={13} /> Clear Filters
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW */
            <div className="library-grid">
              {displayedNotes.map(note => {
                const subject = subjectsList.find(s => s.id === note.subjectId);
                const unit = subject?.units.find(u => u.id === note.unitId);
                const subjectName = note.subjectName || subject?.name || 'Academic Course';
                const subjectCode = note.subjectCode || subject?.code || 'CS';
                const unitName = note.unitName || unit?.name || 'Unit Study Resource';
                const displayTopic = note.primaryTopic || (note.topicNames && note.topicNames[0]) || 'Core Concept';
                const meta = savedMeta[note.id];

                return (
                  <article
                    key={note.id}
                    className="library-card"
                    onClick={() => handleOpenNote(note.id)}
                  >
                    <div className="library-card-top">
                      <div className="library-card-badges">
                        <span className="library-topic-star-badge" title="Primary syllabus topic">
                          <Star size={11} fill="currentColor" />
                          {displayTopic}
                        </span>

                        <button
                          className="library-unbookmark-btn"
                          title="Remove from your library"
                          aria-label={`Remove ${note.title} from library`}
                          onClick={e => handleRemoveNote(note.id, note.title, e)}
                        >
                          <Bookmark size={15} fill="var(--color-primary)" color="var(--color-primary)" />
                        </button>
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
                        {note.resourceType === 'pyq' ? (
                          <>
                            <span className="chip chip-primary" style={{ fontSize: '11px' }}>
                              📝 {note.pyqExamType || 'Exam Paper'} • {note.pyqMonth} {note.pyqYear}
                            </span>
                            <span className="chip" style={{ fontSize: '11px' }}>
                              {note.pyqQuestionCount || 16} Questions
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="chip" style={{ fontSize: '11px' }}>{note.format}</span>
                            <span className="chip" style={{ fontSize: '11px' }}>{note.pages} pages</span>
                            {note.tags && note.tags.slice(0, 2).map((tag: string) => (
                              <span key={tag} className="chip" style={{ fontSize: '11px' }}>
                                #{tag}
                              </span>
                            ))}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="library-card-footer">
                      <div className="library-access-meta">
                        <span>Saved {formatRelativeTime(meta?.savedAt || note.uploadDate)}</span>
                        {meta?.lastAccessedAt && (
                          <span style={{ color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Clock size={10} /> Read {formatRelativeTime(meta.lastAccessedAt)}
                          </span>
                        )}
                      </div>

                      <div className="library-card-actions">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title={note.resourceType === 'pyq' ? 'Download Question Paper' : 'Download PDF'}
                          aria-label="Download"
                          onClick={e => handleDownload(note, e)}
                        >
                          <Download size={14} />
                        </button>

                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '6px 12px', fontSize: 'var(--text-xs)' }}
                          onClick={() => handleOpenNote(note.id)}
                        >
                          <BookOpen size={13} /> {note.resourceType === 'pyq' ? 'Open Paper' : 'Study Now'}
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
              {displayedNotes.map(note => {
                const subject = subjectsList.find(s => s.id === note.subjectId);
                const subjectName = note.subjectName || subject?.name || 'Course';
                const subjectCode = note.subjectCode || subject?.code || 'CS';
                const displayTopic = note.primaryTopic || 'Core Concept';
                const meta = savedMeta[note.id];
                const isPyq = note.resourceType === 'pyq';

                return (
                  <div
                    key={note.id}
                    className="library-list-row"
                    onClick={() => handleOpenNote(note.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1, minWidth: 0 }}>
                      <button
                        className="library-unbookmark-btn"
                        title="Remove from your library"
                        onClick={e => handleRemoveNote(note.id, note.title, e)}
                      >
                        <Bookmark size={15} fill="var(--color-primary)" color="var(--color-primary)" />
                      </button>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                          <span className="library-topic-star-badge" style={{ fontSize: '10px', padding: '1px 6px' }}>
                            <Star size={10} fill="currentColor" /> {displayTopic}
                          </span>
                          <span className="mono text-muted" style={{ fontSize: '11px' }}>
                            {subjectCode} {subjectName} • {isPyq ? `PYQ Paper (${note.pyqMonth} ${note.pyqYear})` : `${note.format} • ${note.pages}p`}
                          </span>
                        </div>

                        <h4 style={{
                          margin: '2px 0 0',
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexShrink: 0 }}>
                      <div className="library-access-meta" style={{ textAlign: 'right' }}>
                        <span>Saved {formatRelativeTime(meta?.savedAt || note.uploadDate)}</span>
                        {meta?.lastAccessedAt && (
                          <span style={{ color: 'var(--color-secondary)', fontSize: '10px' }}>
                            Read {formatRelativeTime(meta.lastAccessedAt)}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Download"
                          onClick={e => handleDownload(note, e)}
                        >
                          <Download size={14} />
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '11px' }}
                          onClick={() => handleOpenNote(note.id)}
                        >
                          <BookOpen size={12} /> {isPyq ? 'Open Paper' : 'Read'}
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
