import { useState } from 'react';
import { X } from 'lucide-react';
import { api, type NoteRequest } from '../services/api';
import type { Subject } from '../data/mockData';

interface RequestNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialSubjectId?: string;
  onRequestCreated: (newRequest: NoteRequest) => void;
}

export default function RequestNoteModal({
  isOpen,
  onClose,
  subjects,
  initialSubjectId,
  onRequestCreated
}: RequestNoteModalProps) {
  const [subjectId, setSubjectId] = useState(initialSubjectId || (subjects[0]?.id || ''));
  const [courseTitle, setCourseTitle] = useState('');
  const [unitName, setUnitName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSubject = subjects.find(s => s.id === subjectId) || subjects[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveSubject = courseTitle.trim() || currentSubject?.name || '';
    if (!effectiveSubject && !subjectId) return setError('Please enter or select a course / subject.');
    if (!topicName.trim()) return setError('Tell classmates which topic you need.');

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await api.createNoteRequest({
        subjectId: subjectId || undefined,
        subjectName: effectiveSubject,
        courseTitle: effectiveSubject,
        unitName: unitName.trim() || undefined,
        topicName: topicName.trim(),
        description: description.trim() || undefined
      });
      onRequestCreated(created);
      setTopicName('');
      setDescription('');
      setCourseTitle('');
      setUnitName('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post your request. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sheet-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="request-title" onSubmit={handleSubmit}>
        <div className="sheet__header">
          <div>
            <h2 className="sheet__title" id="request-title">Request notes</h2>
            <p className="sheet__subtitle">Classmates who have them can upload or link a match.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="sheet__body">
          <div className="field">
            <span className="field__label">Course / Subject Name <span style={{ color: 'var(--color-primary)' }}>*</span></span>
            <input
              type="text"
              value={courseTitle}
              onChange={e => setCourseTitle(e.target.value)}
              placeholder={currentSubject?.name ? `e.g. ${currentSubject.name}` : 'e.g. Operating Systems, Data Structures, Applied Physics'}
              style={{ width: '100%' }}
            />
            {subjects.length > 0 && (
              <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--color-muted)' }}>
                Or pick from common subjects:{' '}
                <select
                  value={courseTitle ? '' : subjectId}
                  onChange={e => {
                    if (e.target.value) {
                      const found = subjects.find(s => s.id === e.target.value);
                      if (found) {
                        setCourseTitle(found.name);
                        setSubjectId(found.id);
                      }
                    }
                  }}
                  style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}
                >
                  <option value="">-- Choose suggested course --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.code ? `${s.code} · ` : ''}{s.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <label className="field">
            <span className="field__label">Topic</span>
            <input
              type="text"
              value={topicName}
              onChange={e => setTopicName(e.target.value)}
              placeholder="e.g. Banker’s algorithm, worked example"
              maxLength={140}
              autoFocus
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Details <span className="field__hint">optional</span></span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What exactly is missing? Derivations, diagrams, solved problems…"
              rows={3}
              maxLength={600}
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <div className="sheet__footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Posting…' : 'Post request'}
          </button>
        </div>
      </form>
    </div>
  );
}
