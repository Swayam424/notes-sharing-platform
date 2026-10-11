import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router';
import {
  Search, X, Bookmark, ArrowRight, Sparkles, Filter, RotateCcw,
  FileText, Download, Check, Calendar, ChevronDown, Layers,
  ThumbsUp, MessageSquare, Plus, Clock, CheckCircle2, Users, BookOpen
} from 'lucide-react';
import { api, type NoteRequest } from '../services/api';
import { useApp } from '../context/AppContext';
import { savedNotesService } from '../services/savedNotes';
import { notes as fallbackNotes, subjects as fallbackSubjects, type NoteResource, type Subject } from '../data/mockData';
import RequestNoteModal from '../components/RequestNoteModal';
import FulfillRequestModal from '../components/FulfillRequestModal';


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
  const { refreshKey, setUploadOpen } = useApp();
  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam === 'requests' || navState.initialTab === 'requests') ? 'requests' : 'browse';
  const [activeView, setActiveView] = useState<'browse' | 'requests'>(initialTab);
  const [noteRequests, setNoteRequests] = useState<NoteRequest[]>([]);
  const [requestStatusFilter, setRequestStatusFilter] = useState<'all' | 'open' | 'fulfilled'>('all');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(!!navState.openRequestModal || searchParams.get('newRequest') === 'true');
  const [fulfillTargetRequest, setFulfillTargetRequest] = useState<NoteRequest | null>(null);

  useEffect(() => {
    if (tabParam === 'requests') {
      setActiveView('requests');
    } else if (tabParam === 'browse') {
      setActiveView('browse');
    }
  }, [tabParam]);

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

  // Fetch live note requests
  useEffect(() => {
    api.getNoteRequests()
      .then(reqs => setNoteRequests(reqs))
      .catch(() => {});
  }, [refreshKey]);

  const handleUpvoteRequest = async (requestId: string) => {
    try {
      const res = await api.upvoteNoteRequest(requestId);
      setNoteRequests(prev => prev.map(r => r.id === requestId ? { ...r, upvotes: res.upvotes, hasUpvoted: res.hasUpvoted } : r));
    } catch (err) {
      console.error('Failed to upvote request:', err);
    }
  };

  const handleRequestFulfilled = (requestId: string, noteId: string, noteTitle: string) => {
    setToastMessage(`Fulfilled request! Linked to “${noteTitle}”`);
    setTimeout(() => setToastMessage(null), 3000);
    setNoteRequests(prev => prev.map(r => r.id === requestId ? {
      ...r,
      status: 'fulfilled',
      fulfilledNoteId: noteId,
      fulfilledNoteTitle: noteTitle
    } : r));
  };

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

  const filteredRequests = useMemo(() => {
    return noteRequests.filter(req => {
      if (requestStatusFilter !== 'all' && req.status !== requestStatusFilter) {
        return false;
      }
      if (selectedSubject !== 'all' && req.subjectId !== selectedSubject) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTopic = req.topicName.toLowerCase().includes(q);
        const matchDesc = req.description?.toLowerCase().includes(q) || false;
        const matchSubj = req.subjectName.toLowerCase().includes(q) || req.subjectCode.toLowerCase().includes(q);
        if (!matchTopic && !matchDesc && !matchSubj) return false;
      }
      return true;
    });
  }, [noteRequests, requestStatusFilter, selectedSubject, searchQuery]);

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
        <div className="discovery-header-titles" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 className="discovery-title">Notes Discovery & Exchange</h1>
            <p className="discovery-subtitle">
              Browse shared peer lecture notes or crowdsource missing lecture derivations from classmates
            </p>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsRequestModalOpen(true)}
            id="btn-open-request-note-modal"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, padding: '7px 14px' }}
          >
            <Plus size={14} /> Request a Note
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', marginBottom: '8px' }}>
          <button
            onClick={() => setActiveView('browse')}
            id="tab-browse-notes"
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeView === 'browse' ? 'var(--color-primary)' : 'var(--color-surface-dim)',
              color: activeView === 'browse' ? 'white' : 'var(--color-deep)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms ease'
            }}
          >
            <BookOpen size={13} /> Browse Notes ({filteredNotes.length})
          </button>

          <button
            onClick={() => setActiveView('requests')}
            id="tab-requested-notes"
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: activeView === 'requests' ? 'var(--color-primary)' : 'var(--color-surface-dim)',
              color: activeView === 'requests' ? 'white' : 'var(--color-deep)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              position: 'relative',
              transition: 'all 150ms ease'
            }}
          >
            <Users size={13} /> Classmate Requests ({noteRequests.filter(r => r.status === 'open').length} Open)
            {noteRequests.filter(r => r.status === 'open').length > 0 && activeView !== 'requests' && (
              <span style={{
                position: 'absolute',
                top: '-3px',
                right: '-3px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary)',
                boxShadow: '0 0 0 2px var(--color-surface)'
              }} />
            )}
          </button>
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

      {activeView === 'browse' ? (
        <>
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
        </>
      ) : (
        /* ================================================================
            COMMUNITY NOTE REQUESTS BOARD
           ================================================================ */
        <div className="discovery-requests-container" style={{ marginTop: 'var(--space-4)' }} id="community-requests-board">
          {/* Sub-Filter Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: 'var(--space-4)',
            padding: '12px 16px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)' }}>Status:</span>
              <button
                className={`btn btn-sm ${requestStatusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRequestStatusFilter('all')}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                All Requests ({noteRequests.length})
              </button>
              <button
                className={`btn btn-sm ${requestStatusFilter === 'open' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRequestStatusFilter('open')}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Waiting for Notes ({noteRequests.filter(r => r.status === 'open').length})
              </button>
              <button
                className={`btn btn-sm ${requestStatusFilter === 'fulfilled' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setRequestStatusFilter('fulfilled')}
                style={{ fontSize: '11px', padding: '4px 10px' }}
              >
                Fulfilled ({noteRequests.filter(r => r.status === 'fulfilled').length})
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Subject quick filter */}
              <div className="discovery-select-wrapper" style={{ margin: 0 }}>
                <select
                  className="discovery-select"
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  style={{ fontSize: '12px', height: '32px', padding: '0 24px 0 10px' }}
                >
                  <option value="all">All Subjects</option>
                  {subjectsList.map(s => (
                    <option key={s.id} value={s.id}>{s.code ? `${s.code} • ` : ''}{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="discovery-select-arrow" />
              </div>
              <span className="mono text-muted" style={{ fontSize: '11px' }}>
                {filteredRequests.length} REQUESTS
              </span>
            </div>
          </div>

          {/* Request Cards Grid */}
          {filteredRequests.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {filteredRequests.map(req => {
                const isOpen = req.status === 'open';
                return (
                  <div
                    key={req.id}
                    className="card"
                    id={`note-request-card-${req.id}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 'var(--radius-lg)',
                      border: isOpen ? '1px solid var(--color-border)' : '1px solid rgba(46, 125, 50, 0.35)',
                      background: isOpen ? 'var(--color-surface)' : 'rgba(232, 245, 233, 0.2)',
                      boxShadow: 'var(--shadow-subtle)',
                      transition: 'transform 150ms ease, box-shadow 150ms ease'
                    }}
                  >
                    <div className="card-body" style={{ padding: '16px' }}>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className="badge badge-primary" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                            {req.subjectCode || req.subjectName}
                          </span>
                          {req.unitName && (
                            <span className="chip" style={{ fontSize: '10px' }}>
                              {req.unitName}
                            </span>
                          )}
                        </div>

                        {isOpen ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#C85A32',
                            background: 'rgba(200, 90, 50, 0.1)',
                            padding: '3px 8px',
                            borderRadius: '12px'
                          }}>
                            <Clock size={11} /> Open
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#2E7D32',
                            background: 'rgba(46, 125, 50, 0.12)',
                            padding: '3px 8px',
                            borderRadius: '12px'
                          }}>
                            <CheckCircle2 size={11} /> Fulfilled
                          </span>
                        )}
                      </div>

                      {/* Topic Title */}
                      <h4 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '15px',
                        fontWeight: 600,
                        lineHeight: 1.35,
                        color: 'var(--color-deep)',
                        marginBottom: '6px'
                      }}>
                        {req.topicName}
                      </h4>

                      {/* Description */}
                      {req.description && (
                        <p style={{
                          fontSize: '12px',
                          color: 'var(--color-muted)',
                          lineHeight: 1.45,
                          marginBottom: '12px'
                        }}>
                          "{req.description}"
                        </p>
                      )}

                      {/* Requester Info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: 'var(--color-primary-light)',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 700
                        }}>
                          {req.requesterInitials}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                          Requested by <strong style={{ color: 'var(--color-deep)' }}>{req.requesterName}</strong> • {req.createdAt}
                        </span>
                      </div>

                      {/* Fulfilled acknowledgment */}
                      {!isOpen && req.fulfilledByName && (
                        <div style={{
                          marginTop: '10px',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(46, 125, 50, 0.08)',
                          fontSize: '11px',
                          color: '#2E7D32',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Sparkles size={12} />
                          <span>Fulfilled by <strong>{req.fulfilledByName}</strong> with <em>"{req.fulfilledNoteTitle || 'Lecture Notes'}"</em></span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="card-footer" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--color-surface-dim)',
                      borderTop: '1px solid var(--color-border)'
                    }}>
                      {/* Upvote / I need this too */}
                      <button
                        onClick={() => handleUpvoteRequest(req.id)}
                        title="Click if you also need notes for this topic"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '5px 10px',
                          borderRadius: 'var(--radius-md)',
                          border: req.hasUpvoted ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                          background: req.hasUpvoted ? 'var(--color-primary-light)' : 'var(--color-surface)',
                          color: req.hasUpvoted ? 'var(--color-primary)' : 'var(--color-muted)',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          transition: 'all 120ms ease'
                        }}
                      >
                        <ThumbsUp size={12} />
                        <span>{req.upvotes} {req.upvotes === 1 ? 'student needs this' : 'students need this'}</span>
                      </button>

                      {/* Action Button */}
                      {isOpen ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setFulfillTargetRequest(req)}
                          style={{ fontSize: '11px', padding: '5px 12px' }}
                        >
                          <Sparkles size={12} /> I Have These Notes
                        </button>
                      ) : req.fulfilledNoteId ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/notes/${req.fulfilledNoteId}`)}
                          style={{ fontSize: '11px', padding: '5px 12px', color: 'var(--color-primary)' }}
                        >
                          View Shared Notes <ArrowRight size={12} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="discovery-no-results" style={{ padding: '40px 20px', textAlign: 'center' }}>
              <div className="discovery-no-results-icon" style={{ margin: '0 auto 12px' }}>
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                No note requests match this filter
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
                Missing notes from a recent lecture or need derivations? Be the first to ask your classmates!
              </p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsRequestModalOpen(true)}
              >
                <Plus size={13} /> Post a Note Request
              </button>
            </div>
          )}
        </div>
      )}

      {/* Request Note Modal */}
      <RequestNoteModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        subjects={subjectsList}
        initialSubjectId={selectedSubject !== 'all' ? selectedSubject : undefined}
        onRequestCreated={newReq => {
          setNoteRequests(prev => [newReq, ...prev]);
          setToastMessage(`Request for “${newReq.topicName}” posted to classmates!`);
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />

      {/* Fulfill Request Modal */}
      <FulfillRequestModal
        isOpen={!!fulfillTargetRequest}
        onClose={() => setFulfillTargetRequest(null)}
        request={fulfillTargetRequest}
        availableNotes={notesList}
        onFulfilled={handleRequestFulfilled}
        onOpenUploadModal={() => setUploadOpen(true)}
      />
    </div>
  );
}

