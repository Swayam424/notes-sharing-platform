import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ChevronDown, Check, Minus, X, FileText, ArrowRight, MessageSquare, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { Subject } from '../data/mockData';

export default function SubjectOverview() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { refreshKey } = useApp();

  const [subject, setSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(true);
  const [openUnits, setOpenUnits] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'missing' | 'exam'>('all');
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!subjectId) return;
    setLoading(true);
    api.getSubject(subjectId)
      .then(sub => {
        setSubject(sub);
        // Default open the first unit
        if (sub.units.length > 0) {
          setOpenUnits([sub.units[0].id]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [subjectId, refreshKey]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: 'var(--space-2)' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
        <span className="text-muted">Loading syllabus structure...</span>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="empty-state">
        <FileText className="empty-state-icon" />
        <h3 className="empty-state-title">Subject Not Found</h3>
        <p className="empty-state-desc">This subject doesn't exist in your current semester.</p>
        <button className="btn btn-primary" style={{ marginTop: 'var(--space-3)' }} onClick={() => navigate('/subjects')}>
          Back to Subjects
        </button>
      </div>
    );
  }

  const toggleUnit = (unitId: string) => {
    setOpenUnits(prev => prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]);
  };

  const totalTopics = subject.units.reduce((acc, u) => acc + u.topics.length, 0);

  // Coverage bar segments
  const statusCounts = { covered: 0, partial: 0, missing: 0 };
  subject.units.forEach(u => u.topics.forEach(t => {
    if (statusCounts[t.status] !== undefined) {
      statusCounts[t.status]++;
    }
  }));

  return (
    <div>
      {/* Navigation & Header Module */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>
          ← Study Space
        </button>
        <span className="text-muted">•</span>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/notes')}>
          Notes Discovery
        </button>
      </div>

      <div className="page-header" id="subject-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 className="page-title">{subject.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
              <span className="chip">{subject.code}</span>
              <span className="chip">{subject.scheme}</span>
              <span className="chip chip-secondary">{subject.units.length} Units • {totalTopics} Topics</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="mono" style={{ fontSize: '28px', fontWeight: 'var(--weight-bold)', color: subject.coverage >= 75 ? 'var(--color-secondary)' : subject.coverage >= 50 ? '#9A6D18' : 'var(--color-primary)' }}>
              {subject.coverage}%
            </div>
            <div className="mono text-muted" style={{ fontSize: '11px' }}>COVERAGE</div>
          </div>
        </div>

        {/* Segmented Coverage Bar */}
        <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: '2px', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ flex: statusCounts.covered, background: 'var(--color-secondary)', transition: 'flex var(--transition-slow)' }} />
          <div style={{ flex: statusCounts.partial, background: 'var(--color-warning)', transition: 'flex var(--transition-slow)' }} />
          <div style={{ flex: statusCounts.missing, background: 'var(--color-primary)', transition: 'flex var(--transition-slow)' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: '11px' }}>
          <span className="mono" style={{ color: 'var(--color-secondary)' }}>● {statusCounts.covered} Covered</span>
          <span className="mono" style={{ color: '#9A6D18' }}>● {statusCounts.partial} Partial</span>
          <span className="mono" style={{ color: 'var(--color-primary)' }}>● {statusCounts.missing} Missing</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar" id="syllabus-filters">
        <button className={`filter-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
          All Topics ({totalTopics})
        </button>
        <button className={`filter-tab ${filter === 'missing' ? 'active' : ''}`} onClick={() => setFilter('missing')}>
          Missing Topics ({statusCounts.missing})
        </button>
        <button className={`filter-tab ${filter === 'exam' ? 'active' : ''}`} onClick={() => setFilter('exam')}>
          High Exam Frequency
        </button>
      </div>

      {/* Units Accordion List */}
      <div className="unit-accordion-list" id="units-list">
        {subject.units.map(unit => {
          const isOpen = openUnits.includes(unit.id);
          const filteredTopics = unit.topics.filter(t => {
            if (filter === 'missing') return t.status === 'missing';
            if (filter === 'exam') return t.pyqCount >= 3;
            return true;
          });

          const unitCovered = unit.topics.filter(t => t.status === 'covered').length;

          return (
            <div key={unit.id} className="unit-panel" id={`unit-${unit.id}`}>
              <div className="unit-panel-header" onClick={() => toggleUnit(unit.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <ChevronDown size={18} className={`unit-chevron ${isOpen ? 'open' : ''}`} />
                  <span className="unit-panel-title">{unit.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <span className="mono text-muted" style={{ fontSize: '11px' }}>
                    {unitCovered}/{unit.topics.length} covered
                  </span>
                  <div className="progress" style={{ width: '60px', height: '3px' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.round((unitCovered / unit.topics.length) * 100)}%`,
                        background: unitCovered === unit.topics.length ? 'var(--color-secondary)' : 'var(--color-primary)',
                      }}
                    />
                  </div>
                </div>
              </div>

              {isOpen && (
                <div className="unit-panel-body">
                  {filteredTopics.length === 0 ? (
                    <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-muted)', fontSize: 'var(--text-sm)' }}>
                      No topics match the selected filter.
                    </div>
                  ) : (
                    filteredTopics.map(topic => (
                      <div
                        key={topic.id}
                        className="topic-row"
                        onMouseEnter={() => setHoveredTopic(topic.id)}
                        onMouseLeave={() => setHoveredTopic(null)}
                        style={{ position: 'relative' }}
                      >
                        {/* Status Icon */}
                        <div className={`status-icon ${topic.status}`}>
                          {topic.status === 'covered' && <Check size={12} />}
                          {topic.status === 'partial' && <Minus size={12} />}
                          {topic.status === 'missing' && <X size={12} />}
                        </div>

                        {/* Topic Name */}
                        <div className="topic-row-content">
                          <span className="topic-row-name">{topic.name}</span>
                        </div>

                        {/* Topic Meta */}
                        <div className="topic-row-meta">
                          {/* PYQ Stamp */}
                          {topic.pyqCount > 0 && (
                            <div style={{ position: 'relative' }}>
                              <span className="pyq-stamp" style={{ cursor: 'pointer' }}>
                                PYQ {topic.pyqCount}×
                              </span>

                              {/* Tooltip on hover */}
                              {hoveredTopic === topic.id && topic.pyqQuestions && topic.pyqQuestions.length > 0 && (
                                <div style={{
                                  position: 'absolute', bottom: '100%', right: 0,
                                  background: 'var(--color-deep)', color: '#FFFFFF',
                                  padding: 'var(--space-3) var(--space-4)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: 'var(--text-xs)',
                                  width: '280px',
                                  boxShadow: 'var(--shadow-md)',
                                  zIndex: 10,
                                  marginBottom: 'var(--space-2)',
                                  lineHeight: '1.4',
                                }}>
                                  <div style={{ fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--space-1)', color: 'var(--color-secondary)' }}>
                                    Recent Exam Questions:
                                  </div>
                                  {topic.pyqQuestions.map((q, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 'var(--space-1)', margin: 'var(--space-1) 0' }}>
                                      <MessageSquare size={10} style={{ flexShrink: 0, marginTop: '2px', opacity: 0.7 }} />
                                      <span>{q}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Notes Count */}
                          <span className="mono text-muted" style={{ fontSize: '11px' }}>
                            {topic.noteCount} {topic.noteCount === 1 ? 'note' : 'notes'}
                          </span>

                          {/* Coverage Label */}
                          <span
                            className="mono"
                            style={{
                              fontSize: '11px',
                              fontWeight: 'var(--weight-medium)',
                              color: topic.status === 'covered' ? 'var(--color-secondary)' : topic.status === 'partial' ? '#9A6D18' : 'var(--color-primary)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {topic.status}
                          </span>

                          <button
                            className="btn btn-ghost btn-sm btn-icon"
                            title={`Find notes for ${topic.name}`}
                            onClick={() => navigate(`/notes?q=${encodeURIComponent(topic.name)}`)}
                          >
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
