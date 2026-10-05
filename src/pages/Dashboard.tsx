import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight, AlertTriangle, TrendingUp, Clock, FileText, Search,
  Sparkles, Bookmark, Layers, X, ChevronRight
} from 'lucide-react';
import { api, type DashboardData } from '../services/api';
import { useApp } from '../context/AppContext';
import { notes as fallbackNotes, subjects as fallbackSubjects, type Subject, type NoteResource } from '../data/mockData';

function CoverageRing({ value, size = 40 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const color = value >= 75 ? 'var(--color-secondary)' : value >= 50 ? 'var(--color-warning)' : 'var(--color-primary)';

  return (
    <svg width={size} height={size} className="coverage-ring" aria-label={`${value}% coverage`}>
      <circle className="coverage-ring-bg" cx={size/2} cy={size/2} r={r} />
      <circle
        className="coverage-ring-fill"
        cx={size/2} cy={size/2} r={r}
        stroke={color}
        strokeDasharray={circ}
        strokeDashoffset={offset}
      />
    </svg>
  );
}

// Curated popular topics for instant discovery right on the landing page
const QUICK_TOPICS = [
  'Deadlock',
  'Normalization',
  'TCP Congestion Control',
  'Paging & Segmentation',
  'Scheduling Algorithms',
  'SQL Joins',
  'DFA & NFA'
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { refreshKey } = useApp();

  const [subjectsList, setSubjectsList] = useState<Subject[]>(fallbackSubjects);
  const [notesList, setNotesList] = useState<NoteResource[]>(fallbackNotes);
  const [dashboardStats, setDashboardStats] = useState<DashboardData | null>(null);

  // In-page Topic Discovery State (Connecting Landing Page with Notes Discovery)
  const [topicSearch, setTopicSearch] = useState('');
  const [activeTopicChip, setActiveTopicChip] = useState<string | null>(null);
  const [savedNoteIds, setSavedNoteIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('atelier_saved_notes');
      return stored ? JSON.parse(stored) : ['n3'];
    } catch {
      return ['n3'];
    }
  });

  useEffect(() => {
    api.getSubjects().then(setSubjectsList).catch(() => setSubjectsList(fallbackSubjects));
    api.getNotes().then(liveNotes => {
      // Merge live notes with fallback notes to preserve rich metadata
      const mergedMap = new Map<string, NoteResource>();
      fallbackNotes.forEach(n => mergedMap.set(n.id, n));
      liveNotes.forEach(n => {
        const existing = mergedMap.get(n.id);
        mergedMap.set(n.id, { ...existing, ...n });
      });
      setNotesList(Array.from(mergedMap.values()));
    }).catch(() => setNotesList(fallbackNotes));

    api.getDashboardData().then(setDashboardStats).catch(console.error);
  }, [refreshKey]);

  // Last accessed note or priority note
  const lastNote = notesList.find(n => n.id === 'n3') || notesList[0];

  const frequentTopics = dashboardStats?.frequentExamTopics || [
    { topicName: 'Deadlock Detection & Prevention', subjectName: 'Operating Systems', appearances: 5, streak: 'Appeared 5 yrs running' },
    { topicName: 'Scheduling Algorithms (FCFS, SJF, RR)', subjectName: 'Operating Systems', appearances: 5, streak: 'Appeared 5 yrs running' },
    { topicName: 'Normal Forms (1NF–BCNF)', subjectName: 'Database Management Systems', appearances: 4, streak: 'Appeared 4 yrs running' },
    { topicName: 'TCP Congestion Control (AIMD)', subjectName: 'Computer Networks', appearances: 4, streak: 'Appeared 4 yrs running' },
    { topicName: 'Paging & Segmentation', subjectName: 'Operating Systems', appearances: 3, streak: 'Appeared 3 yrs running' },
  ];

  const recentUploadsList = dashboardStats?.recentUploads || [
    { id: 'n13', title: 'Deadlock Handling: Banker’s Algorithm & RAG', author: 'Priya Sharma', subject: 'Operating Systems', unit: 'Unit 3', format: 'Handwritten PDF', timeAgo: 'Recently' },
    { id: 'n14', title: 'Relational Schema Normalization Cheatsheet', author: 'Sneha Iyer', subject: 'Database Management Systems', unit: 'Unit 3', format: 'Cheatsheet', timeAgo: 'Recently' },
    { id: 'n15', title: 'TCP Congestion Control — Tahoe & Reno', author: 'Ananya Roy', subject: 'Computer Networks', unit: 'Unit 3', format: 'Typed Notes', timeAgo: 'Recently' },
    { id: 'n4', title: 'Memory Management — Paging & Segmentation', author: 'Rohan Das', subject: 'Operating Systems', unit: 'Unit 4', format: 'Handwritten PDF', timeAgo: 'Recently' },
  ];

  // Save / Bookmark Toggle
  const toggleSave = (noteId: string) => {
    setSavedNoteIds(prev => {
      const next = prev.includes(noteId) ? prev.filter(id => id !== noteId) : [...prev, noteId];
      try {
        localStorage.setItem('atelier_saved_notes', JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
      return next;
    });
  };

  // Filter notes on the landing page based on topic search or active chip
  const matchingNotes = useMemo(() => {
    const q = (topicSearch || activeTopicChip || '').trim().toLowerCase();
    if (!q) {
      // Default: show top 4 high-yield study resources
      return notesList.slice(0, 4);
    }
    return notesList.filter(n => {
      const titleMatch = n.title.toLowerCase().includes(q);
      const topicMatch = n.primaryTopic?.toLowerCase().includes(q) || false;
      const topicsListMatch = n.topicNames?.some(t => t.toLowerCase().includes(q)) || false;
      const descMatch = n.description?.toLowerCase().includes(q) || false;
      const subjMatch = n.subjectName?.toLowerCase().includes(q) || n.subjectId?.toLowerCase().includes(q);
      return titleMatch || topicMatch || topicsListMatch || descMatch || subjMatch;
    });
  }, [notesList, topicSearch, activeTopicChip]);

  return (
    <div className="landing-study-space" id="study-space-landing">
      {/* 1. Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 className="page-title">Semester Studio</h1>
            <p className="page-subtitle">
              Computer Science • Semester 5 • Connected Study Space & Topic Discovery
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/notes')}
            id="btn-goto-full-discovery"
          >
            <Layers size={14} /> Full Notes Discovery
          </button>
        </div>
      </div>

      {/* ================================================================
          2. UNIFIED TOPIC DISCOVERY & SEARCH BANNER (Connected with Landing)
          ================================================================ */}
      <section className="landing-discovery-banner" id="landing-discovery-section">
        <div className="discovery-banner-inner">
          <div className="discovery-banner-header">
            <span className="mono discovery-banner-tag">
              <Sparkles size={11} style={{ color: 'var(--color-primary)' }} />
              TOPIC DISCOVERY & INSTANT NOTE VIEWER
            </span>
            <h2 className="discovery-banner-title">
              What topic are you studying today?
            </h2>
            <p className="discovery-banner-subtitle">
              Quickly find verified peer notes, formulas, and worked university exam numericals by topic.
            </p>
          </div>

          {/* Search Box */}
          <div className="discovery-search-wrapper">
            <div className="discovery-search-box">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="search-input"
                placeholder="Search topics like Deadlock, Normalization, TCP Congestion Control, Paging..."
                value={topicSearch}
                onChange={e => {
                  setTopicSearch(e.target.value);
                  if (activeTopicChip) setActiveTopicChip(null);
                }}
                id="landing-topic-search-input"
              />
              {topicSearch && (
                <button
                  className="search-clear-btn"
                  onClick={() => setTopicSearch('')}
                  title="Clear search"
                  aria-label="Clear topic search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Quick Topic Chips */}
            <div className="landing-topic-chips" role="group" aria-label="Popular topic filters">
              <span className="mono text-muted" style={{ fontSize: '11px', alignSelf: 'center', marginRight: '4px' }}>
                POPULAR TOPICS:
              </span>
              {QUICK_TOPICS.map(topic => {
                const isActive = activeTopicChip === topic || topicSearch.toLowerCase() === topic.toLowerCase();
                return (
                  <button
                    key={topic}
                    className={`landing-topic-chip ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (activeTopicChip === topic) {
                        setActiveTopicChip(null);
                        setTopicSearch('');
                      } else {
                        setActiveTopicChip(topic);
                        setTopicSearch(topic);
                      }
                    }}
                    id={`chip-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Connected Live Discovery Notes Results */}
          <div className="landing-discovery-results">
            <div className="discovery-results-header">
              <span className="mono text-muted" style={{ fontSize: '11px' }}>
                {topicSearch || activeTopicChip ? (
                  <>SHOWING {matchingNotes.length} RESOURCES MATCHING “{topicSearch || activeTopicChip}”</>
                ) : (
                  <>FEATURED STUDY RESOURCES ({matchingNotes.length})</>
                )}
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate(`/notes${topicSearch ? `?q=${encodeURIComponent(topicSearch)}` : ''}`)}
                style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)' }}
              >
                View all in Notes Discovery <ArrowRight size={13} />
              </button>
            </div>

            {matchingNotes.length > 0 ? (
              <div className="landing-discovery-list">
                {matchingNotes.slice(0, 4).map(note => {
                  const isSaved = savedNoteIds.includes(note.id);
                  const topicTag = note.primaryTopic || note.topicNames?.[0] || 'Core Notes';

                  return (
                    <article key={note.id} className="landing-note-item" id={`landing-note-${note.id}`}>
                      {/* Left: Topic & Title */}
                      <div className="landing-note-left">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span className="note-topic-badge">
                            {topicTag}
                          </span>
                          <span
                            className="note-subject-pill"
                            onClick={() => navigate(`/subjects/${note.subjectId}`)}
                            title={`View ${note.subjectName} syllabus`}
                          >
                            {note.subjectCode || 'CS'} {note.subjectName}
                          </span>
                          <span className="text-muted" style={{ fontSize: '11px' }}>
                            • {note.unitName}
                          </span>
                        </div>

                        <h3
                          className="landing-note-title"
                          onClick={() => navigate(`/notes/${note.id}`)}
                          title={`Open ${note.title}`}
                        >
                          {note.title}
                        </h3>

                        {note.description && (
                          <p className="landing-note-desc">
                            {note.description}
                          </p>
                        )}

                        <div className="landing-note-meta">
                          <span className="landing-note-author">
                            <span className="landing-author-avatar">{note.authorInitials}</span>
                            {note.author}
                          </span>
                          <span className="meta-sep">•</span>
                          <span className="chip" style={{ fontSize: '10px' }}>{note.format}</span>
                          <span className="meta-sep">•</span>
                          <span>{note.pages} pages</span>
                          {note.fileSizeFormatted && (
                            <>
                              <span className="meta-sep">•</span>
                              <span className="mono">{note.fileSizeFormatted}</span>
                            </>
                          )}
                          <span className="meta-sep">•</span>
                          <span>{note.downloads} downloads</span>
                        </div>
                      </div>

                      {/* Right: Connected Actions (Save & Open Notes) */}
                      <div className="landing-note-actions">
                        <button
                          className={`btn-save ${isSaved ? 'saved' : ''}`}
                          onClick={() => toggleSave(note.id)}
                          title={isSaved ? "Saved in collection" : "Save for later"}
                          aria-label={isSaved ? "Saved" : "Save"}
                        >
                          <Bookmark size={13} fill={isSaved ? 'currentColor' : 'none'} />
                          {isSaved ? 'Saved' : 'Save'}
                        </button>

                        <button
                          className="btn-open-notes"
                          onClick={() => navigate(`/notes/${note.id}`)}
                          id={`landing-btn-open-${note.id}`}
                          aria-label={`Open note document ${note.title}`}
                        >
                          Open Notes
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="landing-no-match">
                <p>No notes found matching “{topicSearch}”. Try searching for <strong>Deadlock</strong>, <strong>Normalization</strong>, or <strong>TCP</strong>.</p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setTopicSearch(''); setActiveTopicChip(null); }}
                  style={{ marginTop: '8px' }}
                >
                  Clear topic search
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================
          3. ACTIVE FOCUS STRIP (All Subjects with Direct Syllabus Links)
          ================================================================ */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-base)', fontFamily: 'var(--font-display)', fontWeight: 'var(--weight-semibold)' }}>
            Course Workspaces
          </h3>
          <span className="mono text-muted" style={{ fontSize: '11px' }}>
            5 ACTIVE COURSES • 2022–2026 SCHEME
          </span>
        </div>

        <div className="dashboard-focus-strip" id="focus-strip">
          {subjectsList.map(s => (
            <div
              key={s.id}
              className="subject-tile"
              onClick={() => navigate(`/subjects/${s.id}`)}
              id={`subject-tile-${s.id}`}
              title={`Open ${s.name} syllabus overview`}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <CoverageRing value={s.coverage} />
                <div>
                  <div className="subject-tile-name">{s.name}</div>
                  <div className="subject-tile-meta">{s.units.length} Units • {s.code}</div>
                </div>
              </div>
              <div className="progress" style={{ height: '3px' }}>
                <div
                  className={`progress-fill ${s.coverage >= 75 ? 'high' : s.coverage >= 50 ? 'medium' : 'low'}`}
                  style={{ width: `${s.coverage}%` }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                <span className="mono text-muted" style={{ fontSize: '11px' }}>
                  {s.coverage}% covered
                </span>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--color-primary)' }}>
                  View Syllabus →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================================================
          4. ASYMMETRIC STUDY DESK (Cross-Connected Reading & Exam Radar)
          ================================================================ */}
      <div className="dashboard-split" id="study-desk">
        {/* Left Column (65%) — Continue Reading & Course Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Resume Deck (Direct Connection to Note Viewer) */}
          {lastNote && (
            <div className="card" id="resume-deck" style={{ borderColor: 'var(--color-primary-muted)' }}>
              <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} style={{ color: 'var(--color-primary)' }} />
                  <h3 style={{ fontSize: 'var(--text-lg)' }}>Continue Note Reading</h3>
                </div>
                <span className="chip chip-secondary">
                  Active Resource
                </span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
                  {/* Document Preview Mini Thumbnail */}
                  <div
                    onClick={() => navigate(`/notes/${lastNote.id}`)}
                    style={{
                      width: '120px',
                      height: '150px',
                      background: '#FFF',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '12px 10px',
                      gap: '6px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-card)',
                      transition: 'transform var(--transition-fast)'
                    }}
                    title={`Open note ${lastNote.title}`}
                  >
                    <div style={{ height: '6px', width: '60%', background: 'var(--color-primary-light)', borderRadius: '1px' }} />
                    <div style={{ height: '4px', width: '100%', background: '#ECEAE5', borderRadius: '1px' }} />
                    <div style={{ height: '4px', width: '85%', background: '#ECEAE5', borderRadius: '1px' }} />
                    <div style={{ height: '4px', width: '95%', background: '#ECEAE5', borderRadius: '1px' }} />
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="mono" style={{ fontSize: '9px', color: 'var(--color-muted)' }}>p. 1</span>
                      <FileText size={12} style={{ color: 'var(--color-primary)' }} />
                    </div>
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="note-topic-badge" style={{ fontSize: '10px' }}>
                        {lastNote.primaryTopic || 'Concurrency & Deadlocks'}
                      </span>
                      <span className="mono text-muted" style={{ fontSize: '11px' }}>
                        {lastNote.subjectCode || 'CS501'} • {lastNote.unitName || 'Unit 3'}
                      </span>
                    </div>

                    <h4
                      style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', cursor: 'pointer' }}
                      onClick={() => navigate(`/notes/${lastNote.id}`)}
                    >
                      {lastNote.title}
                    </h4>
                    <div className="text-sm text-muted">by {lastNote.author} • {lastNote.format}</div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-deep-soft)', lineHeight: '1.5' }}>
                      {lastNote.description || 'Comprehensive notes and numerical problems covering university exam syllabus.'}
                    </p>

                    <div className="mono text-muted" style={{ marginTop: 'auto', fontSize: '11px' }}>
                      {lastNote.pages} Pages • {lastNote.downloads} student downloads
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-sm text-muted">Verified syllabus alignment</span>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/notes/${lastNote.id}`)}
                  id="btn-resume-reading"
                >
                  Open in Document Viewer <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Topic Coverage Alert with Direct Search Connection */}
          <div className="card" style={{ borderColor: 'var(--color-primary-muted)' }} id="coverage-alert">
            <div className="card-body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <AlertTriangle size={18} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-1)', fontSize: 'var(--text-base)' }}>
                  Upcoming Midterm Topic Gap
                </div>
                <p className="text-sm" style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
                  DBMS Unit 3 (Normalization & Functional Dependencies) has only 42% verified coverage in your library.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm"
                    style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary-muted)' }}
                    onClick={() => {
                      setTopicSearch('Normalization');
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                  >
                    <Search size={13} /> Discover Normalization Notes
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => navigate('/subjects/dbms')}
                  >
                    View DBMS Syllabus <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Subject Syllabus Links */}
          <div className="card" id="quick-links">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 'var(--text-lg)' }}>Syllabus Breakdown</h3>
              <span className="mono text-muted" style={{ fontSize: '11px' }}>CLICK SUBJECT TO VIEW UNITS</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {subjectsList.map(s => {
                const totalTopics = s.units.reduce((acc, u) => acc + u.topics.length, 0);
                const coveredTopics = s.units.reduce((acc, u) => acc + u.topics.filter(t => t.status === 'covered').length, 0);
                const missingTopics = s.units.reduce((acc, u) => acc + u.topics.filter(t => t.status === 'missing').length, 0);
                return (
                  <div
                    key={s.id}
                    className="topic-row"
                    style={{ cursor: 'pointer', padding: 'var(--space-4) var(--space-5)' }}
                    onClick={() => navigate(`/subjects/${s.id}`)}
                    id={`subject-row-${s.id}`}
                  >
                    <div className="topic-row-content">
                      <div className="topic-row-name" style={{ fontFamily: 'var(--font-display)' }}>{s.name}</div>
                      <div className="mono text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                        {coveredTopics}/{totalTopics} topics covered
                        {missingTopics > 0 && <span style={{ color: 'var(--color-primary)' }}> • {missingTopics} gap topics</span>}
                      </div>
                    </div>
                    <div className="topic-row-meta">
                      <div className="progress" style={{ width: '80px', height: '3px' }}>
                        <div className={`progress-fill ${s.coverage >= 75 ? 'high' : s.coverage >= 50 ? 'medium' : 'low'}`} style={{ width: `${s.coverage}%` }} />
                      </div>
                      <span className="mono" style={{ fontSize: '11px', color: s.coverage >= 75 ? 'var(--color-secondary)' : s.coverage >= 50 ? '#9A6D18' : 'var(--color-primary)' }}>
                        {s.coverage}%
                      </span>
                      <ArrowRight size={14} style={{ color: 'var(--color-muted)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (35%) — Exam Radar & Recent Peer Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {/* Exam Radar (Clicking any topic directly discovers notes for that topic!) */}
          <div className="card" id="exam-radar">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <TrendingUp size={16} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: 'var(--text-md)' }}>Exam Radar</h3>
              </div>
              <span className="mono text-muted" style={{ fontSize: '10px' }}>CLICK TO DISCOVER</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {frequentTopics.slice(0, 5).map((t, i) => (
                <div
                  key={i}
                  className="topic-row exam-radar-clickable-row"
                  style={{ padding: 'var(--space-3) var(--space-5)', cursor: 'pointer' }}
                  onClick={() => {
                    setTopicSearch(t.topicName);
                    window.scrollTo({ top: 120, behavior: 'smooth' });
                  }}
                  title={`Find notes for ${t.topicName}`}
                >
                  <div style={{ width: '20px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-muted)', textAlign: 'center' }}>
                    {i + 1}
                  </div>
                  <div className="topic-row-content">
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{t.topicName}</div>
                    <div className="mono text-muted" style={{ fontSize: '10px' }}>{t.subjectName}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="pyq-stamp" style={{ fontSize: '9px' }}>
                      {t.appearances}yr
                    </span>
                    <ArrowRight size={12} className="radar-arrow-hover" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Peer Uploads (Clicking opens note directly in Note Viewer!) */}
          <div className="card" id="peer-uploads">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 'var(--text-md)' }}>Recent Peer Uploads</h3>
              <span className="mono text-muted" style={{ fontSize: '10px' }}>CLICK TO READ</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {recentUploadsList.map((u, i) => (
                <div
                  key={i}
                  className="topic-row peer-upload-clickable-row"
                  style={{ padding: 'var(--space-3) var(--space-5)', cursor: 'pointer' }}
                  onClick={() => navigate(`/notes/${u.id || 'n1'}`)}
                  title={`Read note: ${u.title}`}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <FileText size={14} strokeWidth={1.5} />
                  </div>
                  <div className="topic-row-content">
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{u.title}</div>
                    <div className="mono text-muted" style={{ fontSize: '10px' }}>
                      {u.author} • {u.subject}
                    </div>
                  </div>
                  <ArrowRight size={13} style={{ color: 'var(--color-muted)' }} />
                </div>
              ))}
            </div>
          </div>

          {/* Smart Syllabus Gap Recommendation */}
          <div className="card" style={{ background: 'var(--color-secondary-light)', border: '1px solid var(--color-secondary-muted)' }} id="smart-rec">
            <div className="card-body" style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <div className="mono" style={{ fontSize: '10px', color: 'var(--color-secondary)', marginBottom: 'var(--space-2)', letterSpacing: '0.06em' }}>
                SYLLABUS GAP RECOMMENDATION
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-deep-soft)', lineHeight: '1.5' }}>
                Explore 16 verified student notes across Operating Systems, Networks, DBMS, and Theory of Computation.
              </p>
              <button
                className="btn btn-sm"
                style={{ marginTop: 'var(--space-3)', color: 'var(--color-secondary)', borderColor: 'var(--color-secondary-muted)' }}
                onClick={() => navigate('/notes')}
              >
                Browse All Notes <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
