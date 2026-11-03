import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router';
import { api } from '../services/api';
import { useApp } from '../context/appState';
import { useOnChange } from '../hooks/useOnChange';
import type { Subject } from '../data/mockData';

export default function MySubjects() {
  const { user, refreshKey } = useApp();
  const [subjectsList, setSubjectsList] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  useOnChange(`${refreshKey}|${user?.stream}|${user?.semester}`, () => setLoading(true));

  useEffect(() => {
    let cancelled = false;
    api.getSubjects({ stream: user?.stream, semester: user?.semester })
      .then(subs => { if (!cancelled) { setSubjectsList(subs); setError(null); } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load subjects.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, user?.stream, user?.semester]);

  const enrolledIds = useMemo(() => user?.enrolledSubjects || [], [user?.enrolledSubjects]);
  const subjects = useMemo(() => {
    if (showAll || enrolledIds.length === 0) return subjectsList;
    const picked = subjectsList.filter(s => enrolledIds.includes(s.id));
    return picked.length > 0 ? picked : subjectsList;
  }, [subjectsList, enrolledIds, showAll]);

  return (
    <div>
      <header className="page-header dash-head">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-subtitle">
            Semester {user?.semester} · {showAll ? 'every subject in the semester' : `${subjects.length} enrolled`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {enrolledIds.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAll(v => !v)}>
              {showAll ? 'Only my subjects' : 'Show all'}
            </button>
          )}
          <Link to="/settings" className="btn btn-secondary btn-sm">Edit courses</Link>
        </div>
      </header>

      {error && <div className="state-banner state-banner--error" role="alert">{error}</div>}

      <div className="subject-grid subject-grid--roomy">
        {loading
          ? [0, 1, 2].map(i => <div key={i} className="skeleton skeleton--card" />)
          : subjects.map(s => {
            const topics = s.units.flatMap(u => u.topics);
            const covered = topics.filter(t => t.status === 'covered').length;
            const missing = topics.filter(t => t.status === 'missing').length;
            const enrolled = enrolledIds.includes(s.id);
            return (
              <Link key={s.id} to={`/subjects/${s.id}`} className="subject-card subject-card--lg">
                <span className="subject-card__code mono">
                  {s.code}{showAll && enrolled ? ' · enrolled' : ''}
                </span>
                <span className="subject-card__name">{s.name}</span>
                <span className="subject-card__stat">
                  <span className="subject-card__pct">{s.coverage}%</span>
                  <span className="subject-card__stat-label">of topics have notes</span>
                </span>
                <span className="meter" aria-hidden="true"><span style={{ width: `${s.coverage}%` }} /></span>
                <span className="subject-card__meta">
                  <span>{s.units.length} units · {topics.length} topics</span>
                  <span>
                    {covered} covered
                    {missing > 0 && <> · <span className="subject-card__gaps">{missing} missing</span></>}
                  </span>
                </span>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
