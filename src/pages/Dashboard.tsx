import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight, AlertTriangle, TrendingUp, Clock, FileText, Search,
  Sparkles, Bookmark, Layers, X, ChevronRight,
  Trophy, Crown, ThumbsUp, MessageSquare, Upload,
  Target, GraduationCap, SlidersHorizontal, Users
} from 'lucide-react';
import { api, type DashboardData, type NoteRequest } from '../services/api';
import { useApp } from '../context/AppContext';
import { savedNotesService } from '../services/savedNotes';
import { notes as fallbackNotes, subjects as fallbackSubjects, type Subject, type NoteResource, type LeaderboardContributor } from '../data/mockData';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshKey, setUploadOpen } = useApp();

  const [subjectsList, setSubjectsList] = useState<Subject[]>(fallbackSubjects);
  const [notesList, setNotesList] = useState<NoteResource[]>(fallbackNotes);
  const [dashboardStats, setDashboardStats] = useState<DashboardData | null>(null);
  const [peerRequests, setPeerRequests] = useState<NoteRequest[]>([]);

  // Enrolled subjects filter
  const enrolledSubjectIds = user?.enrolledSubjects || [];
  const displaySubjects = useMemo(() => {
    if (!enrolledSubjectIds || enrolledSubjectIds.length === 0) {
      return subjectsList;
    }
    const filtered = subjectsList.filter(s => enrolledSubjectIds.includes(s.id));
    return filtered.length > 0 ? filtered : subjectsList;
  }, [subjectsList, enrolledSubjectIds]);

  // Dynamic quick topics derived from student's enrolled courses and syllabus
  const quickTopics = useMemo(() => {
    const names: string[] = [];
    for (const subj of displaySubjects) {
      for (const u of subj.units || []) {
        for (const t of u.topics || []) {
          if (t.name && !names.includes(t.name)) {
            names.push(t.name);
          }
        }
      }
    }
    if (names.length > 0) {
      return names.slice(0, 7);
    }
    return ['Core Concepts', 'Unit 1 Overview', 'Formula Sheet', 'Exam Derivations'];
  }, [displaySubjects]);

  // Contributor Leaderboard State
  const [leaderboard, setLeaderboard] = useState<LeaderboardContributor[]>([]);
  const [leaderboardDept, setLeaderboardDept] = useState<string>('all');
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // In-page Topic Discovery State
  const [topicSearch, setTopicSearch] = useState('');
  const [activeTopicChip, setActiveTopicChip] = useState<string | null>(null);
  const [savedNoteIds, setSavedNoteIds] = useState<string[]>(() => savedNotesService.getSavedIds());

  useEffect(() => {
    const unsubscribe = savedNotesService.subscribe((ids) => {
      setSavedNoteIds(ids);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    api.getSubjects({ stream: user?.stream, semester: user?.semester })
      .then(setSubjectsList)
      .catch(() => setSubjectsList(fallbackSubjects));

    api.getNotes().then(liveNotes => {
      const mergedMap = new Map<string, NoteResource>();
      fallbackNotes.forEach(n => mergedMap.set(n.id, n));
      liveNotes.forEach(n => {
        const existing = mergedMap.get(n.id);
        mergedMap.set(n.id, { ...existing, ...n });
      });
      setNotesList(Array.from(mergedMap.values()));
    }).catch(() => setNotesList(fallbackNotes));

    api.getDashboardData({ stream: user?.stream, semester: user?.semester })
      .then(setDashboardStats)
      .catch(console.error);

    setLeaderboardLoading(true);
    api.getContributorLeaderboard(leaderboardDept)
      .then(data => setLeaderboard(data))
      .catch(console.error)
      .finally(() => setLeaderboardLoading(false));

    api.getNoteRequests({ status: 'open', stream: user?.stream })
      .then(reqs => setPeerRequests(reqs.slice(0, 3)))
      .catch(() => {});
  }, [refreshKey, leaderboardDept, user?.stream, user?.semester]);

  // Stream-specific notes filtered by student's active enrolled subjects
  const enrolledSubjectIdSet = useMemo(() => new Set(displaySubjects.map(s => s.id)), [displaySubjects]);
  const streamNotes = useMemo(() => {
    const filtered = notesList.filter(n => enrolledSubjectIdSet.has(n.subjectId));
    return filtered.length > 0 ? filtered : notesList;
  }, [notesList, enrolledSubjectIdSet]);

  // Last accessed note or priority note for this stream
  const lastNote = streamNotes[0] || notesList[0];

  // Dynamic frequent exam topics calculated from the student's actual enrolled subjects
  const dynamicFrequentTopics = useMemo(() => {
    const list: { topicName: string; subjectName: string; appearances: number; streak: string }[] = [];
    for (const subj of displaySubjects) {
      for (const u of subj.units || []) {
        for (const t of u.topics || []) {
          const app = t.pyqCount || (t.pyqYears ? t.pyqYears.length : 0) || 3;
          list.push({
            topicName: t.name,
            subjectName: subj.name,
            appearances: app,
            streak: `Appeared ${app} yrs running`
          });
        }
      }
    }
    list.sort((a, b) => b.appearances - a.appearances);
    return list.slice(0, 5);
  }, [displaySubjects]);

  const frequentTopics = dynamicFrequentTopics.length > 0
    ? dynamicFrequentTopics
    : (dashboardStats?.frequentExamTopics || [
        { topicName: 'Key Exam Derivations', subjectName: displaySubjects[0]?.name || 'Core Subject', appearances: 5, streak: 'Appeared 5 yrs running' }
      ]);

  // Recent peer uploads adapted to stream notes
  const recentUploadsList = useMemo(() => {
    if (streamNotes.length > 0) {
      return streamNotes.slice(0, 4).map(n => ({
        id: n.id,
        title: n.title,
        author: n.author,
        format: n.format,
        subject: n.subjectName || displaySubjects.find(s => s.id === n.subjectId)?.name || 'Course Note',
        unit: n.unitName || 'Unit 1',
        timeAgo: 'Recently'
      }));
    }
    return dashboardStats?.recentUploads || [];
  }, [streamNotes, displaySubjects, dashboardStats]);

  // Lowest coverage subject in active roster for the Midterm Gap Alert
  const lowestCoverageSubject = useMemo(() => {
    if (displaySubjects.length === 0) return null;
    return [...displaySubjects].sort((a, b) => (a.coverage || 0) - (b.coverage || 0))[0];
  }, [displaySubjects]);

  const gapUnitAndTopic = useMemo(() => {
    if (!lowestCoverageSubject) return null;
    for (const u of lowestCoverageSubject.units || []) {
      const gapTopic = u.topics?.find(t => t.status === 'missing' || t.status === 'partial');
      if (gapTopic) {
        return { unitName: u.name, topicName: gapTopic.name };
      }
    }
    const firstUnit = lowestCoverageSubject.units?.[0];
    const firstTopic = firstUnit?.topics?.[0];
    return {
      unitName: firstUnit?.name || 'Unit 1',
      topicName: firstTopic?.name || lowestCoverageSubject.name
    };
  }, [lowestCoverageSubject]);

  // Save / Bookmark Toggle
  const toggleSave = async (noteId: string) => {
    await savedNotesService.toggleSaveNote(noteId);
  };

  // Filter notes on the landing page based on topic search or active chip
  const matchingNotes = useMemo(() => {
    const q = (topicSearch || activeTopicChip || '').trim().toLowerCase();
    if (!q) {
      return streamNotes.slice(0, 4);
    }
    const pool = streamNotes.length > 0 ? streamNotes : notesList;
    const matched = pool.filter(n => {
      const titleMatch = n.title.toLowerCase().includes(q);
      const topicMatch = n.primaryTopic?.toLowerCase().includes(q) || false;
      const topicsListMatch = n.topicNames?.some(t => t.toLowerCase().includes(q)) || false;
      const descMatch = n.description?.toLowerCase().includes(q) || false;
      const subjMatch = n.subjectName?.toLowerCase().includes(q) || n.subjectId?.toLowerCase().includes(q);
      return titleMatch || topicMatch || topicsListMatch || descMatch || subjMatch;
    });
    if (matched.length === 0 && pool !== notesList) {
      // Fallback search across all notes
      return notesList.filter(n => {
        const titleMatch = n.title.toLowerCase().includes(q);
        const topicMatch = n.primaryTopic?.toLowerCase().includes(q) || false;
        const topicsListMatch = n.topicNames?.some(t => t.toLowerCase().includes(q)) || false;
        const descMatch = n.description?.toLowerCase().includes(q) || false;
        const subjMatch = n.subjectName?.toLowerCase().includes(q) || n.subjectId?.toLowerCase().includes(q);
        return titleMatch || topicMatch || topicsListMatch || descMatch || subjMatch;
      });
    }
    return matched;
  }, [streamNotes, notesList, topicSearch, activeTopicChip]);

  return (
    <div className="landing-study-space" id="study-space-landing">
      {/* 1. Page Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                <GraduationCap size={12} /> {user?.degree || 'B.Tech / B.E.'}
              </span>
              {user?.academicGoal && (
                <span className="chip chip-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
                  <Target size={11} /> {user.academicGoal}
                </span>
              )}
            </div>
            <h1 className="page-title">{user?.stream || 'Computer Science & Engineering'} Studio</h1>
            <p className="page-subtitle">
              Semester {user?.semester || 5} • {user?.college || 'Apex Institute of Technology'} • {displaySubjects.length} Active Enrolled Courses
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/onboarding')}
              title="Change your enrolled stream, semester, or subjects"
              style={{ fontSize: '12px' }}
            >
              <SlidersHorizontal size={13} /> Tune Stream & Roster
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/notes')}
              id="btn-goto-full-discovery"
            >
              <Layers size={14} /> Full Notes Discovery
            </button>
          </div>
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
                placeholder={quickTopics.length > 0 ? `Search topics like ${quickTopics.slice(0, 3).join(', ')}...` : 'Search study topics...'}
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
              {quickTopics.map(topic => {
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
                          <span className="meta-sep">•</span>
                          <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: (note.upvotes || 0) > 0 ? 'var(--color-primary)' : 'inherit' }}>
                            <ThumbsUp size={11} fill={(note.upvotes || 0) > 0 ? 'currentColor' : 'none'} />
                            {note.upvotes || 0} helpful
                          </span>
                          {note.commentCount !== undefined && note.commentCount > 0 && (
                            <>
                              <span className="meta-sep">•</span>
                              <span className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <MessageSquare size={11} /> {note.commentCount} discussion
                              </span>
                            </>
                          )}
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
                <p>
                  No notes found matching “{topicSearch}”. Try searching for{' '}
                  {quickTopics.slice(0, 3).map((t, idx) => (
                    <strong key={t}>
                      {t}{idx < Math.min(quickTopics.length, 3) - 1 ? ', ' : ''}
                    </strong>
                  ))} or browse all notes.
                </p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="mono text-muted" style={{ fontSize: '11px' }}>
              {displaySubjects.length} ENROLLED COURSES • SEMESTER {user?.semester || 5}
            </span>
            <button
              onClick={() => navigate('/onboarding')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '11px',
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              Edit Courses
            </button>
          </div>
        </div>

        <div className="dashboard-focus-strip" id="focus-strip">
          {displaySubjects.map(s => (
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

          {/* Syllabus Notes Coverage Gap with Direct Search Connection */}
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
                  Syllabus Notes Coverage Gap
                </div>
                <p className="text-sm" style={{ color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
                  {lowestCoverageSubject ? (
                    `${lowestCoverageSubject.name} ${gapUnitAndTopic?.unitName ? `(${gapUnitAndTopic.unitName}: ${gapUnitAndTopic.topicName})` : ''} has only ${lowestCoverageSubject.coverage || 42}% verified notes coverage in your peer library.`
                  ) : (
                    'Review your course units to identify missing peer notes and contribute.'
                  )}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm"
                    style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary-muted)' }}
                    onClick={() => {
                      if (gapUnitAndTopic?.topicName) {
                        setTopicSearch(gapUnitAndTopic.topicName);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }
                    }}
                  >
                    <Search size={13} /> Discover {gapUnitAndTopic?.topicName || 'Gap Topic'} Notes
                  </button>
                  {lowestCoverageSubject && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => navigate(`/subjects/${lowestCoverageSubject.id}`)}
                    >
                      View {lowestCoverageSubject.code || lowestCoverageSubject.name} Syllabus <ChevronRight size={13} />
                    </button>
                  )}
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
          {/* Trending Study Topics (Clicking any topic directly discovers notes for that topic!) */}
          <div className="card" id="exam-radar">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <TrendingUp size={16} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: 'var(--text-md)' }}>Trending Study Topics</h3>
              </div>
              <span className="mono text-muted" style={{ fontSize: '10px' }}>MOST READ BY PEERS</span>
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

          {/* Classmate Notes Exchange (Crowdsourced Note Requests) */}
          <div className="card" id="classmate-requests-card" style={{ borderColor: 'var(--color-primary-muted)' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Users size={16} style={{ color: 'var(--color-primary)' }} />
                <h3 style={{ fontSize: 'var(--text-md)' }}>Classmate Note Requests</h3>
              </div>
              <span className="badge badge-primary" style={{ fontSize: '10px' }}>
                {peerRequests.length > 0 ? `${peerRequests.length} Open` : 'Peer Board'}
              </span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {peerRequests.length > 0 ? (
                peerRequests.map(req => (
                  <div
                    key={req.id}
                    className="topic-row"
                    style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <div style={{
                      minWidth: '34px',
                      padding: '3px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      fontSize: '11px',
                      fontWeight: 'var(--weight-semibold)',
                      flexShrink: 0
                    }}>
                      <ThumbsUp size={11} style={{ marginBottom: '2px' }} />
                      {req.upvotes}
                    </div>
                    <div className="topic-row-content" style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {req.topicName}
                      </div>
                      <div className="mono text-muted" style={{ fontSize: '10px' }}>
                        {req.subjectCode || req.subjectName} • Asked by {req.requesterName}
                      </div>
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}
                      onClick={() => navigate('/notes?tab=requests')}
                      title="Help a classmate by fulfilling this request"
                    >
                      Share Note
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)', fontSize: 'var(--text-xs)' }}>
                  No open requests right now in your stream.
                </div>
              )}
            </div>
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) var(--space-4)' }}>
              <button
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11px', padding: 0, color: 'var(--color-primary)' }}
                onClick={() => navigate('/notes?tab=requests')}
              >
                View Community Board →
              </button>
              <button
                className="btn btn-primary btn-sm"
                style={{ fontSize: '11px', padding: '4px 10px' }}
                onClick={() => navigate('/notes?tab=requests&newRequest=true')}
              >
                + Request a Note
              </button>
            </div>
          </div>

          {/* Community Notes Spotlight */}
          <div className="card" style={{ background: 'var(--color-secondary-light)', border: '1px solid var(--color-secondary-muted)' }} id="smart-rec">
            <div className="card-body" style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <div className="mono" style={{ fontSize: '10px', color: 'var(--color-secondary)', marginBottom: 'var(--space-2)', letterSpacing: '0.06em' }}>
                COMMUNITY NOTES SPOTLIGHT
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-deep-soft)', lineHeight: '1.5' }}>
                Explore verified student notes across {displaySubjects.length > 0 ? displaySubjects.slice(0, 4).map(s => s.name).join(', ') : 'your active courses'}.
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

      {/* ================================================================
          5. HALL OF SCRIBES — CONTRIBUTOR LEADERBOARD (Student Social Layer)
          ================================================================ */}
      <section className="dashboard-leaderboard-section" id="contributor-leaderboard">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Trophy size={18} style={{ color: 'var(--color-primary)' }} />
                <h2 style={{ fontSize: 'var(--text-lg)', margin: 0, fontFamily: 'var(--font-display)' }}>
                  Hall of Scribes — Contributor Leaderboard
                </h2>
              </div>
              <p className="text-sm text-muted" style={{ margin: '4px 0 0' }}>
                Recognizing peer contributors who write comprehensive lecture notes, verified numericals, and syllabus guides.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <div className="leaderboard-dept-toggle">
                <button
                  type="button"
                  className={`leaderboard-toggle-btn ${leaderboardDept === 'all' ? 'active' : ''}`}
                  onClick={() => setLeaderboardDept('all')}
                >
                  All Depts
                </button>
                <button
                  type="button"
                  className={`leaderboard-toggle-btn ${leaderboardDept !== 'all' ? 'active' : ''}`}
                  onClick={() => setLeaderboardDept(user?.department || user?.stream || 'Computer Science')}
                >
                  {user?.department || (user?.stream ? user.stream.split(' ')[0] : 'My Branch')}
                </button>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => setUploadOpen(true)}
                id="btn-leaderboard-upload-cta"
              >
                <Upload size={13} />
                <span>Upload Notes</span>
              </button>
            </div>
          </div>

          <div className="card-body" style={{ padding: 'var(--space-5)' }}>
            {leaderboardLoading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-muted)' }}>
                <span className="mono" style={{ fontSize: '12px' }}>Loading contributor standings…</span>
              </div>
            ) : leaderboard.length >= 3 && (
              <div className="leaderboard-podium-grid">
                {/* 2nd Place */}
                <div className="podium-card rank-2">
                  <div className="podium-medal-badge silver">
                    <span>2nd</span>
                  </div>
                  <div className="podium-avatar silver">
                    {leaderboard[1].initials}
                  </div>
                  <h3 className="podium-name">{leaderboard[1].name}</h3>
                  <span className="podium-tier-pill silver">{leaderboard[1].badge}</span>
                  <div className="podium-score mono">
                    {leaderboard[1].reputationScore.toLocaleString()} pts
                  </div>
                  <div className="podium-stats-row text-muted mono">
                    <span>{leaderboard[1].totalUploads} uploads</span>
                    <span>•</span>
                    <span>{leaderboard[1].totalUpvotes} helpful</span>
                  </div>
                  <span className="podium-college">{leaderboard[1].college}</span>
                </div>

                {/* 1st Place */}
                <div className="podium-card rank-1">
                  <div className="podium-crown-icon">
                    <Crown size={22} style={{ color: '#d97706' }} />
                  </div>
                  <div className="podium-medal-badge gold">
                    <span>1st</span>
                  </div>
                  <div className="podium-avatar gold">
                    {leaderboard[0].initials}
                  </div>
                  <h3 className="podium-name">{leaderboard[0].name}</h3>
                  <span className="podium-tier-pill gold">{leaderboard[0].badge}</span>
                  <div className="podium-score mono">
                    {leaderboard[0].reputationScore.toLocaleString()} pts
                  </div>
                  <div className="podium-stats-row text-muted mono">
                    <span>{leaderboard[0].totalUploads} uploads</span>
                    <span>•</span>
                    <span>{leaderboard[0].totalUpvotes} helpful</span>
                  </div>
                  <span className="podium-college">{leaderboard[0].college}</span>
                </div>

                {/* 3rd Place */}
                <div className="podium-card rank-3">
                  <div className="podium-medal-badge bronze">
                    <span>3rd</span>
                  </div>
                  <div className="podium-avatar bronze">
                    {leaderboard[2].initials}
                  </div>
                  <h3 className="podium-name">{leaderboard[2].name}</h3>
                  <span className="podium-tier-pill bronze">{leaderboard[2].badge}</span>
                  <div className="podium-score mono">
                    {leaderboard[2].reputationScore.toLocaleString()} pts
                  </div>
                  <div className="podium-stats-row text-muted mono">
                    <span>{leaderboard[2].totalUploads} uploads</span>
                    <span>•</span>
                    <span>{leaderboard[2].totalUpvotes} helpful</span>
                  </div>
                  <span className="podium-college">{leaderboard[2].college}</span>
                </div>
              </div>
            )}

            {/* Runners-up Table */}
            <div className="leaderboard-table-wrapper" style={{ marginTop: 'var(--space-5)' }}>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th style={{ width: '48px', textAlign: 'center' }}>Rank</th>
                    <th>Scribe</th>
                    <th>Department</th>
                    <th style={{ textAlign: 'center' }}>Uploads</th>
                    <th style={{ textAlign: 'center' }}>Helpful Votes</th>
                    <th style={{ textAlign: 'right' }}>Reputation</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map(item => (
                    <tr key={item.userId} className={item.rank <= 3 ? `top-rank-row rank-${item.rank}` : ''}>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`rank-number-chip ${item.rank <= 3 ? `rank-${item.rank}` : ''}`}>
                          #{item.rank}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className={`table-scribe-avatar ${item.rank <= 3 ? `rank-${item.rank}` : ''}`}>
                            {item.initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-deep)' }}>
                              {item.name}
                            </div>
                            <span className="mono text-muted" style={{ fontSize: '10.5px' }}>
                              {item.badge}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)' }}>
                        {item.department}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>
                        {item.totalUploads}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-primary)' }}>
                        {item.totalUpvotes} 👍
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)' }}>
                        {item.reputationScore.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
