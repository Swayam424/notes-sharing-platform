import { useState, useEffect } from 'react';
import { X, Check, Star, Plus, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { NoteResource, Subject } from '../data/mockData';

const FORMAT_OPTIONS = [
  'Handwritten PDF',
  'Typed Notes',
  'Typed Slides',
  'Lab Manual',
  'Cheatsheet'
];

interface EditNoteModalProps {
  note: NoteResource | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: NoteResource) => void;
}

export default function EditNoteModal({ note, isOpen, onClose, onSaved }: EditNoteModalProps) {
  const [title, setTitle] = useState('');
  const [primaryTopic, setPrimaryTopic] = useState('');
  const [description, setDescription] = useState('');
  const [format, setFormat] = useState('Handwritten PDF');
  const [pages, setPages] = useState('12');
  const [status, setStatus] = useState<'published' | 'processing' | 'flagged'>('published');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const [subject, setSubject] = useState<Subject | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (note && isOpen) {
      setTitle(note.title || '');
      setPrimaryTopic(note.primaryTopic || '');
      setDescription(note.description || '');
      setFormat(note.format || 'Handwritten PDF');
      setPages(String(note.pages || 12));
      setStatus((note.status as any) || 'published');
      setTags(note.tags || []);
      setError(null);

      // Load subject units & topics
      if (note.subjectId) {
        api.getSubject(note.subjectId).then(setSubject).catch(console.error);
      }
    }
  }, [note, isOpen]);

  if (!isOpen || !note) return null;

  const currentUnit = subject?.units.find(u => u.id === note.unitId);
  const availableTopics = currentUnit?.topics || [];

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean)) {
      setTags(prev => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(prev => prev.filter(tag => tag !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await api.updateNote(note.id, {
        title: title.trim(),
        primaryTopic: primaryTopic.trim(),
        description: description.trim(),
        format,
        pages: parseInt(pages) || 12,
        status,
        tags
      });

      onSaved(response.note || {
        ...note,
        title: title.trim(),
        primaryTopic: primaryTopic.trim(),
        description: description.trim(),
        format,
        pages: parseInt(pages) || 12,
        status,
        tags
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save note changes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-panel"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '580px', width: '100%', borderRadius: 'var(--radius-lg)' }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', margin: 0 }}>
              Edit Resource Details
            </h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', margin: '2px 0 0 0' }}>
              Update syllabus alignment, topic designation, and study description
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close" disabled={saving}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: 'var(--space-5) var(--space-6)' }}>
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                fontSize: 'var(--text-sm)'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Title */}
            <div>
              <label className="input-label" htmlFor="edit-title-input">
                Note Title <span style={{ color: 'var(--color-primary)' }}>*</span>
              </label>
              <input
                id="edit-title-input"
                className="input"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Academic Breadcrumbs Display (Read-Only) */}
            <div style={{
              margin: 'var(--space-3) 0',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-base)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-deep-soft)'
            }}>
              <span className="mono text-muted">Syllabus Mapping: </span>
              <strong>{note.subjectCode || subject?.code} {note.subjectName || subject?.name}</strong> &rsaquo; {note.unitName || currentUnit?.name || 'Unit'}
            </div>

            {/* Primary Topic Selector */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="input-label" style={{ margin: 0 }}>
                  Primary Syllabus Topic
                </label>
                <span className="mono text-muted" style={{ fontSize: '11px' }}>
                  Anchor for student search
                </span>
              </div>

              {availableTopics.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: 'var(--space-2)' }}>
                  {availableTopics.map(t => {
                    const isSelected = primaryTopic === t.name;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`topic-chip-card ${isSelected ? 'is-primary' : ''}`}
                        onClick={() => setPrimaryTopic(t.name)}
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        <Star size={11} fill={isSelected ? 'currentColor' : 'none'} />
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <input
                className="input"
                type="text"
                placeholder="Or specify custom primary topic..."
                value={primaryTopic}
                onChange={e => setPrimaryTopic(e.target.value)}
                style={{ fontSize: 'var(--text-sm)' }}
              />
            </div>

            {/* Format & Pages */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              <div>
                <label className="input-label">Document Format</label>
                <select
                  className="select"
                  style={{ width: '100%' }}
                  value={format}
                  onChange={e => setFormat(e.target.value)}
                >
                  {FORMAT_OPTIONS.map(fmt => (
                    <option key={fmt} value={fmt}>{fmt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label" htmlFor="edit-pages-input">Pages</label>
                <input
                  id="edit-pages-input"
                  className="input"
                  type="number"
                  min="1"
                  max="500"
                  value={pages}
                  onChange={e => setPages(e.target.value)}
                />
              </div>
            </div>

            {/* Publication Status Selector */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <label className="input-label">Publication Status</label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="button"
                  className={`topic-chip-card ${status === 'published' ? 'selected' : ''}`}
                  onClick={() => setStatus('published')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {status === 'published' && <Check size={13} />} Published
                </button>
                <button
                  type="button"
                  className={`topic-chip-card ${status === 'processing' ? 'selected' : ''}`}
                  onClick={() => setStatus('processing')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {status === 'processing' && <Check size={13} />} Indexing
                </button>
                <button
                  type="button"
                  className={`topic-chip-card ${status === 'flagged' ? 'selected' : ''}`}
                  onClick={() => setStatus('flagged')}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {status === 'flagged' && <Check size={13} />} Under Review
                </button>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <label className="input-label" htmlFor="edit-desc-input">
                Description & Study Tips
              </label>
              <textarea
                id="edit-desc-input"
                className="input"
                rows={3}
                placeholder="Highlight what makes these notes helpful (e.g. solved exam numericals, proofs, clean diagrams)"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Tags */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <label className="input-label">Discovery Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                {tags.map(tag => (
                  <span key={tag} className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    #{tag}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={() => handleRemoveTag(tag)} />
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  className="input"
                  type="text"
                  placeholder="Add tag (e.g. 2023-pyqs)"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  style={{ fontSize: 'var(--text-sm)' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddTag}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={15} className="spin" /> Saving Changes...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
