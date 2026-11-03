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
  const [unitId, setUnitId] = useState<string>('');
  const [topicName, setTopicName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentSubject = subjects.find(s => s.id === subjectId) || subjects[0];
  const units = currentSubject?.units || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return setError('Choose a subject.');
    if (!topicName.trim()) return setError('Tell classmates which topic you need.');

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await api.createNoteRequest({
        subjectId,
        unitId: unitId || undefined,
        topicName: topicName.trim(),
        description: description.trim() || undefined
      });
      onRequestCreated(created);
      setTopicName('');
      setDescription('');
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
          <div className="field-row">
            <label className="field">
              <span className="field__label">Subject</span>
              <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setUnitId(''); }}>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.code ? `${s.code} · ` : ''}{s.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field__label">Unit</span>
              <select value={unitId} onChange={e => setUnitId(e.target.value)} disabled={units.length === 0}>
                <option value="">Any unit</option>
                {units.map((u, idx) => (
                  <option key={u.id} value={u.id}>Unit {idx + 1}: {u.name}</option>
                ))}
              </select>
            </label>
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
