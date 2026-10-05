import { useState, useEffect, useRef } from 'react';
import { X, Upload, ChevronRight, Check, File, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { Subject } from '../data/mockData';

type Step = 1 | 2 | 3;

export default function UploadModal() {
  const { uploadOpen, setUploadOpen, triggerRefresh, user } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [dragging, setDragging] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [docType, setDocType] = useState('Lecture Notes');
  const [customTitle, setCustomTitle] = useState('');
  const [authorName, setAuthorName] = useState(user?.name || 'Nishant Verma');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.name) {
      setAuthorName(user.name);
    }
  }, [user]);

  useEffect(() => {
    if (uploadOpen) {
      api.getSubjects().then(setSubjects).catch(console.error);
    }
  }, [uploadOpen]);

  if (!uploadOpen) return null;

  const handleClose = () => {
    setUploadOpen(false);
    setStep(1);
    setFile(null);
    setFileName('');
    setFileSizeStr('');
    setSelectedSubject('');
    setSelectedUnit('');
    setSelectedTopics([]);
    setDocType('Lecture Notes');
    setCustomTitle('');
    setUploading(false);
    setUploadError(null);
  };

  const handleFileSelection = (f: File) => {
    setFile(f);
    setFileName(f.name);
    const sizeInMb = (f.size / (1024 * 1024)).toFixed(1);
    setFileSizeStr(`${sizeInMb} MB`);
    if (!customTitle) {
      setCustomTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const subject = subjects.find(s => s.id === selectedSubject);
  const unit = subject?.units.find(u => u.id === selectedUnit);

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const canNext = () => {
    if (step === 1) return !!fileName;
    if (step === 2) return !!selectedSubject && !!selectedUnit && selectedTopics.length > 0;
    if (step === 3) return !!docType && !uploading;
    return false;
  };

  const handleSubmit = async () => {
    if (!selectedSubject || !selectedUnit) return;
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('title', customTitle || fileName);
      formData.append('author', authorName);
      formData.append('subjectId', selectedSubject);
      formData.append('unitId', selectedUnit);
      formData.append('topicIds', JSON.stringify(selectedTopics));
      formData.append('format', docType);
      formData.append('pages', '14');

      await api.uploadNote(formData);
      triggerRefresh();
      handleClose();
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload resource');
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h3>Upload Resource</h3>
          <button className="btn btn-ghost btn-icon" onClick={handleClose} aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Steps indicator */}
        <div style={{ padding: 'var(--space-4) var(--space-6) 0' }}>
          <div className="upload-steps">
            {[1, 2, 3].map((s, i) => (
              <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <div className={`upload-step ${step === s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                  <div className="upload-step-number">
                    {step > s ? <Check size={12} /> : s}
                  </div>
                  <span style={{ fontSize: 'var(--text-sm)' }}>
                    {s === 1 ? 'File' : s === 2 ? 'Syllabus' : 'Classify'}
                  </span>
                </div>
                {i < 2 && <div className="upload-step-line" />}
              </span>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {uploadError && (
            <div style={{ padding: 'var(--space-3)', background: '#fee2e2', color: '#991b1b', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
              {uploadError}
            </div>
          )}

          {/* Step 1: File Staging */}
          {step === 1 && (
            <div>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.docx,.png,.jpg,.jpeg"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelection(f);
                }}
              />

              <div
                className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFileSelection(f);
                }}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                {fileName ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <File size={40} strokeWidth={1} style={{ color: 'var(--color-primary)' }} />
                    <span style={{ fontWeight: 'var(--weight-medium)' }}>{fileName}</span>
                    <span className="mono text-muted">{fileSizeStr || '2.4 MB'} • Click to change file</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Upload size={40} strokeWidth={1} style={{ color: 'var(--color-muted)' }} />
                    <span style={{ fontWeight: 'var(--weight-medium)', color: 'var(--color-deep)' }}>
                      Drop file here or click to browse
                    </span>
                    <span className="text-sm text-muted">PDF, DOCX, or images up to 50MB</span>
                  </div>
                )}
              </div>

              {fileName && (
                <div style={{ marginTop: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-2)' }}>
                    Resource Title
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    placeholder="e.g. Unit 3 Process Synchronization Notes"
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Syllabus Pinning */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-2)' }}>
                  Subject
                </label>
                <select
                  className="select"
                  value={selectedSubject}
                  onChange={e => { setSelectedSubject(e.target.value); setSelectedUnit(''); setSelectedTopics([]); }}
                  style={{ width: '100%' }}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              {selectedSubject && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-2)' }}>
                    Unit
                  </label>
                  <select
                    className="select"
                    value={selectedUnit}
                    onChange={e => { setSelectedUnit(e.target.value); setSelectedTopics([]); }}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select Unit</option>
                    {subject?.units.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedUnit && unit && (
                <div>
                  <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-2)' }}>
                    Topics Covered (Pin to Syllabus)
                  </label>
                  <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2)', maxHeight: '200px', overflowY: 'auto' }}>
                    {unit.topics.map(t => (
                      <div key={t.id} className="checkbox-row" onClick={() => toggleTopic(t.id)}>
                        <div className={`checkbox ${selectedTopics.includes(t.id) ? 'checked' : ''}`}>
                          {selectedTopics.includes(t.id) && <Check size={12} />}
                        </div>
                        <span className="checkbox-label">{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Document Classification */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-2)' }}>
                  Document Type
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {['Lecture Notes', 'PYQ Solution', 'Cheatsheet', 'Lab Manual', 'Typed Slides', 'Handwritten PDF'].map(type => (
                    <button
                      key={type}
                      type="button"
                      className={`chip ${docType === type ? 'chip-primary' : ''}`}
                      onClick={() => setDocType(type)}
                      style={{ cursor: 'pointer', padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-sm)' }}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', marginBottom: 'var(--space-2)' }}>
                  Author / Contributor
                </label>
                <input
                  type="text"
                  className="input"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && !uploading && (
            <button className="btn" onClick={() => setStep((step - 1) as Step)}>
              Back
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 3 ? (
            <button
              className="btn btn-primary"
              disabled={!canNext()}
              onClick={() => setStep((step + 1) as Step)}
              style={{ opacity: canNext() ? 1 : 0.5 }}
            >
              Continue
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              className="btn btn-primary"
              disabled={!canNext() || uploading}
              onClick={handleSubmit}
              style={{ opacity: canNext() && !uploading ? 1 : 0.5 }}
            >
              {uploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload Resource
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
