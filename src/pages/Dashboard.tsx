import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ArrowRight, Bookmark, BookmarkCheck, Search, Upload,
  Download, Calendar, Sparkles, BookOpen, Sun, Moon, Sunrise, Sunset
} from 'lucide-react';
import { api, type WeeklyStats } from '../services/api';
import { useApp } from '../context/appState';
import { savedNotesService } from '../services/savedNotes';
import { useOnChange } from '../hooks/useOnChange';
import type { NoteResource } from '../data/mockData';

interface ClaudeGreeting {
  title: string;
  badge: string;
  icon: typeof Sun;
  color: string;
  bgTint: string;
}

export function getClaudeGreeting(hour: number, name?: string): ClaudeGreeting {
  const cleanName = name?.trim();
  const hasRealName = !!cleanName && cleanName.toLowerCase() !== 'there';
  const nameSuffix = hasRealName ? `, ${cleanName}.` : '.';

  if (hour >= 22 || hour < 5) {
    return {
      title: `Hello, night owl${nameSuffix}`,
      badge: 'Night Owl Mode',
      icon: Moon,
      color: '#818cf8',
      bgTint: 'rgba(129, 140, 248, 0.12)',
    };
  }
  if (hour < 12) {
    return {
      title: `Good morning${nameSuffix}`,
      badge: 'Morning Study',
      icon: Sunrise,
      color: '#f59e0b',
      bgTint: 'rgba(245, 158, 11, 0.12)',
    };
  }
  if (hour < 17) {
    return {
      title: `Good afternoon${nameSuffix}`,
      badge: 'Afternoon Focus',
      icon: Sun,
      color: '#eab308',
      bgTint: 'rgba(234, 179, 8, 0.12)',
    };
  }
  return {
    title: `Good evening${nameSuffix}`,
    badge: 'Evening Review',
    icon: Sunset,
    color: '#f97316',
    bgTint: 'rgba(249, 115, 22, 0.12)',
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, refreshKey, setUploadOpen } = useApp();

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [notes, setNotes] = useState<NoteResource[]>([]);
  const [examTopics, setExamTopics] = useState<{ topicName: string; subjectName: string; appearances: number; streak: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>(() => savedNotesService.getSavedIds());
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  // Dynamically update greeting as the time of day changes without page reload
  useEffect(() => {
    const updateTime = () => {
      const nowHour = new Date().getHours();
      setCurrentHour(prev => (prev !== nowHour ? nowHour : prev));
    };

    const timer = setInterval(updateTime, 15000);
    window.addEventListener('focus', updateTime);

    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', updateTime);
    };
  }, []);

  useOnChange(`${refreshKey}|${user?.stream}|${user?.semester}`, () => {
    setLoading(true);
    setError(null);
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getWeeklyStats(),
      api.getNotes(),
      api.getDashboardData({ stream: user?.stream, semester: user?.semester }).catch(() => null),
    ])
      .then(([stats, nts, dashData]) => {
        if (cancelled) return;
        setWeeklyStats(stats);
        setNotes(nts);
        if (dashData?.frequentExamTopics) {
          setExamTopics(dashData.frequentExamTopics);
        }
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your dashboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [refreshKey, user?.stream, user?.semester]);

  useEffect(() => savedNotesService.subscribe(setSavedIds), []);

  const lastReadId = savedNotesService.getLastReadNoteId();
  const lastNote = lastReadId ? notes.find(n => n.id === lastReadId) : undefined;

  // Recent notes across the platform / department
  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => (b.uploadDate || '').localeCompare(a.uploadDate || ''))
      .slice(0, 6);
  }, [notes]);

  const firstName = user?.name?.split(' ')[0] || '';
  const greeting = useMemo(
    () => getClaudeGreeting(currentHour, firstName),
    [currentHour, firstName]
  );

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/notes?q=${encodeURIComponent(q)}` : '/notes');
  };

  const handleDownload = (note: NoteResource, e: React.MouseEvent) => {
    e.stopPropagation();
    const element = document.createElement('a');
    element.setAttribute('href', api.getDownloadUrl(note.id));
    element.setAttribute('download', `${note.title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    // Refresh weekly stats immediately after download
    setTimeout(() => {
      api.getWeeklyStats().then(setWeeklyStats).catch(() => {});
    }, 400);
  };

  return (
    <div className="dash">
      <header className="dash-head">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: greeting.bgTint,
                border: '1px solid var(--color-border)',
                color: greeting.color,
                flexShrink: 0,
                transition: 'all 0.3s ease',
              }}
              title={greeting.badge}
              aria-label={greeting.badge}
            >
              <greeting.icon size={22} strokeWidth={2.2} />
            </span>
            <span>{greeting.title}</span>
          </h1>
          <p className="page-subtitle">
            {user?.degree || 'B.Tech / B.E.'} · {user?.stream || user?.department || 'Engineering'} · Sem {user?.semester || 1}
            {user?.college && ` · ${user.college}`}
          </p>
        </div>
        <Link to="/settings" className="btn btn-ghost btn-sm">Edit profile</Link>
      </header>

      <form className="dash-search" onSubmit={onSearch} role="search">
        <Search size={18} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search notes by title, topic, or subject name..."
          aria-label="Search notes"
        />
        <button type="submit" className="btn btn-primary btn-sm">Search</button>
      </form>

      {error && <div className="state-banner state-banner--error" role="alert">{error}</div>}

      {lastNote && (
        <Link to={`/notes/${lastNote.id}`} className="dash-resume">
          <span className="eyebrow">Continue reading</span>
          <span className="dash-resume__title">{lastNote.title}</span>
          <span className="dash-resume__meta">
            {lastNote.subjectName || lastNote.department} · {lastNote.primaryTopic || lastNote.unitName || 'Notes'}
          </span>
          <ArrowRight size={18} className="dash-resume__arrow" aria-hidden="true" />
        </Link>
      )}

      {/* Weekly Activity Hub (Replacing rigid subjects & progress) */}
      <section className="weekly-hub" aria-labelledby="weekly-h">
        <div className="section-head" style={{ alignItems: 'center' }}>
          <div>
            <h2 id="weekly-h" style={{ margin: 0 }}>Weekly Activity</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-muted)' }}>
              Weekly uploads and downloads across the platform. Resets every Monday.
            </p>
          </div>
          <div className="weekly-head-badge">
            <Calendar size={13} aria-hidden="true" />
            <span>{weeklyStats?.weekLabel || 'Current Week'}</span>
          </div>
        </div>

        <div className="weekly-grid">
          {/* Card 1: Uploads This Week */}
          <div className="weekly-card">
            <div className="weekly-card__header">
              <span className="weekly-card__label">Uploaded this week</span>
              <div className="weekly-card__icon weekly-card__icon--upload">
                <Upload size={18} />
              </div>
            </div>
            <div className="weekly-card__stat">
              {loading ? '...' : (weeklyStats?.weeklyUploads ?? 0)}
              <small>notes</small>
            </div>
            <p className="weekly-card__desc">
              Shared by students this calendar week.
            </p>
            <div className="weekly-card__footer">
              <span>Resets every Monday 00:00</span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setUploadOpen(true)}
                style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
              >
                <Upload size={12} /> Upload
              </button>
            </div>
          </div>

          {/* Card 2: Downloads This Week */}
          <div className="weekly-card">
            <div className="weekly-card__header">
              <span className="weekly-card__label">Downloaded this week</span>
              <div className="weekly-card__icon weekly-card__icon--download">
                <Download size={18} />
              </div>
            </div>
            <div className="weekly-card__stat">
              {loading ? '...' : (weeklyStats?.weeklyDownloads ?? 0)}
              <small>downloads</small>
            </div>
            <p className="weekly-card__desc">
              Study documents accessed by peers this week.
            </p>
            <div className="weekly-card__footer">
              <span>Tracked Mon – Sun</span>
              <Link
                to="/notes"
                className="btn btn-secondary btn-sm"
                style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
              >
                <BookOpen size={12} /> Browse
              </Link>
            </div>
          </div>

          {/* Card 3: Your Personal Weekly Activity */}
          <div className="weekly-card">
            <div className="weekly-card__header">
              <span className="weekly-card__label">Your activity this week</span>
              <div className="weekly-card__icon weekly-card__icon--user">
                <Sparkles size={18} />
              </div>
            </div>
            <div className="weekly-card__stat" style={{ fontSize: '1.6rem' }}>
              {loading ? '...' : `${weeklyStats?.userWeeklyUploads ?? 0} up · ${weeklyStats?.userWeeklyDownloads ?? 0} down`}
            </div>
            <p className="weekly-card__desc">
              Your personal contributions and downloads for this week.
            </p>
            <div className="weekly-card__footer">
              <span>{weeklyStats?.totalNotes || notes.length} total library notes</span>
              <Link
                to="/uploads"
                className="btn btn-ghost btn-sm"
                style={{ height: '28px', padding: '0 10px', fontSize: '11px' }}
              >
                My uploads
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Columns: Recent Notes & Exam Trends */}
      <div className="dash-columns">
        {/* Recent Community Notes */}
        <section className="dash-section" aria-labelledby="recent-h">
          <div className="section-head">
            <h2 id="recent-h">Recent notes</h2>
            <Link to="/notes" className="section-head__link">All notes</Link>
          </div>
          {recentNotes.length === 0 && !loading ? (
            <p className="empty-note">No notes uploaded yet. Be the first to share one.</p>
          ) : (
            <ul className="note-list">
              {recentNotes.map(n => {
                const saved = savedIds.includes(n.id);
                return (
                  <li key={n.id} className="note-row">
                    <Link to={`/notes/${n.id}`} className="note-row__main">
                      <span className="note-row__title">{n.title}</span>
                      <span className="note-row__meta">
                        {n.subjectName || n.department || 'Course Material'} · {n.format} · {n.pages} pages · {n.author}
                      </span>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={e => handleDownload(n, e)}
                        title="Download note"
                        aria-label={`Download ${n.title}`}
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => savedNotesService.toggleSaveNote(n.id)}
                        aria-pressed={saved}
                        aria-label={saved ? `Remove ${n.title} from saved` : `Save ${n.title}`}
                      >
                        {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Exam Focus Topics */}
        <section className="dash-section" aria-labelledby="exam-h">
          <div className="section-head">
            <h2 id="exam-h">Frequently examined topics</h2>
            <Link to="/pyq" className="section-head__link">Past papers</Link>
          </div>
          {examTopics.length === 0 && !loading ? (
            <p className="empty-note">No past-paper data available yet.</p>
          ) : (
            <ol className="rank-list">
              {examTopics.slice(0, 6).map((t, idx) => (
                <li key={`${t.topicName}-${idx}`}>
                  <Link to={`/notes?q=${encodeURIComponent(t.topicName)}`} className="rank-row">
                    <span className="rank-row__count mono">{t.appearances}×</span>
                    <span className="rank-row__body">
                      <span className="rank-row__title">{t.topicName}</span>
                      <span className="rank-row__meta">
                        {t.subjectName} · {t.streak || `Appeared in ${t.appearances} exam papers`}
                      </span>
                    </span>
                    <ArrowRight size={15} className="rank-row__arrow" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
