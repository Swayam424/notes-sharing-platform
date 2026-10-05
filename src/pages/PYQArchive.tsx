import { useState, useEffect } from 'react';
import { FileText, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { PYQEntry, Subject } from '../data/mockData';

export default function PYQArchive() {
  const { refreshKey } = useApp();
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [pyqsList, setPyqsList] = useState<PYQEntry[]>([]);
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);

  useEffect(() => {
    Promise.all([
      api.getPYQs(filterSubject),
      api.getSubjects()
    ]).then(([pyqs, subs]) => {
      setPyqsList(pyqs);
      setSubjectsList(subs);
    }).catch(console.error);
  }, [filterSubject, refreshKey]);

  const years = [...new Set(pyqsList.map(p => p.year))].sort((a, b) => b - a);

  const filtered = pyqsList.filter(p => {
    if (filterYear !== 'all' && p.year !== Number(filterYear)) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">PYQ Archive</h1>
        <p className="page-subtitle">{pyqsList.length} past question papers mapped to your syllabus</p>
      </div>

      {/* Filters */}
      <div className="filter-bar" id="pyq-filters">
        <button className={`filter-tab ${filterSubject === 'all' ? 'active' : ''}`} onClick={() => setFilterSubject('all')}>
          All Subjects
        </button>
        {subjectsList.map(s => (
          <button key={s.id} className={`filter-tab ${filterSubject === s.id ? 'active' : ''}`} onClick={() => setFilterSubject(s.id)}>
            {s.name}
          </button>
        ))}
        <div style={{ width: '1px', height: '20px', background: 'var(--color-border)', margin: '0 var(--space-2)' }} />
        <select className="select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* PYQ Cards */}
      <div className="notes-grid" id="pyq-grid">
        {filtered.map(pyq => {
          const subject = subjectsList.find(s => s.id === pyq.subjectId);
          return (
            <div key={pyq.id} className="card" id={`pyq-card-${pyq.id}`}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-md)', fontFamily: 'var(--font-display)' }}>
                    {subject?.name}
                  </h3>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <span className="chip">{subject?.code}</span>
                    <span className="chip">
                      <Calendar size={10} /> {pyq.month} {pyq.year}
                    </span>
                  </div>
                </div>
                <div className="mono" style={{ fontSize: '20px', fontWeight: 'var(--weight-bold)', color: 'var(--color-primary)' }}>
                  {pyq.questionCount}
                </div>
              </div>

              <div className="card-body">
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-muted)', marginBottom: 'var(--space-3)' }}>
                  TOPIC DISTRIBUTION
                </div>
                {pyq.topicMapping.map((tm, idx) => (
                  <div key={idx} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border-light)',
                    fontSize: 'var(--text-sm)',
                  }}>
                    <span style={{ color: 'var(--color-deep)' }}>{tm.topicName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {Array.from({ length: tm.count }).map((_, i) => (
                          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '1px', background: 'var(--color-primary)' }} />
                        ))}
                      </div>
                      <span className="mono text-muted" style={{ fontSize: '10px' }}>{tm.count}Q</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono text-muted" style={{ fontSize: '11px' }}>
                  {pyq.topicMapping.length} topics covered
                </span>
                <span className="chip chip-secondary" style={{ fontSize: '10px' }}>
                  Syllabus Aligned
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 className="empty-state-title">No PYQ papers found</h3>
          <p className="empty-state-desc">Try selecting a different subject or year filter.</p>
        </div>
      )}
    </div>
  );
}
