import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { Subject } from '../data/mockData';
import { ArrowRight } from 'lucide-react';

export default function MySubjects() {
  const navigate = useNavigate();
  const { refreshKey } = useApp();
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);

  useEffect(() => {
    api.getSubjects().then(setSubjectsList).catch(console.error);
  }, [refreshKey]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">My Subjects</h1>
        <p className="page-subtitle">Semester 5 • {subjectsList.length} registered subjects</p>
      </div>

      <div className="notes-grid">
        {subjectsList.map(s => {
          const totalTopics = s.units.reduce((acc, u) => acc + u.topics.length, 0);
          const coveredTopics = s.units.reduce((acc, u) => acc + u.topics.filter(t => t.status === 'covered').length, 0);
          const missingTopics = s.units.reduce((acc, u) => acc + u.topics.filter(t => t.status === 'missing').length, 0);

          return (
            <div key={s.id} className="card" onClick={() => navigate(`/subjects/${s.id}`)} style={{ cursor: 'pointer' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)' }}>{s.name}</h3>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <span className="chip">{s.code}</span>
                    <span className="chip">{s.scheme}</span>
                  </div>
                </div>
                <div className="mono" style={{
                  fontSize: '24px',
                  fontWeight: 'var(--weight-bold)',
                  color: s.coverage >= 75 ? 'var(--color-secondary)' : s.coverage >= 50 ? '#9A6D18' : 'var(--color-primary)',
                }}>
                  {s.coverage}%
                </div>
              </div>
              <div className="card-body">
                <div className="progress" style={{ marginBottom: 'var(--space-3)' }}>
                  <div className={`progress-fill ${s.coverage >= 75 ? 'high' : s.coverage >= 50 ? 'medium' : 'low'}`} style={{ width: `${s.coverage}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="mono text-muted" style={{ fontSize: '11px' }}>
                    {s.units.length} Units • {totalTopics} Topics
                  </span>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--color-secondary)' }}>
                    {coveredTopics} covered
                    {missingTopics > 0 && <span style={{ color: 'var(--color-primary)' }}> • {missingTopics} missing</span>}
                  </span>
                </div>
              </div>
              <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-primary)' }}>
                  View Syllabus <ArrowRight size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
