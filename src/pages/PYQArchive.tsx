import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  FileText,
  Calendar,
  Search,
  Bookmark,
  Download,
  BookOpen,
  Plus,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import { savedNotesService } from '../services/savedNotes';
import type { PYQEntry, Subject } from '../data/mockData';
import { subjects as fallbackSubjects } from '../data/mockData';

export default function PYQArchive() {
  const navigate = useNavigate();
  const { refreshKey, setUploadOpen } = useApp();

  // Data state
  const [pyqsList, setPyqsList] = useState<PYQEntry[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>(() => savedNotesService.getSavedIds());
  const [loading, setLoading] = useState(true);

  // Filters state
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterExamType, setFilterExamType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Fetch PYQs and subjects
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getPYQs(),
      api.getSubjects(),
      savedNotesService.syncFromServer()
    ]).then(([pyqs, subs, syncedData]) => {
      setPyqsList(pyqs);
      setSubjectsList(subs.length > 0 ? subs : fallbackSubjects);
      setSavedIds(syncedData.ids);
    }).catch(err => {
      console.error('Failed to load PYQs:', err);
    }).finally(() => {
      setLoading(false);
    });

    const unsubscribe = savedNotesService.subscribe((ids) => {
      setSavedIds(ids);
    });
    return () => unsubscribe();
  }, [refreshKey]);

  // Extract available years
  const availableYears = useMemo(() => {
    const yrs = Array.from(new Set(pyqsList.map(p => p.year))).filter(Boolean);
    return yrs.sort((a, b) => b - a);
  }, [pyqsList]);

  // Extract topics for selected subject
  const availableTopics = useMemo(() => {
    if (filterSubject === 'all') {
      const allT = new Set<string>();
      pyqsList.forEach(p => {
        if (p.primaryTopic) allT.add(p.primaryTopic);
        p.topicMapping?.forEach(tm => {
          if (tm.topicName) allT.add(tm.topicName);
        });
      });
      return Array.from(allT);
    }

    const sub = subjectsList.find(s => s.id === filterSubject);
    if (!sub) return [];
    const topics: string[] = [];
    sub.units.forEach(u => {
      u.topics.forEach(t => topics.push(t.name));
    });
    return topics;
  }, [filterSubject, subjectsList, pyqsList]);

  // Reset topic filter if subject changes and topic is no longer present
  const handleSubjectChange = (newSubjectId: string) => {
    setFilterSubject(newSubjectId);
    setFilterTopic('all');
  };

  // Filtered PYQ list
  const filteredPyqs = useMemo(() => {
    return pyqsList.filter(pyq => {
      if (filterSubject !== 'all' && pyq.subjectId !== filterSubject) return false;
      if (filterYear !== 'all' && pyq.year !== Number(filterYear)) return false;
      if (filterExamType !== 'all' && (pyq.examType || 'End Semester') !== filterExamType) return false;

      // Topic-first filter
      if (filterTopic !== 'all') {
        const matchesPrimary = pyq.primaryTopic?.toLowerCase().includes(filterTopic.toLowerCase());
        const matchesMapping = pyq.topicMapping?.some(tm =>
          tm.topicName.toLowerCase().includes(filterTopic.toLowerCase())
        );
        const matchesQuestions = pyq.questions?.some(q =>
          q.topicName?.toLowerCase().includes(filterTopic.toLowerCase()) ||
          q.question.toLowerCase().includes(filterTopic.toLowerCase())
        );
        if (!matchesPrimary && !matchesMapping && !matchesQuestions) return false;
      }

      // Keyword Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = pyq.title?.toLowerCase().includes(query);
        const matchesSubject = (pyq.subjectName || '').toLowerCase().includes(query) ||
          (pyq.subjectCode || '').toLowerCase().includes(query);
        const matchesTopic = pyq.primaryTopic?.toLowerCase().includes(query) ||
          pyq.topicMapping?.some(tm => tm.topicName.toLowerCase().includes(query));
        const matchesQuestions = pyq.questions?.some(q => q.question.toLowerCase().includes(query));
        const matchesSession = `${pyq.month} ${pyq.year}`.toLowerCase().includes(query);

        if (!matchesTitle && !matchesSubject && !matchesTopic && !matchesQuestions && !matchesSession) {
          return false;
        }
      }

      return true;
    });
  }, [pyqsList, filterSubject, filterTopic, filterYear, filterExamType, searchQuery]);

  // Handle Quick Save / Bookmark
  const handleToggleSave = async (e: React.MouseEvent, pyqId: string) => {
    e.stopPropagation();
    try {
      if (savedIds.includes(pyqId)) {
        await savedNotesService.removeSavedNote(pyqId);
        showToast('Removed paper from My Library');
      } else {
        await savedNotesService.saveNote(pyqId);
        showToast('Saved paper to My Library');
      }
    } catch {
      showToast('Saved locally');
    }
  };

  // Handle Download
  const handleDownload = async (e: React.MouseEvent, pyq: PYQEntry) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/pyqs/${pyq.id}/download`);
      const data = await res.json();
      showToast(`Downloading: ${data.fileName || `${pyq.title || 'Paper'}.pdf`}`);
      const blob = new Blob([`Examination Paper: ${pyq.title || 'Paper'}\nSession: ${pyq.month} ${pyq.year}\nQuestions count: ${pyq.questionCount}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.fileName || `${(pyq.title || 'PYQ-Paper').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast('Download started');
    }
  };

  // Stats
  const totalQuestions = useMemo(() => {
    return pyqsList.reduce((acc, p) => acc + (p.questionCount || 0), 0);
  }, [pyqsList]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '80px',
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

      {/* Page Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="chip chip-primary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Academic Archive
            </span>
            <span className="mono text-muted" style={{ fontSize: '12px' }}>
              • {totalQuestions} Questions Indexed
            </span>
          </div>
          <h1 className="page-title" style={{ margin: '0 0 6px' }}>
            Previous Year Questions (PYQ)
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Topic-first past examination papers mapped to semester syllabus guidelines
          </p>
        </div>

        {/* Upload PYQ Action */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={() => setUploadOpen(true)}
            style={{ gap: '8px' }}
          >
            <Plus size={16} /> Contribute PYQ
          </button>
        </div>
      </div>

      {/* Topic-First Discovery & Filter Bar */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Search Bar & Dropdowns Row */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          {/* Keyword Search */}
          <div style={{ flex: '1 1 280px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search question prompts, concepts, exam sessions…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: '36px' }}
            />
          </div>

          {/* Year Filter */}
          <div style={{ minWidth: '130px' }}>
            <select
              className="select"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">All Years</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Exam Type Filter */}
          <div style={{ minWidth: '150px' }}>
            <select
              className="select"
              value={filterExamType}
              onChange={(e) => setFilterExamType(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="all">All Exam Types</option>
              <option value="End Semester">End Semester</option>
              <option value="Mid Semester">Mid Semester</option>
              <option value="Unit Test">Unit Test</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(filterSubject !== 'all' || filterTopic !== 'all' || filterYear !== 'all' || filterExamType !== 'all' || searchQuery) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setFilterSubject('all');
                setFilterTopic('all');
                setFilterYear('all');
                setFilterExamType('all');
                setSearchQuery('');
              }}
              style={{ gap: '6px', color: 'var(--color-muted)' }}
              title="Reset all filters"
            >
              <RotateCcw size={14} /> Clear
            </button>
          )}
        </div>

        {/* Subject Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button
            className={`filter-tab ${filterSubject === 'all' ? 'active' : ''}`}
            onClick={() => handleSubjectChange('all')}
            style={{ whiteSpace: 'nowrap' }}
          >
            All Subjects ({pyqsList.length})
          </button>
          {subjectsList.map(s => {
            const count = pyqsList.filter(p => p.subjectId === s.id).length;
            return (
              <button
                key={s.id}
                className={`filter-tab ${filterSubject === s.id ? 'active' : ''}`}
                onClick={() => handleSubjectChange(s.id)}
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>{s.name}</span>
                <span className="mono" style={{ fontSize: '10px', opacity: 0.75 }}>({count})</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Topic Pills Selector (Topic-First) */}
        {availableTopics.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderTop: '1px solid var(--color-border-light)',
            paddingTop: '12px',
            overflowX: 'auto'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Focus Topic:
            </span>
            <button
              onClick={() => setFilterTopic('all')}
              style={{
                fontSize: '11px',
                padding: '3px 10px',
                borderRadius: '16px',
                border: '1px solid',
                borderColor: filterTopic === 'all' ? 'var(--color-primary)' : 'var(--color-border)',
                background: filterTopic === 'all' ? 'rgba(200, 75, 40, 0.1)' : 'transparent',
                color: filterTopic === 'all' ? 'var(--color-primary)' : 'var(--color-text)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontWeight: filterTopic === 'all' ? 600 : 400
              }}
            >
              All Topics
            </button>
            {availableTopics.slice(0, 10).map((topicName) => {
              const isSelected = filterTopic.toLowerCase() === topicName.toLowerCase();
              return (
                <button
                  key={topicName}
                  onClick={() => setFilterTopic(isSelected ? 'all' : topicName)}
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                    background: isSelected ? 'rgba(200, 75, 40, 0.1)' : 'transparent',
                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: isSelected ? 600 : 400
                  }}
                >
                  {topicName}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Papers Grid */}
      <div className="notes-grid" id="pyq-grid">
        {filteredPyqs.map(pyq => {
          const subject = subjectsList.find(s => s.id === pyq.subjectId);
          const isSaved = savedIds.includes(pyq.id);
          const paperTitle = pyq.title || `${subject?.name || 'Academic'} — ${pyq.month} ${pyq.year} Examination Paper`;

          return (
            <div
              key={pyq.id}
              className="card"
              id={`pyq-card-${pyq.id}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onClick={() => navigate(`/pyq/${pyq.id}`)}
            >
              <div>
                {/* Card Header */}
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <span className="chip chip-primary" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        <Calendar size={11} style={{ marginRight: '4px' }} />
                        {pyq.month} {pyq.year}
                      </span>
                      <span className="chip" style={{ fontSize: '11px', padding: '2px 8px' }}>
                        {subject?.code || pyq.subjectCode || 'CS501'}
                      </span>
                      <span className="chip chip-secondary" style={{ fontSize: '10px', padding: '1px 6px' }}>
                        {pyq.examType || 'End Semester'}
                      </span>
                    </div>

                    <h3 style={{
                      fontSize: '15px',
                      fontFamily: 'var(--font-display)',
                      margin: '0 0 4px',
                      lineHeight: 1.4,
                      fontWeight: 600
                    }}>
                      {paperTitle}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                      {subject?.name || pyq.subjectName}
                    </div>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => handleToggleSave(e, pyq.id)}
                    title={isSaved ? 'Remove from My Library' : 'Save Paper to My Library'}
                    style={{ padding: '6px', color: isSaved ? 'var(--color-primary)' : 'var(--color-muted)' }}
                  >
                    <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                {/* Card Body: Topic Distribution & Question Count */}
                <div className="card-body" style={{ paddingTop: '8px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}>
                    <span>Topic Distribution</span>
                    <span className="mono" style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                      {pyq.questionCount} Questions
                    </span>
                  </div>

                  {pyq.topicMapping && pyq.topicMapping.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {pyq.topicMapping.slice(0, 3).map((tm, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '12px',
                            padding: '4px 0',
                            borderBottom: '1px solid var(--color-border-light)'
                          }}
                        >
                          <span style={{ color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
                            {tm.topicName}
                          </span>
                          <span className="mono text-muted" style={{ fontSize: '11px' }}>
                            {tm.count || tm.questionCount || 2}Q
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', padding: '6px 0' }}>
                      {pyq.primaryTopic ? `Focused on ${pyq.primaryTopic}` : 'Comprehensive syllabus evaluation'}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Actions */}
              <div className="card-footer" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid var(--color-border-light)',
                marginTop: '12px'
              }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/pyq/${pyq.id}`)}
                  style={{ gap: '6px', fontSize: '12px', padding: '6px 14px' }}
                >
                  <BookOpen size={14} /> Open Paper
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => handleDownload(e, pyq)}
                    title="Download question paper PDF"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                  >
                    <Download size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPyqs.length === 0 && !loading && (
        <div className="empty-state" style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: '60px 24px',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <FileText className="empty-state-icon" style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: 'var(--color-muted)' }} />
          <h3 className="empty-state-title" style={{ fontSize: '18px', marginBottom: '8px' }}>
            No Examination Papers Found
          </h3>
          <p className="empty-state-desc" style={{ maxWidth: '440px', margin: '0 auto 20px', color: 'var(--color-muted)' }}>
            No question papers match the selected subject, focus topic, or session filters. Try clearing your filters or contribute this paper.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setFilterSubject('all');
                setFilterTopic('all');
                setFilterYear('all');
                setFilterExamType('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setUploadOpen(true)}
            >
              <Plus size={16} /> Contribute Paper
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
