import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router';
import {
  Search, X, Bookmark, ArrowRight, Sparkles, Filter, RotateCcw,
  FileText, Download, Check, Calendar, ChevronDown, Layers,
  ThumbsUp, MessageSquare
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { savedNotesService } from '../services/savedNotes';
import { notes as fallbackNotes, subjects as fallbackSubjects, type NoteResource, type Subject } from '../data/mockData';

// Curated popular topics for quick 1-click discovery
const POPULAR_TOPICS = [
  'Deadlock',
  'Normalization',
  'TCP Congestion Control',
  'Paging & Segmentation',
  'Scheduling Algorithms',
  'SQL Joins',
  'DFA & NFA',
  'IP Subnetting'
];

const DEPARTMENTS = [
  'All Departments',
  'Computer Science',
  'Information Technology',
  'Electronics & Communication'
];

const SEMESTERS = ['All Semesters', 'Sem 1', 'Sem 2', 'Sem 3', 'Sem 4', 'Sem 5', 'Sem 6', 'Sem 7', 'Sem 8'];

const FORMATS = [
  'All Types',
  'Handwritten PDF',
  'Typed Notes',
  'Typed Slides',
  'Cheatsheet',
  'Lab Manual'
];

export default function NotesLibrary() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as any) || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshKey } = useApp();

  // Search & Filter States (synced with URL params or navigation state)
  const initialTopicQuery = searchParams.get('q') || navState.searchQuery || '';
  const [searchQuery, setSearchQuery] = useState(initialTopicQuery);
  const [selectedDept, setSelectedDept] = useState(navState.selectedDept || 'All Departments');
  const [selectedSem, setSelectedSem] = useState(navState.selectedSem || 'All Semesters');
  const [selectedSubject, setSelectedSubject] = useState(navState.selectedSubject || 'all');
  const [selectedUnit, setSelectedUnit] = useState(navState.selectedUnit || 'all');
  const [selectedFormat, setSelectedFormat] = useState(navState.selectedFormat || 'All Types');
  const [sortBy, setSortBy] = useState<'relevance' | 'downloads' | 'recent' | 'pages' | 'upvotes'>(navState.sortBy || 'relevance');
  const [showSavedOnly, setShowSavedOnly] = useState(!!navState.showSavedOnly);

  const openNoteDetail = (id: string) => {
    navigate(`/notes/${id}`, {
      state: {
        from: 'discovery',
        searchQuery,
        selectedDept,
        selectedSem,
        selectedSubject,
        selectedUnit,
        selectedFormat,
        sortBy,
        showSavedOnly
      }
    });
  };

  // Saved notes using reactive savedNotesService
  const [savedNoteIds, setSavedNoteIds] = useState<string[]>(() => savedNotesService.getSavedIds());
  const [notesList, setNotesList] = useState<NoteResource[]>(fallbackNotes);
  const [subjectsList, setSubjectsList] = useState<Subject[]>(fallbackSubjects);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = savedNotesService.subscribe((ids) => {
      setSavedNoteIds(ids);
    });
    return () => unsubscribe();
  }, []);

  // Fetch live subjects and notes if API is reachable
  useEffect(() => {
    Promise.all([
      api.getNotes().catch(() => fallbackNotes),
      api.getSubjects().catch(() => fallbackSubjects)
    ]).then(([liveNotes, liveSubjects]) => {
      // Merge live notes with fallback notes to guarantee rich mock topic data
      const mergedMap = new Map<string, NoteResource>();
      fallbackNotes.forEach(n => mergedMap.set(n.id, n));
      liveNotes.forEach(n => {
        const existing = mergedMap.get(n.id);
        mergedMap.set(n.id, { ...existing, ...n });
      });
      setNotesList(Array.from(mergedMap.values()));
      setSubjectsList(liveSubjects && liveSubjects.length ? liveSubjects : fallbackSubjects);
    });
  }, [refreshKey]);

  // Keep URL search query in sync
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      setSearchParams({ q: val }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  // Toggle bookmark/save using shared service
  const toggleSaveNote = async (noteId: string, noteTitle: string) => {
    const isNowSaved = await savedNotesService.toggleSaveNote(noteId);
    setToastMessage(isNowSaved ? `Saved “${noteTitle.slice(0, 30)}...” to your library` : `Removed from your library`);
    setTimeout(() => setToastMessage(null), 2400);
  };

  // Dynamically resolve units based on selected subject
  const currentSubjectObj = subjectsList.find(s => s.id === selectedSubject);
  const availableUnits = currentSubjectObj ? currentSubjectObj.units : [];

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedDept('All Departments');
    setSelectedSem('All Semesters');
    setSelectedSubject('all');
    setSelectedUnit('all');
    setSelectedFormat('All Types');
    setShowSavedOnly(false);
    setSortBy('relevance');
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedDept !== 'All Departments' ||
    selectedSem !== 'All Semesters' ||
    selectedSubject !== 'all' ||
    selectedUnit !== 'all' ||
    selectedFormat !== 'All Types' ||
    showSavedOnly;

  // Filter & Search Logic (Topic-First)
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return notesList.filter(note => {
      // 1. Topic-first search filter
      if (q) {
        const matchesPrimaryTopic = note.primaryTopic?.toLowerCase().includes(q) || false;
        const matchesTopicNames = note.topicNames?.some(t => t.toLowerCase().includes(q)) || false;
        const matchesTitle = note.title.toLowerCase().includes(q);
        const matchesDesc = note.description?.toLowerCase().includes(q) || false;
        const matchesSubject = note.subjectName?.toLowerCase().includes(q) || false;
        const matchesCode = note.subjectCode?.toLowerCase().includes(q) || false;
        const matchesAuthor = note.author.toLowerCase().includes(q);
        const matchesTags = note.tags?.some(t => t.toLowerCase().includes(q)) || false;

        // Also check if any associated topic in subjects list matches
        const subject = subjectsList.find(s => s.id === note.subjectId);
        const subjectTopicMatch = subject?.units.some(u =>
          u.topics.some(t => note.topicIds.includes(t.id) && t.name.toLowerCase().includes(q))
        );

        if (!matchesPrimaryTopic && !matchesTopicNames && !matchesTitle && !matchesDesc && !matchesSubject && !matchesCode && !matchesAuthor && !matchesTags && !subjectTopicMatch) {
          return false;
        }
      }

      // 2. Department filter
      if (selectedDept !== 'All Departments') {
        const dept = note.department || 'Computer Science';
        if (dept.toLowerCase() !== selectedDept.toLowerCase()) return false;
      }

      // 3. Semester filter
      if (selectedSem !== 'All Semesters') {
        const semNum = parseInt(selectedSem.replace(/\D/g, ''), 10);
        const noteSem = note.semester || 5;
        if (noteSem !== semNum) return false;
      }

      // 4. Subject filter
      if (selectedSubject !== 'all' && note.subjectId !== selectedSubject) {
        return false;
      }

      // 5. Unit filter
      if (selectedUnit !== 'all' && note.unitId !== selectedUnit) {
        return false;
      }

      // 6. Format / Resource type filter
      if (selectedFormat !== 'All Types') {
        if (note.format.toLowerCase() !== selectedFormat.toLowerCase()) return false;
      }

      // 7. Saved only
      if (showSavedOnly && !savedNoteIds.includes(note.id)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'upvotes') {
        return (b.upvotes || 0) - (a.upvotes || 0);
      }
      if (sortBy === 'downloads') {
        return b.downloads - a.downloads;
      }
      if (sortBy === 'recent') {
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      }
      if (sortBy === 'pages') {
        return b.pages - a.pages;
      }
      // Default: relevance (exact topic matches first, then downloads)
      if (q) {
        const aTopicExact = a.primaryTopic?.toLowerCase().includes(q) ? 2 : 0;
        const bTopicExact = b.primaryTopic?.toLowerCase().includes(q) ? 2 : 0;
        if (aTopicExact !== bTopicExact) return bTopicExact - aTopicExact;
      }
      return b.downloads - a.downloads;
    });
  }, [notesList, subjectsList, searchQuery, selectedDept, selectedSem, selectedSubject, selectedUnit, selectedFormat, showSavedOnly, sortBy, savedNoteIds]);

  // Helper to format indicator class
  const getFormatClass = (format: string) => {
    const f = format.toLowerCase();
    if (f.includes('pdf')) return 'pdf';
    if (f.includes('slide')) return 'slides';
    if (f.includes('cheat')) return 'cheatsheet';
    if (f.includes('lab')) return 'lab';
    return 'notes';
  };

  return (
    <div className="discovery-page" id="notes-discovery-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--color-deep)',
          color: 'var(--color-surface)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-elevated)',
          fontSize: 'var(--text-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 1000,
          animation: 'fadeIn 150ms ease-out'
        }}>
          <Check size={16} style={{ color: 'var(--color-warning)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Return */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-3)' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/dashboard')}
          id="btn-return-study-space"
          style={{ fontSize: '12px' }}
        >
          ← Back to Study Space
        </button>
      </div>

      {/* 1. Prominent Topic Search Area */}
      <div className="discovery-search-card" id="discovery-search-card">
        <div className="discovery-header-titles">
          <h1 className="discovery-title">Notes Discovery</h1>
          <p className="discovery-subtitle">
            Search peer-reviewed notes, cheat sheets, and solved problems primarily by academic concept or topic
          </p>
        </div>

        {/* Big Search Input */}
        <div className="discovery-input-container">
          <Search size={20} className="discovery-search-icon" />
          <input
            type="text"
            className="discovery-search-input"
            id="topic-search-input"
            placeholder="Search topics, concepts, or algorithms (e.g., “Deadlock”, “Normalization”, “TCP Congestion Control”)..."
            value={searchQuery}
            onChange={e => handleSearchChange(e.target.value)}
            autoComplete="off"
          />
          {searchQuery && (
            <button
              className="discovery-clear-btn"
              onClick={() => handleSearchChange('')}
              title="Clear search"
              aria-label="Clear search query"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Quick Topic Pills / Chips */}
        <div className="discovery-quick-topics" id="quick-topic-chips">
          <span className="discovery-quick-label">
            <Sparkles size={12} style={{ color: 'var(--color-primary)' }} /> Popular Topics:
          </span>
          {POPULAR_TOPICS.map(topic => {
            const isActive = searchQuery.toLowerCase() === topic.toLowerCase();
            return (
              <button
                key={topic}
                className={`discovery-quick-chip ${isActive ? 'active' : ''}`}
                onClick={() => handleSearchChange(isActive ? '' : topic)}
              >
                {topic}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Compact Filter Area for Secondary Context */}
      <div className="discovery-filter-bar" id="discovery-filter-bar">
        <div className="discovery-filter-controls">
          <span className="discovery-filter-label">
            <Filter size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Context:
          </span>

          {/* Department Filter */}
          <div className="discovery-select-wrapper">
            <select
              className="discovery-select"
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              aria-label="Filter by department"
            >
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <ChevronDown size={13} className="discovery-select-arrow" />
          </div>

          {/* Semester Filter */}
          <div className="discovery-select-wrapper">
            <select
              className="discovery-select"
              value={selectedSem}
              onChange={e => setSelectedSem(e.target.value)}
              aria-label="Filter by semester"
            >
              {SEMESTERS.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
            <ChevronDown size={13} className="discovery-select-arrow" />
          </div>

          {/* Subject Filter */}
          <div className="discovery-select-wrapper">
            <select
              className="discovery-select"
              value={selectedSubject}
              onChange={e => {
                setSelectedSubject(e.target.value);
                setSelectedUnit('all'); // reset unit when subject changes
              }}
              aria-label="Filter by subject"
            >
              <option value="all">All Subjects</option>
              {subjectsList.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
            <ChevronDown size={13} className="discovery-select-arrow" />
          </div>

          {/* Unit Filter (dynamic based on selected subject) */}
          <div className="discovery-select-wrapper">
            <select
              className="discovery-select"
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              aria-label="Filter by unit"
            >
              <option value="all">All Units</option>
              {availableUnits.length > 0 ? (
                availableUnits.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))
              ) : (
                <>
                  <option value="Unit 1">Unit 1</option>
                  <option value="Unit 2">Unit 2</option>
                  <option value="Unit 3">Unit 3</option>
                  <option value="Unit 4">Unit 4</option>
                  <option value="Unit 5">Unit 5</option>
                </>
              )}
            </select>
            <ChevronDown size={13} className="discovery-select-arrow" />
          </div>

          {/* Resource Type / Format Filter */}
          <div className="discovery-select-wrapper">
            <select
              className="discovery-select"
              value={selectedFormat}
              onChange={e => setSelectedFormat(e.target.value)}
              aria-label="Filter by resource type"
            >
              {FORMATS.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown size={13} className="discovery-select-arrow" />
          </div>

          {/* Saved Notes Quick Toggle */}
          <button
            className={`discovery-saved-filter-btn ${showSavedOnly ? 'active' : ''}`}
            onClick={() => setShowSavedOnly(prev => !prev)}
            title="Show only notes bookmarked by you"
          >
            <Bookmark size={13} fill={showSavedOnly ? 'currentColor' : 'none'} />
            Saved ({savedNoteIds.length})
          </button>

          {/* Clear / Reset Filters */}
          {hasActiveFilters && (
            <button
              className="discovery-reset-btn"
              onClick={resetFilters}
              title="Reset all filters to default"
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <div className="discovery-sort-control">
          <span>Sort:</span>
          <div className="discovery-select-wrapper">
            <select
              className="discovery-select"
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              aria-label="Sort notes by"
            >
              <option value="relevance">Most Relevant</option>
              <option value="upvotes">Most Helpful (Upvotes)</option>
              <option value="downloads">Most Downloaded</option>
              <option value="recent">Most Recent</option>
              <option value="pages">Page Count</option>
            </select>
            <ChevronDown size={13} className="discovery-select-arrow" />
          </div>
        </div>
      </div>

      {/* 3. Results Meta Header */}
      <div className="discovery-results-meta">
        <span className="discovery-count-text">
          Showing <span className="discovery-count-number">{filteredNotes.length}</span> {filteredNotes.length === 1 ? 'note' : 'notes'}
          {searchQuery.trim() && (
            <> for topic <strong style={{ color: 'var(--color-primary)' }}>“{searchQuery.trim()}”</strong></>
          )}
          {selectedSubject !== 'all' && currentSubjectObj && (
            <> in <strong>{currentSubjectObj.name}</strong></>
          )}
        </span>

        {hasActiveFilters && (
          <span className="text-muted" style={{ fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            Filtered Results
          </span>
        )}
      </div>

      {/* 4. Matching Notes in Clean, Compact List View */}
      {filteredNotes.length > 0 ? (
        <div className="discovery-list" id="discovery-notes-list">
          {filteredNotes.map(note => {
            const subject = subjectsList.find(s => s.id === note.subjectId);
            const unit = subject?.units.find(u => u.id === note.unitId);
            const isSaved = savedNoteIds.includes(note.id);

            // Determine primary display topic
            const displayTopic = note.primaryTopic || (unit?.topics[0]?.name) || 'Core Curriculum Concept';
            const deptText = note.department || 'Computer Science';
            const semText = `Sem ${note.semester || subject?.semester || 5}`;
            const subjectCode = note.subjectCode || subject?.code || 'CS';
            const subjectName = note.subjectName || subject?.name || 'Computer Science';
            const unitName = note.unitName || unit?.name || 'Unit Study Resource';

            return (
              <article
                key={note.id}
                className="discovery-item"
                id={`discovery-note-${note.id}`}
              >
                {/* Visual Format Indicator Stripe */}
                <div className={`discovery-format-indicator ${getFormatClass(note.format)}`} />

                <div className="discovery-item-content">
                  {/* Top Row: Topic Badge & Academic Metadata */}
                  <div className="discovery-item-top">
                    <div className="discovery-item-tags">
                      <span className="discovery-topic-badge">
                        <Sparkles size={11} /> {displayTopic}
                      </span>
                      <div className="discovery-academic-path">
                        <span>{deptText}</span>
                        <span>•</span>
                        <span>{semText}</span>
                        <span>•</span>
                        <span
                          className="discovery-academic-pill"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/subjects/${note.subjectId}`);
                          }}
                          style={{ cursor: 'pointer' }}
                          title={`View ${subjectName} syllabus & units`}
                        >
                          {subjectCode} {subjectName}
                        </span>
                        <span>•</span>
                        <span>{unitName}</span>
                      </div>
                    </div>

                    {note.syllabusMatch && (
                      <span className="discovery-match-badge" title="Syllabus coverage ratio">
                        <Layers size={10} /> {note.syllabusMatch}
                      </span>
                    )}
                  </div>

                  {/* Middle Row: Note Title & Short Description */}
                  <div>
                    <h2
                      className="discovery-item-title"
                      onClick={() => openNoteDetail(note.id)}
                      title={`Open ${note.title}`}
                    >
                      {note.title}
                    </h2>
                    {note.description && (
                      <p className="discovery-item-desc">
                        {note.description}
                      </p>
                    )}
                    {note.tags && note.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                        {note.tags.map(t => (
                          <span
                            key={t}
                            className="chip"
                            style={{ fontSize: '11px', cursor: 'pointer', padding: '2px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSearchQuery(t);
                            }}
                            title={`Filter by tag #${t}`}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Row: File Details, Author & Action Buttons */}
                  <div className="discovery-item-bottom">
                    <div className="discovery-file-info">
                      {/* Author */}
                      <div className="discovery-author">
                        <div className="discovery-author-initials">{note.authorInitials}</div>
                        <span>{note.author}</span>
                      </div>

                      <span className="discovery-info-sep">•</span>

                      {/* Format Badge */}
                      <span className="discovery-format-chip">
                        <FileText size={11} /> {note.format}
                      </span>

                      <span className="discovery-info-sep">•</span>

                      {/* Page Count */}
                      <span>{note.pages} pages</span>

                      {/* File Size */}
                      {note.fileSizeFormatted && (
                        <>
                          <span className="discovery-info-sep">•</span>
                          <span className="mono">{note.fileSizeFormatted}</span>
                        </>
                      )}

                      <span className="discovery-info-sep">•</span>

                      {/* Upload Date */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Calendar size={11} /> {note.uploadDate}
                      </span>

                      <span className="discovery-info-sep">•</span>

                      {/* Downloads */}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <Download size={11} /> {note.downloads} downloads
                      </span>

                      <span className="discovery-info-sep">•</span>

                      {/* Helpful Upvotes */}
                      <span
                        className="discovery-helpful-chip"
                        title={`${note.upvotes || 0} students marked this as helpful`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: (note.upvotes || 0) > 0 ? 'var(--color-primary)' : 'inherit',
                          fontWeight: (note.upvotes || 0) > 0 ? 'var(--weight-semibold)' : 'normal'
                        }}
                      >
                        <ThumbsUp size={11} fill={(note.upvotes || 0) > 0 ? 'currentColor' : 'none'} />
                        <span>{note.upvotes || 0} helpful</span>
                      </span>

                      {note.commentCount !== undefined && note.commentCount > 0 && (
                        <>
                          <span className="discovery-info-sep">•</span>
                          <span
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-deep-soft)' }}
                            title={`${note.commentCount} discussions and errata tips`}
                          >
                            <MessageSquare size={11} />
                            <span>{note.commentCount} discussion</span>
                          </span>
                        </>
                      )}
                    </div>

                    {/* Action Buttons: Save & Open Notes */}
                    <div className="discovery-actions">
                      <button
                        className={`btn-save ${isSaved ? 'saved' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSaveNote(note.id, note.title);
                        }}
                        aria-label={isSaved ? "Remove from saved notes" : "Save note for later"}
                        id={`btn-save-${note.id}`}
                      >
                        <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
                        {isSaved ? 'Saved' : 'Save'}
                      </button>

                      <button
                        className="btn-open-notes"
                        onClick={() => openNoteDetail(note.id)}
                        id={`btn-open-${note.id}`}
                        aria-label={`Open notes for ${note.title}`}
                      >
                        Open Notes
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* 5. Sensible Empty & No-Results States */
        <div className="discovery-no-results" id="discovery-no-results">
          <div className="discovery-no-results-icon">
            <Search size={24} />
          </div>
          <h3 className="discovery-no-results-title">
            {searchQuery ? `No notes found matching “${searchQuery}”` : 'No matching resources found'}
          </h3>
          <p className="discovery-no-results-desc">
            We couldn't find any study notes matching your active query and filters. Try adjusting your search or explore these high-frequency exam topics:
          </p>

          <div className="discovery-suggested-topics">
            {['Deadlock', 'Normalization', 'TCP Congestion Control', 'Paging & Segmentation'].map(topic => (
              <button
                key={topic}
                className="discovery-quick-chip"
                onClick={() => {
                  handleSearchChange(topic);
                  setSelectedDept('All Departments');
                  setSelectedSem('All Semesters');
                  setSelectedSubject('all');
                  setSelectedUnit('all');
                  setSelectedFormat('All Types');
                  setShowSavedOnly(false);
                }}
              >
                <Sparkles size={11} style={{ color: 'var(--color-primary)' }} /> {topic}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary"
            onClick={resetFilters}
            id="btn-reset-discovery-empty"
          >
            <RotateCcw size={14} /> Clear all filters & search
          </button>
        </div>
      )}
    </div>
  );
}
