import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../services/api';
import { useApp } from '../context/AppContext';
import type { Subject } from '../data/mockData';
import { ArrowRight, SlidersHorizontal, CheckCircle2 } from 'lucide-react';

export default function MySubjects() {
  const navigate = useNavigate();
  const { user, refreshKey } = useApp();
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [showAllCurriculum, setShowAllCurriculum] = useState(false);

  useEffect(() => {
    api.getSubjects({ stream: user?.stream, semester: user?.semester })
      .then(setSubjectsList)
      .catch(console.error);
  }, [refreshKey, user?.stream, user?.semester]);

  const enrolledIds = user?.enrolledSubjects || [];
  const displayedSubjects = useMemo(() => {
    if (showAllCurriculum || !enrolledIds || enrolledIds.length === 0) {
      return subjectsList;
    }
    const filtered = subjectsList.filter(s => enrolledIds.includes(s.id));
    return filtered.length > 0 ? filtered : subjectsList;
  }, [subjectsList, enrolledIds, showAllCurriculum]);

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <div>
            <h1 className="page-title">My Subjects & Workspaces</h1>
            <p className="page-subtitle">
              {user?.stream || 'Computer Science & Engineering'} • Semester {user?.semester || 5} • {displayedSubjects.length} {showAllCurriculum ? 'curriculum' : 'enrolled'} subjects
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {enrolledIds.length > 0 && (
              <button
                className={`btn btn-sm ${showAllCurriculum ? 'btn-secondary' : 'btn-ghost'}`}
                onClick={() => setShowAllCurriculum(prev => !prev)}
                style={{ fontSize: '12px' }}
              >
                {showAllCurriculum ? 'Show Enrolled Only' : 'Show All Curriculum'}
              </button>
            )}
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/onboarding')}
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <SlidersHorizontal size={13} /> Customize Roster
            </button>
          </div>
        </div>
      </div>

      <div className="notes-grid">
        {displayedSubjects.map(s => {
          const isEnrolled = enrolledIds.includes(s.id);
          const totalTopics = s.units.reduce((acc, u) => acc + u.topics.length, 0);
          const coveredTopics = s.units.reduce((acc, u) => acc + u.topics.filter(t => t.status === 'covered').length, 0);
          const missingTopics = s.units.reduce((acc, u) => acc + u.topics.filter(t => t.status === 'missing').length, 0);

          return (
            <div key={s.id} className="card" onClick={() => navigate(`/subjects/${s.id}`)} style={{ cursor: 'pointer' }}>
              <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)' }}>{s.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                    <span className="chip">{s.code}</span>
                    <span className="chip">{s.scheme}</span>
                    {isEnrolled && (
                      <span className="badge badge-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', padding: '2px 6px' }}>
                        <CheckCircle2 size={10} /> Enrolled
                      </span>
                    )}
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
