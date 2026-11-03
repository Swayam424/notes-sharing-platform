import { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { api, type NoteRequest } from '../services/api';
import type { NoteResource } from '../data/mockData';

interface FulfillRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: NoteRequest | null;
  availableNotes: NoteResource[];
  onFulfilled: (requestId: string, noteId: string, noteTitle: string) => void;
  onOpenUploadModal?: () => void;
}

export default function FulfillRequestModal({
  isOpen,
  onClose,
  request,
  availableNotes,
  onFulfilled,
  onOpenUploadModal
}: FulfillRequestModalProps) {
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  // The server only accepts published notes from the requested subject
  const subjectNotes = availableNotes.filter(n => n.subjectId === request.subjectId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoteId) return setError('Pick the note that answers this request.');
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await api.fulfillNoteRequest(request.id, selectedNoteId);
      onFulfilled(request.id, res.fulfilledNoteId, res.fulfilledNoteTitle);
      setSelectedNoteId('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link that note.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="sheet-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="sheet" role="dialog" aria-modal="true" aria-labelledby="fulfil-title" onSubmit={handleSubmit}>
        <div className="sheet__header">
          <div>
            <h2 className="sheet__title" id="fulfil-title">Share notes</h2>
            <p className="sheet__subtitle">Requested by {request.requesterName}</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="sheet__body">
          <div className="sheet__context">
            <div className="eyebrow">
              {request.subjectCode || request.subjectName}{request.unitName ? ` · ${request.unitName}` : ''}
            </div>
            <div style={{ fontWeight: 600, marginTop: 4 }}>{request.topicName}</div>
            {request.description && <p style={{ marginTop: 4, color: 'var(--color-muted)' }}>{request.description}</p>}
          </div>

          <div className="field">
            <span className="field__label">Choose a matching note</span>
            {subjectNotes.length > 0 ? (
              <div className="option-list">
                {subjectNotes.map(n => (
                  <button
                    type="button"
                    key={n.id}
                    className="option"
                    aria-pressed={selectedNoteId === n.id}
                    onClick={() => setSelectedNoteId(n.id)}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontWeight: 550 }}>{n.title}</span>
                      <span className="option__meta">{n.author} · {n.format} · {n.pages} pages</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="field__hint">Nothing in the library matches this subject yet. Upload one and come back.</p>
            )}
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
        </div>

        <div className="sheet__footer">
          {onOpenUploadModal && (
            <button type="button" className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={() => { onClose(); onOpenUploadModal(); }}>
              <Upload size={15} /> Upload new
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !selectedNoteId}>
            {isSubmitting ? 'Linking…' : 'Link note'}
          </button>
        </div>
      </form>
    </div>
  );
}
