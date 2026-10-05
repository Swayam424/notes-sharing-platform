import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Check, Minus, X, ChevronDown, ArrowRight, FileText } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { Subject, NoteResource } from '../data/mockData';

export default function SyllabusCoverage() {
  const navigate = useNavigate();
  const { refreshKey } = useApp();

  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [notesList, setNotesList] = useState<NoteResource[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getSubjects(),
      api.getNotes()
    ]).then(([subs, nts]) => {
      setSubjectsList(subs);
      setNotesList(nts);
      if (subs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subs[0].id);
      }
    }).catch(console.error);
  }, [refreshKey]);

  const subject = subjectsList.find(s => s.id === selectedSubjectId) || subjectsList[0];

  if (!subject) {
    return (
      <div className="empty-state">
        <FileText className="empty-state-icon" />
        <h3 className="empty-state-title">Loading Syllabus...</h3>
      </div>
    );
  }

  // Calculate stats
  const totalTopics = subject.units.reduce((acc, u) => acc + u.topics.length, 0);
  const coveredTopics = subject.units.reduce((acc, u) => acc + u.topics.filter(t => t.status === 'covered').length, 0);
  const partialTopics = subject.units.reduce((acc, u) => acc + u.topics.filter(t => t.status === 'partial').length, 0);
  const missingTopics = totalTopics - coveredTopics - partialTopics;

  // Find notes that could fill gaps
  const gapFillingNotes = notesList.filter(n => n.subjectId === subject.id);
  const potentialCoverage = Math.min(100, subject.coverage + Math.round(missingTopics * (100 / (totalTopics || 1)) * 0.7));

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Syllabus Coverage Diagnostic</h1>
        <p className="page-subtitle">
          Audit your library against the official department syllabus
        </p>
      </div>

      {/* Subject Selector */}
      <div className="filter-bar" id="coverage-subject-filter">
        {subjectsList.map(s => (
          <button
            key={s.id}
            className={`filter-tab ${subject.id === s.id ? 'active' : ''}`}
            onClick={() => { setSelectedSubjectId(s.id); setExpandedUnit(null); }}
          >
            {s.name}
            <span className="mono" style={{
              marginLeft: 'var(--space-2)',
              fontSize: '10px',
              color: s.coverage >= 75 ? 'var(--color-secondary)' : s.coverage >= 50 ? '#9A6D18' : 'var(--color-primary)',
            }}>
              {s.coverage}%
            </span>
          </button>
        ))}
      </div>

      {/* Summary Card */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }} id="coverage-summary">
        <div className="card-body" style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
              <span className="mono" style={{ fontSize: '36px', fontWeight: 'var(--weight-bold)', color: subject.coverage >= 75 ? 'var(--color-secondary)' : 'var(--color-primary)' }}>
                {subject.coverage}%
              </span>
              <span className="text-sm text-muted">Current Verified Coverage</span>
            </div>
            <div className="progress" style={{ height: '6px', marginBottom: 'var(--space-3)' }}>
              <div className="progress-fill" style={{ width: `${subject.coverage}%`, background: subject.coverage >= 75 ? 'var(--color-secondary)' : 'var(--color-primary)' }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
              <span className="mono" style={{ color: 'var(--color-secondary)' }}>● {coveredTopics} Covered</span>
              <span className="mono" style={{ color: '#9A6D18' }}>● {partialTopics} Partial</span>
              <span className="mono" style={{ color: 'var(--color-primary)' }}>● {missingTopics} Missing</span>
            </div>
          </div>

          <div style={{ width: '1px', height: '80px', background: 'var(--color-border)', display: 'none' }} />

          {/* Actionable Gap-Filling Card */}
          <div style={{
            background: 'var(--color-muted-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-4) var(--space-5)',
            maxWidth: '360px',
          }}>
            <div className="mono text-muted" style={{ fontSize: '10px', marginBottom: 'var(--space-1)' }}>RECOMMENDED ACTION</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-deep-soft)', lineHeight: '1.4', marginBottom: 'var(--space-3)' }}>
              Uploading or pinning resources to <strong>{missingTopics} uncovered topics</strong> can increase syllabus coverage to <strong>{potentialCoverage}%</strong>.
            </p>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/notes')}>
              Fill Coverage Gaps <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Dual-Pane Audit View */}
      <div className="syllabus-audit-grid" id="audit-grid">
        {/* Left Pane: Syllabus Outline Tree */}
        <div className="syllabus-tree-pane">
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: 'var(--text-md)' }}>Official Syllabus Tree</h3>
            <span className="mono text-muted" style={{ fontSize: '11px' }}>{subject.code} • {subject.scheme}</span>
          </div>

          <div style={{ padding: 'var(--space-2)' }}>
            {subject.units.map(unit => {
              const unitCovered = unit.topics.filter(t => t.status === 'covered').length;
              const isSelected = expandedUnit === unit.id;

              return (
                <div key={unit.id} style={{ marginBottom: 'var(--space-2)' }}>
                  <div
                    className={`unit-panel-header ${isSelected ? 'active' : ''}`}
                    onClick={() => setExpandedUnit(isSelected ? null : unit.id)}
                    style={{
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--color-muted-bg)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <ChevronDown size={16} className={`unit-chevron ${isSelected ? 'open' : ''}`} />
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{unit.name}</span>
                    </div>
                    <span className="mono text-muted" style={{ fontSize: '10px' }}>
                      {unitCovered}/{unit.topics.length}
                    </span>
                  </div>

                  {isSelected && (
                    <div style={{ paddingLeft: 'var(--space-6)', marginTop: 'var(--space-1)' }}>
                      {unit.topics.map(t => (
                        <div
                          key={t.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                            padding: 'var(--space-2) var(--space-3)',
                            fontSize: 'var(--text-xs)',
                            color: t.status === 'covered' ? 'var(--color-deep)' : 'var(--color-muted)',
                          }}
                        >
                          <div className={`status-icon ${t.status}`} style={{ width: '16px', height: '16px' }}>
                            {t.status === 'covered' && <Check size={10} />}
                            {t.status === 'partial' && <Minus size={10} />}
                            {t.status === 'missing' && <X size={10} />}
                          </div>
                          <span>{t.name}</span>
                          {t.pyqCount > 0 && (
                            <span className="pyq-stamp" style={{ fontSize: '8px', marginLeft: 'auto' }}>
                              PYQ {t.pyqCount}×
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Per-Unit Coverage Breakdown */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 'var(--text-md)' }}>Coverage Audit by Unit</h3>
            <span className="mono text-muted" style={{ fontSize: '11px' }}>{totalTopics} Total Topics</span>
          </div>

          <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
            {subject.units.map(unit => {
              const uCovered = unit.topics.filter(t => t.status === 'covered').length;
              const uMissing = unit.topics.filter(t => t.status === 'missing').length;
              const uPercent = Math.round((uCovered / unit.topics.length) * 100);

              return (
                <div key={unit.id} style={{ marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{unit.name}</span>
                    <span className="mono" style={{
                      fontSize: '11px',
                      color: uPercent >= 75 ? 'var(--color-secondary)' : uPercent >= 50 ? '#9A6D18' : 'var(--color-primary)',
                    }}>
                      {uPercent}% ({uCovered}/{unit.topics.length})
                    </span>
                  </div>

                  <div className="progress" style={{ height: '4px', marginBottom: 'var(--space-3)' }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${uPercent}%`,
                        background: uPercent >= 75 ? 'var(--color-secondary)' : 'var(--color-primary)',
                      }}
                    />
                  </div>

                  {/* Missing Topics in this unit */}
                  {uMissing > 0 && (
                    <div style={{
                      background: 'var(--color-primary-light)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-2) var(--space-3)',
                      fontSize: 'var(--text-xs)',
                      color: 'var(--color-primary)',
                    }}>
                      <span style={{ fontWeight: 'var(--weight-semibold)' }}>Uncovered Gaps: </span>
                      {unit.topics.filter(t => t.status === 'missing').map(t => t.name).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Available Peer Notes to Fill Gaps */}
          <div style={{ borderTop: '1px solid var(--color-border)', padding: 'var(--space-4) var(--space-5)' }}>
            <div className="mono text-muted" style={{ fontSize: '10px', marginBottom: 'var(--space-3)' }}>
              AVAILABLE RESOURCES FOR THIS COURSE ({gapFillingNotes.length})
            </div>
            {gapFillingNotes.slice(0, 3).map(n => (
              <div
                key={n.id}
                className="topic-row"
                style={{ padding: 'var(--space-2) 0', cursor: 'pointer' }}
                onClick={() => navigate(`/notes/${n.id}`)}
              >
                <FileText size={14} style={{ color: 'var(--color-muted)' }} />
                <div className="topic-row-content">
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)' }}>{n.title}</div>
                  <div className="mono text-muted" style={{ fontSize: '10px' }}>by {n.author} • {n.format}</div>
                </div>
                <span className="chip chip-secondary" style={{ fontSize: '9px' }}>{n.syllabusMatch}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
