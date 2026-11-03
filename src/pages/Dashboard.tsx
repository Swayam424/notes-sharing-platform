import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, Bookmark, BookmarkCheck, Search, Upload } from 'lucide-react';
import { api } from '../services/api';
import { useApp } from '../context/appState';
import { savedNotesService } from '../services/savedNotes';
import { useOnChange } from '../hooks/useOnChange';
import type { Subject, NoteResource } from '../data/mockData';

function greetingFor(hour: number) {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshKey, setUploadOpen } = useApp();

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<NoteResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(() => savedNotesService.getSavedIds());
  const [hour] = useState(() => new Date().getHours());

  useOnChange(`${refreshKey}|${user?.stream}|${user?.semester}`, () => {
    setLoading(true);
    setError(null);
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getSubjects({ stream: user?.stream, semester: user?.semester }),
      api.getNotes(),
    ])
      .then(([subs, nts]) => {
        if (cancelled) return;
        setSubjects(subs);
        setNotes(nts);
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your dashboard.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, user?.stream, user?.semester]);

  useEffect(() => savedNotesService.subscribe(setSavedIds), []);

  // Enrolled subjects first; fall back to the whole semester when none are picked
  const mySubjects = useMemo(() => {
    const enrolled = user?.enrolledSubjects || [];
    const picked = subjects.filter(s => enrolled.includes(s.id));
    return picked.length > 0 ? picked : subjects;
  }, [subjects, user?.enrolledSubjects]);

  const mySubjectIds = useMemo(() => new Set(mySubjects.map(s => s.id)), [mySubjects]);
  const myNotes = useMemo(() => notes.filter(n => mySubjectIds.has(n.subjectId)), [notes, mySubjectIds]);

  const lastReadId = savedNotesService.getLastReadNoteId();
  const lastNote = lastReadId ? notes.find(n => n.id === lastReadId) : undefined;

  // Topics that keep showing up in exams, by real PYQ counts only
  const examFavourites = useMemo(() => {
    const rows: { id: string; topic: string; subject: Subject; count: number; notes: number }[] = [];
    for (const s of mySubjects) {
      for (const u of s.units || []) {
        for (const t of u.topics || []) {
          const count = t.pyqCount || t.pyqYears?.length || 0;
          if (count > 0) rows.push({ id: t.id, topic: t.name, subject: s, count, notes: t.noteCount || 0 });
        }
      }
    }
    return rows.sort((a, b) => b.count - a.count).slice(0, 6);
  }, [mySubjects]);

  // The single most useful gap: the most-examined topic that has no notes
  const topGap = useMemo(() => {
    let best: { topic: string; subject: Subject; count: number } | null = null;
    for (const s of mySubjects) {
      for (const u of s.units || []) {
        for (const t of u.topics || []) {
          if (t.status !== 'missing') continue;
          const count = t.pyqCount || t.pyqYears?.length || 0;
          if (!best || count > best.count) best = { topic: t.name, subject: s, count };
        }
      }
    }
    return best;
  }, [mySubjects]);

  const recent = useMemo(
    () => [...myNotes].sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || '')).slice(0, 5),
    [myNotes]
  );

  const firstName = user?.name?.split(' ')[0] || 'there';

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/notes?q=${encodeURIComponent(q)}` : '/notes');
  };

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <h1 className="page-title">{greetingFor(hour)}, {firstName}.</h1>
          <p className="page-subtitle">
            Semester {user?.semester} · {user?.stream || user?.department}
          </p>
        </div>
        <Link to="/settings" className="btn btn-ghost btn-sm">Edit courses</Link>
      </header>

      <form className="dash-search" onSubmit={onSearch} role="search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search a topic from your syllabus, e.g. deadlock avoidance"
          aria-label="Search notes by topic"
        />
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>

      {error && <div className="state-banner state-banner--error" role="alert">{error}</div>}

      {lastNote && (
        <Link to={`/notes/${lastNote.id}`} className="dash-resume">
          <span className="eyebrow">Continue reading</span>
          <span className="dash-resume__title">{lastNote.title}</span>
          <span className="dash-resume__meta">{lastNote.subjectName} · {lastNote.unitName}</span>
          <ArrowRight size={18} className="dash-resume__arrow" aria-hidden="true" />
        </Link>
      )}

      <section className="dash-section" aria-labelledby="subjects-h">
        <div className="section-head">
          <h2 id="subjects-h">Your subjects</h2>
          <Link to="/syllabus" className="section-head__link">Coverage report</Link>
        </div>
        <div className="subject-grid">
          {loading
            ? [0, 1, 2, 3].map(i => <div key={i} className="skeleton skeleton--card" />)
            : mySubjects.map(s => {
              const gaps = s.units.flatMap(u => u.topics).filter(t => t.status === 'missing').length;
              return (
                <Link key={s.id} to={`/subjects/${s.id}`} className="subject-card">
                  <span className="subject-card__code mono">{s.code}</span>
                  <span className="subject-card__name">{s.name}</span>
                  <span className="meter" aria-hidden="true"><span style={{ width: `${s.coverage}%` }} /></span>
                  <span className="subject-card__meta">
                    <span><strong>{s.coverage}%</strong> covered</span>
                    {gaps > 0
                      ? <span className="subject-card__gaps">{gaps} {gaps === 1 ? 'gap' : 'gaps'}</span>
                      : <span>No gaps</span>}
                  </span>
                </Link>
              );
            })}
        </div>
      </section>

      {topGap && (
        <section className="callout" aria-label="Biggest gap in your notes">
          <div>
            <p className="eyebrow">Biggest gap</p>
            <p className="callout__text">
              <mark>{topGap.topic}</mark> ({topGap.subject.name})
              {topGap.count > 0 ? ` has been asked in ${topGap.count} past ${topGap.count === 1 ? 'paper' : 'papers'} and` : ''} has no notes yet.
            </p>
          </div>
          <div className="callout__actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setUploadOpen(true)}>
              <Upload size={14} /> Upload notes
            </button>
            <Link to="/notes?tab=requests&newRequest=true" className="btn btn-secondary btn-sm">Request them</Link>
          </div>
        </section>
      )}

      <div className="dash-columns">
        <section className="dash-section" aria-labelledby="exam-h">
          <div className="section-head">
            <h2 id="exam-h">Asked most in exams</h2>
            <Link to="/pyq" className="section-head__link">Past papers</Link>
          </div>
          {examFavourites.length === 0 && !loading ? (
            <p className="empty-note">No past-paper data for your subjects yet.</p>
          ) : (
            <ol className="rank-list">
              {examFavourites.map(t => (
                <li key={t.id}>
                  <Link to={`/notes?q=${encodeURIComponent(t.topic)}`} className="rank-row">
                    <span className="rank-row__count mono">{t.count}×</span>
                    <span className="rank-row__body">
                      <span className="rank-row__title">{t.topic}</span>
                      <span className="rank-row__meta">
                        {t.subject.name} · {t.notes === 0 ? 'no notes' : `${t.notes} ${t.notes === 1 ? 'note' : 'notes'}`}
                      </span>
                    </span>
                    <ArrowRight size={15} className="rank-row__arrow" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="dash-section" aria-labelledby="recent-h">
          <div className="section-head">
            <h2 id="recent-h">New in your subjects</h2>
            <Link to="/notes" className="section-head__link">All notes</Link>
          </div>
          {recent.length === 0 && !loading ? (
            <p className="empty-note">Nothing uploaded for your subjects yet. Be the first.</p>
          ) : (
            <ul className="note-list">
              {recent.map(n => {
                const saved = savedIds.includes(n.id);
                return (
                  <li key={n.id} className="note-row">
                    <Link to={`/notes/${n.id}`} className="note-row__main">
                      <span className="note-row__title">{n.title}</span>
                      <span className="note-row__meta">
                        {n.subjectCode || n.subjectName} · {n.format} · {n.pages} pages · {n.author}
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="icon-button"
                      onClick={() => savedNotesService.toggleSaveNote(n.id)}
                      aria-pressed={saved}
                      aria-label={saved ? `Remove ${n.title} from saved` : `Save ${n.title}`}
                    >
                      {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
