import { useOnChange } from '../hooks/useOnChange';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  X,
  Upload,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  Loader2,
  Star,
  CheckCircle2,
  BookOpen,
  Plus,
  Layers,
  Sparkles,
  AlertCircle,
  Share2,
  Globe,
  Users,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../context/appState';
import { api, type NoteRequest } from '../services/api';
import type { Subject, NoteResource } from '../data/mockData';

const POPULAR_COURSES = [
  'Operating Systems',
  'Data Structures & Algorithms',
  'Database Management Systems',
  'Computer Networks',
  'Software Engineering',
  'Machine Learning',
  'Object-Oriented Programming',
  'Digital Electronics',
  'Engineering Mathematics'
];

const COMMON_MODULES = [
  'Unit 1: Fundamentals',
  'Unit 2: Core Architecture',
  'Unit 3: Advanced Topics',
  'Unit 4: Applications & Practice',
  'Complete Syllabus Notes',
  'Exam Cheatsheet & Formulas'
];

type Step = 1 | 2 | 3 | 4;

const FORMAT_OPTIONS = [
  'Handwritten PDF',
  'Typed Notes',
  'Typed Slides',
  'Lab Manual',
  'Cheatsheet'
];

const SUGGESTED_TAGS = [
  'exam-prep',
  'handwritten',
  'solved-pyqs',
  'formula-sheet',
  'vtu',
  'midterm-review',
  'lab-viva'
];

export default function UploadModal() {
  const navigate = useNavigate();
  const { uploadOpen, setUploadOpen, triggerRefresh, user } = useApp();

  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileSizeStr, setFileSizeStr] = useState('');
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // Form Fields
  const [resourceKind, setResourceKind] = useState<'note' | 'pyq'>('note');
  const [examYear, setExamYear] = useState('2025');
  const [examMonth, setExamMonth] = useState('May');
  const [examType, setExamType] = useState('End Semester');
  const [totalMarks, setTotalMarks] = useState('100');
  const [questionCount, setQuestionCount] = useState('16');
  const [uploadedPyqId, setUploadedPyqId] = useState<string | null>(null);

  const [customTitle, setCustomTitle] = useState('');
  const [docType, setDocType] = useState('Handwritten PDF');
  const [pagesCount, setPagesCount] = useState('12');

  const [courseTitle, setCourseTitle] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'direct_request' | 'private'>('public');
  const [fulfilledRequestId, setFulfilledRequestId] = useState('');
  const [integrityConfirmed, setIntegrityConfirmed] = useState(true);
  const [openRequests, setOpenRequests] = useState<NoteRequest[]>([]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [primaryTopic, setPrimaryTopic] = useState('');
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [customTopics, setCustomTopics] = useState<string[]>([]);

  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('4');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [authorName, setAuthorName] = useState('');

  // Upload Status
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusMessage, setUploadStatusMessage] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedNote, setUploadedNote] = useState<NoteResource | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize author, department, semester from current session user
  useOnChange(user, () => {
    if (user) {
      if (user.name) setAuthorName(user.name);
      if (user.department) setDepartment(user.department);
      if (user.semester) setSemester(String(user.semester));
    }
  }, { onMount: true });

  // Load subjects & open requests when modal opens
  useEffect(() => {
    if (uploadOpen) {
      api.getSubjects().then(fetched => {
        setSubjects(fetched);
        if (fetched.length > 0) {
          setSelectedSubject(prev => prev || fetched[0].id);
        }
      }).catch(console.error);

      api.getNoteRequests({ status: 'open' }).then(reqs => {
        setOpenRequests(reqs);
      }).catch(console.error);
    }
  }, [uploadOpen]);

  // Pick the first unit when the subject (or the subject list) changes
  useOnChange(`${selectedSubject}|${subjects.length}`, () => {
    const sub = subjects.find(s => s.id === selectedSubject);
    if (sub && sub.units.length > 0) setSelectedUnit(sub.units[0].id);
  });

  // Reset topic choices when the unit changes
  useOnChange(selectedUnit, () => {
    setSelectedTopicIds([]);
    setPrimaryTopic('');
    setCustomTopics([]);
  });

  if (!uploadOpen) return null;

  const currentSubject = subjects.find(s => s.id === selectedSubject);
  const currentUnit = currentSubject?.units.find(u => u.id === selectedUnit);
  const availableTopics = currentUnit?.topics || [];

  const handleClose = () => {
    if (uploading) return; // Prevent closing while in flight
    setUploadOpen(false);
    // Reset all state after a short animation delay
    setTimeout(() => {
      setStep(1);
      setFile(null);
      setFileName('');
      setFileSizeStr('');
      setFileError(null);
      setCustomTitle('');
      setDocType('Handwritten PDF');
      setPagesCount('12');
      setSelectedTopicIds([]);
      setPrimaryTopic('');
      setCustomTopics([]);
      setDescription('');
      setTags([]);
      setUploadError(null);
      setUploading(false);
      setUploadProgress(0);
      setUploadedNote(null);
    }, 200);
  };

  const validateAndSetFile = (f: File) => {
    setFileError(null);
    const validExtensions = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png'];
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(ext)) {
      setFileError(`Unsupported file format. Please upload PDF, DOCX, PPTX, or JPG/PNG.`);
      return;
    }

    const maxBytes = 50 * 1024 * 1024; // 50MB
    if (f.size > maxBytes) {
      setFileError(`File size exceeds 50MB limit. Current size: ${(f.size / (1024 * 1024)).toFixed(1)} MB.`);
      return;
    }

    setFile(f);
    setFileName(f.name);
    const sizeInMb = (f.size / (1024 * 1024)).toFixed(1);
    setFileSizeStr(`${sizeInMb} MB`);

    if (!customTitle) {
      // Clean up filename for a sensible default title
      const clean = f.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      setCustomTitle(clean);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSetPrimary = (topicName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrimaryTopic(topicName);
  };

  const handleAddCustomTopic = () => {
    const trimmed = customTopicInput.trim();
    if (!trimmed) return;
    if (!customTopics.includes(trimmed)) {
      setCustomTopics(prev => [...prev, trimmed]);
      if (!primaryTopic) {
        setPrimaryTopic(trimmed);
      }
    }
    setCustomTopicInput('');
  };

  const handleToggleTag = (tag: string) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleAddCustomTag = () => {
    const clean = customTagInput.trim().replace(/^#/, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags(prev => [...prev, clean]);
    }
    setCustomTagInput('');
  };

  const canProceed = () => {
    if (step === 1) {
      return !!fileName && !fileError && (resourceKind === 'pyq' || !!customTitle.trim());
    }
    if (step === 2) {
      const hasSubject = !!courseTitle.trim() || !!selectedSubject;
      const hasUnit = !!unitTitle.trim() || !!selectedUnit;
      return hasSubject && hasUnit;
    }
    if (step === 3) {
      return !!authorName.trim() && integrityConfirmed && !uploading;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress(15);
    setUploadStatusMessage(resourceKind === 'pyq' ? 'Preparing examination paper upload...' : 'Preparing file upload...');

    try {
      const progressTimer = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressTimer);
            return 85;
          }
          return prev + 20;
        });
      }, 150);

      if (resourceKind === 'pyq') {
        const pyqFormData = new FormData();
        if (file) {
          pyqFormData.append('file', file);
        }
        const generatedTitle = customTitle.trim() || `${currentSubject?.name || 'Academic'} — ${examMonth} ${examYear} ${examType} Paper`;
        pyqFormData.append('title', generatedTitle);
        pyqFormData.append('subjectId', selectedSubject);
        pyqFormData.append('year', examYear);
        pyqFormData.append('month', examMonth);
        pyqFormData.append('examType', examType);
        pyqFormData.append('semester', semester);
        pyqFormData.append('department', department.trim());
        pyqFormData.append('totalMarks', totalMarks);
        pyqFormData.append('primaryTopic', primaryTopic || (availableTopics[0]?.name ?? 'Course Syllabus'));
        pyqFormData.append('questionCount', questionCount);

        const mapping = selectedTopicIds.map(tId => {
          const tObj = availableTopics.find(t => t.id === tId);
          return { topicId: tId, topicName: tObj?.name || 'Topic', questionCount: 2 };
        });
        pyqFormData.append('topicMapping', JSON.stringify(mapping));

        setUploadStatusMessage('Publishing paper to PYQ archive and indexing topics...');
        const response = await api.uploadPYQ(pyqFormData);

        clearInterval(progressTimer);
        setUploadProgress(100);
        setUploadStatusMessage('PYQ published successfully!');
        triggerRefresh();

        const pyqId = response.pyq?.id || 'pyq-os-2025';
        setUploadedPyqId(pyqId);
        setUploadedNote({
          id: pyqId,
          title: generatedTitle,
          author: authorName,
          authorInitials: authorName.slice(0, 2).toUpperCase(),
          subjectId: selectedSubject,
          subjectName: currentSubject?.name,
          subjectCode: currentSubject?.code,
          unitId: selectedUnit || 'all',
          unitName: 'Comprehensive Paper',
          topicIds: selectedTopicIds,
          primaryTopic: primaryTopic || 'Course Curriculum',
          format: 'PDF',
          pages: 4,
          uploadDate: new Date().toISOString().split('T')[0],
          downloads: 0,
          topicMatchCount: selectedTopicIds.length,
          totalTopics: availableTopics.length,
          syllabusMatch: `${selectedTopicIds.length} syllabus topics evaluated`
        });
        setStep(4);
        return;
      }

      // Normal Study Note Flow
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      formData.append('title', customTitle.trim() || fileName);
      formData.append('author', authorName.trim() || user?.name || 'Scholar');
      formData.append('subjectId', selectedSubject || '');
      formData.append('subjectName', courseTitle.trim() || currentSubject?.name || '');
      formData.append('courseTitle', courseTitle.trim() || currentSubject?.name || '');
      formData.append('unitId', selectedUnit || '');
      formData.append('unitName', unitTitle.trim() || currentUnit?.name || '');
      formData.append('topicIds', JSON.stringify(selectedTopicIds));
      formData.append('primaryTopic', primaryTopic || customTopics[0] || unitTitle.trim() || (availableTopics[0]?.name ?? 'Lecture Notes'));
      formData.append('description', description.trim());
      formData.append('tags', JSON.stringify(tags));
      formData.append('department', department.trim());
      formData.append('semester', semester);
      formData.append('format', docType);
      formData.append('pages', pagesCount || '12');
      formData.append('visibility', visibility === 'private' ? 'private' : 'public');
      if (fulfilledRequestId) {
        formData.append('fulfilledRequestId', fulfilledRequestId);
      }

      setUploadStatusMessage('Indexing syllabus topics and linking to course...');
      const response = await api.uploadNote(formData);

      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadStatusMessage('Upload complete!');

      triggerRefresh();

      if (response && response.note) {
        setUploadedNote(response.note);
      } else {
        setUploadedNote({
          id: response.noteId,
          title: customTitle.trim() || fileName,
          author: authorName,
          authorInitials: authorName.slice(0, 2).toUpperCase(),
          subjectId: selectedSubject,
          subjectName: currentSubject?.name,
          subjectCode: currentSubject?.code,
          unitId: selectedUnit,
          unitName: currentUnit?.name,
          topicIds: selectedTopicIds,
          primaryTopic: primaryTopic || 'Lecture Notes',
          format: docType,
          pages: parseInt(pagesCount) || 12,
          uploadDate: new Date().toISOString().split('T')[0],
          downloads: 0,
          topicMatchCount: selectedTopicIds.length,
          totalTopics: availableTopics.length,
          syllabusMatch: `Matches ${selectedTopicIds.length}/${availableTopics.length} topics`
        });
      }

      setStep(4);
    } catch (err: any) {
      console.error('Upload failed:', err);
      setUploadError(err.message || 'Failed to upload resource. Please check file format and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpenReader = () => {
    if (uploadedNote?.id) {
      handleClose();
      navigate(`/notes/${uploadedNote.id}`);
    }
  };

  const handleViewContributions = () => {
    handleClose();
    navigate('/uploads');
  };

  const handleUploadAnother = () => {
    setStep(1);
    setFile(null);
    setFileName('');
    setFileSizeStr('');
    setFileError(null);
    setCustomTitle('');
    setSelectedTopicIds([]);
    setPrimaryTopic('');
    setCustomTopics([]);
    setDescription('');
    setTags([]);
    setUploadedNote(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-panel"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '100%', borderRadius: 'var(--radius-lg)' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--text-lg)', fontFamily: 'var(--font-display)', margin: 0 }}>
              {step === 4 ? 'Contribution Published' : 'Upload Academic Resource'}
            </h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', margin: '2px 0 0 0' }}>
              {step === 1 && 'Step 1 of 3: Select document & primary format'}
              {step === 2 && 'Step 2 of 3: Course title & module / topic details'}
              {step === 3 && 'Step 3 of 3: Visibility, context & academic integrity'}
              {step === 4 && 'Resource is now live in the course library'}
            </p>
          </div>
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleClose}
            aria-label="Close"
            disabled={uploading}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Steps Breadcrumb (Steps 1 to 3) */}
        {step < 4 && (
          <div style={{ padding: 'var(--space-4) var(--space-6) 0' }}>
            <div className="upload-steps" style={{ marginBottom: 'var(--space-3)' }}>
              {[1, 2, 3].map((s, i) => (
                <span key={s} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div className={`upload-step ${step === s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                    <div className="upload-step-number">
                      {step > s ? <Check size={12} strokeWidth={2.5} /> : s}
                    </div>
                    <span>
                      {s === 1 ? 'Document' : s === 2 ? 'Topic Anchor' : 'Academic Context'}
                    </span>
                  </div>
                  {i < 2 && <div className="upload-step-line" />}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: 'var(--space-5) var(--space-6)' }}>
          {uploadError && (
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
              <span>{uploadError}</span>
            </div>
          )}

          {/* STEP 1: FILE FIRST */}
          {step === 1 && (
            <div>
              {/* Resource Type Selection */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="input-label" style={{ marginBottom: 'var(--space-2)' }}>Academic Resource Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <button
                    type="button"
                    onClick={() => setResourceKind('note')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: resourceKind === 'note' ? 'var(--color-primary)' : 'var(--color-border)',
                      background: resourceKind === 'note' ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-bg)',
                      color: resourceKind === 'note' ? 'var(--color-primary)' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontWeight: resourceKind === 'note' ? 600 : 500,
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <FileText size={20} />
                    <div>
                      <div style={{ fontSize: '13px' }}>Study Notes</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Lecture notes, slides, manuals</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResourceKind('pyq')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid',
                      borderColor: resourceKind === 'pyq' ? 'var(--color-primary)' : 'var(--color-border)',
                      background: resourceKind === 'pyq' ? 'color-mix(in srgb, var(--color-primary) 8%, transparent)' : 'var(--color-bg)',
                      color: resourceKind === 'pyq' ? 'var(--color-primary)' : 'var(--color-text)',
                      cursor: 'pointer',
                      fontWeight: resourceKind === 'pyq' ? 600 : 500,
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <BookOpen size={20} />
                    <div>
                      <div style={{ fontSize: '13px' }}>PYQ Question Paper</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>Past semester examination paper</div>
                    </div>
                  </button>
                </div>
              </div>

              <div
                className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: 'var(--space-8) var(--space-4)' }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto var(--space-3)'
                }}>
                  <Upload size={24} />
                </div>
                <p style={{ fontWeight: 'var(--weight-medium)', marginBottom: '4px', fontSize: 'var(--text-base)' }}>
                  {fileName ? 'Click or drop to replace document' : (resourceKind === 'pyq' ? 'Drag & drop question paper document' : 'Drag & drop your study notes here')}
                </p>
                <p className="text-muted" style={{ fontSize: 'var(--text-xs)', margin: 0 }}>
                  Supports PDF, DOCX, PPTX, or scanned high-res images (up to 50MB)
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      validateAndSetFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {fileError && (
                <div style={{
                  marginTop: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <AlertCircle size={13} /> {fileError}
                </div>
              )}

              {fileName && !fileError && (
                <div className="upload-file-preview-card">
                  <div className="upload-file-info">
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {fileName}
                      </p>
                      <span className="mono text-muted" style={{ fontSize: '11px' }}>{fileSizeStr}</span>
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setFile(null);
                      setFileName('');
                      setFileSizeStr('');
                    }}
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Title Input */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="input-label" htmlFor="note-title-input">
                  {resourceKind === 'pyq' ? 'Paper Title' : 'Note Title'} <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                  id="note-title-input"
                  className="input"
                  type="text"
                  placeholder={resourceKind === 'pyq' ? 'e.g. Operating Systems — May 2025 End Semester Examination Paper' : 'e.g. Complete Trees & AVL Rotations with Solved Numericals'}
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                />
                <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px' }}>
                  {resourceKind === 'pyq' ? 'Descriptive paper title including exam session and examination type.' : 'Clear, descriptive titles help students quickly identify relevant lecture notes.'}
                </p>
              </div>

              {resourceKind === 'pyq' ? (
                /* PYQ Specific Session Grid */
                <div style={{ marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-3)' }}>
                  <div>
                    <label className="input-label">Exam Year</label>
                    <select className="select" value={examYear} onChange={e => setExamYear(e.target.value)} style={{ width: '100%' }}>
                      {['2025', '2024', '2023', '2022', '2021', '2020'].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Exam Month</label>
                    <select className="select" value={examMonth} onChange={e => setExamMonth(e.target.value)} style={{ width: '100%' }}>
                      {['May', 'Dec', 'Nov', 'June', 'April', 'Jan'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Exam Type</label>
                    <select className="select" value={examType} onChange={e => setExamType(e.target.value)} style={{ width: '100%' }}>
                      <option value="End Semester">End Semester</option>
                      <option value="Mid Semester">Mid Semester</option>
                      <option value="Unit Test">Unit Test</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Total Marks</label>
                    <input className="input" type="number" min="20" max="150" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label className="input-label">Questions Count</label>
                    <input className="input" type="number" min="1" max="50" value={questionCount} onChange={e => setQuestionCount(e.target.value)} style={{ width: '100%' }} />
                  </div>
                </div>
              ) : (
                /* Normal Study Notes Format */
                <>
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <label className="input-label">Note Format</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                      {FORMAT_OPTIONS.map(fmt => (
                        <button
                          key={fmt}
                          type="button"
                          className={`topic-chip-card ${docType === fmt ? 'selected' : ''}`}
                          onClick={() => setDocType(fmt)}
                        >
                          {docType === fmt && <Check size={13} strokeWidth={2.5} />}
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-4)' }}>
                    <div style={{ flex: 1 }}>
                      <label className="input-label" htmlFor="page-count-input">Estimated Page Count</label>
                      <input
                        id="page-count-input"
                        className="input"
                        type="number"
                        min="1"
                        max="500"
                        value={pagesCount}
                        onChange={e => setPagesCount(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2: COURSE & TOPIC SPECIFICATION */}
          {step === 2 && (
            <div>
              <div style={{
                background: 'var(--color-secondary-light)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                marginBottom: 'var(--space-4)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 'var(--space-3)'
              }}>
                <Sparkles size={18} style={{ color: 'var(--color-secondary)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-secondary)' }}>
                    Universal Course & Topic Organization
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-deep-soft)' }}>
                    Enter your course name and topic freely. You are not constrained by fixed college curriculums—students anywhere can discover and benefit from your notes!
                  </p>
                </div>
              </div>

              {/* Course / Subject Name */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="input-label" htmlFor="course-title-input">
                  Course / Subject Name <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                  id="course-title-input"
                  className="input"
                  type="text"
                  placeholder="e.g. Operating Systems, Data Structures, Applied Physics..."
                  value={courseTitle}
                  onChange={e => setCourseTitle(e.target.value)}
                  style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                />

                {/* Popular Course Chips */}
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block', marginBottom: '4px' }}>
                    Quick suggestions:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {POPULAR_COURSES.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`chip ${courseTitle === c ? 'chip-primary' : ''}`}
                        style={{ cursor: 'pointer', fontSize: '11px' }}
                        onClick={() => setCourseTitle(c)}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Unit / Module Title */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="input-label" htmlFor="unit-title-input">
                  Unit / Module / Section <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                  id="unit-title-input"
                  className="input"
                  type="text"
                  placeholder="e.g. Unit 2: Process Scheduling & Deadlocks, Midterm Notes..."
                  value={unitTitle}
                  onChange={e => setUnitTitle(e.target.value)}
                  style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                />

                {/* Common Module Chips */}
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-muted)', display: 'block', marginBottom: '4px' }}>
                    Common structures:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {COMMON_MODULES.map(m => (
                      <button
                        key={m}
                        type="button"
                        className={`chip ${unitTitle === m ? 'chip-primary' : ''}`}
                        style={{ cursor: 'pointer', fontSize: '11px' }}
                        onClick={() => setUnitTitle(m)}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key Concept / Primary Topic */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="input-label" htmlFor="primary-topic-input">
                  Primary Concept / Topic Highlight <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>(Optional for search ranking)</span>
                </label>
                <input
                  id="primary-topic-input"
                  className="input"
                  type="text"
                  placeholder="e.g. Virtual Memory & Inverted Page Tables"
                  value={primaryTopic}
                  onChange={e => setPrimaryTopic(e.target.value)}
                  style={{ fontSize: 'var(--text-sm)', width: '100%' }}
                />
              </div>

              {/* Specific Subtopics Tagging */}
              <div className="topic-selector-container">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-deep)', fontWeight: 600 }}>
                  Specific Topics / Concepts Covered
                </span>
                <p style={{ margin: '2px 0 var(--space-2)', fontSize: '11px', color: 'var(--color-muted)' }}>
                  Add key topics covered in these notes so peers searching for exact questions or formulas can find them.
                </p>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Banker's Algorithm, Round Robin scheduling"
                    value={customTopicInput}
                    onChange={e => setCustomTopicInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTopic();
                      }
                    }}
                    style={{ fontSize: 'var(--text-sm)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddCustomTopic}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>

                {customTopics.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    {customTopics.map(ct => {
                      const isPrimary = primaryTopic === ct;
                      return (
                        <div
                          key={ct}
                          className={`topic-chip-card selected ${isPrimary ? 'is-primary' : ''}`}
                          onClick={() => setPrimaryTopic(ct)}
                        >
                          <span>{ct}</span>
                          <span
                            className="topic-star-action"
                            title="Primary Topic"
                            onClick={e => handleSetPrimary(ct, e)}
                          >
                            <Star size={13} fill={isPrimary ? 'currentColor' : 'none'} />
                          </span>
                          <X
                            size={12}
                            style={{ marginLeft: '4px', cursor: 'pointer' }}
                            onClick={e => {
                              e.stopPropagation();
                              setCustomTopics(prev => prev.filter(t => t !== ct));
                              if (primaryTopic === ct) setPrimaryTopic('');
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: CONTEXT, SHARING & INTEGRITY */}
          {step === 3 && (
            <div>
              {/* Sharing & Visibility Choice */}
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label className="input-label">Publishing & Visibility Destination</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  {/* Option 1: Community Library */}
                  <div
                    onClick={() => { setVisibility('public'); setFulfilledRequestId(''); }}
                    style={{
                      border: visibility === 'public' && !fulfilledRequestId ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      background: visibility === 'public' && !fulfilledRequestId ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Globe size={16} color="var(--color-primary)" />
                      <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-deep)' }}>
                        Community Library
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-muted)' }}>
                      Published for all students to discover, download, and study. (Recommended)
                    </p>
                  </div>

                  {/* Option 2: Fulfill a Request */}
                  <div
                    onClick={() => {
                      setVisibility('public');
                      if (openRequests.length > 0 && !fulfilledRequestId) {
                        setFulfilledRequestId(openRequests[0].id);
                      }
                    }}
                    style={{
                      border: fulfilledRequestId ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      background: fulfilledRequestId ? 'var(--color-primary-light)' : 'var(--color-surface)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <Users size={16} color="var(--color-primary)" />
                      <strong style={{ fontSize: 'var(--text-sm)', color: 'var(--color-deep)' }}>
                        Fulfill Peer Request
                      </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-muted)' }}>
                      Answering a classmate's request. Automatically credits you and notifies the requester!
                    </p>
                  </div>
                </div>

                {/* If Fulfill Peer Request selected, show request picker */}
                {fulfilledRequestId && openRequests.length > 0 && (
                  <div style={{
                    marginTop: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    background: 'var(--color-base)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)'
                  }}>
                    <label className="input-label" htmlFor="request-select">
                      Select which request you are answering:
                    </label>
                    <select
                      id="request-select"
                      className="select"
                      style={{ width: '100%', fontSize: 'var(--text-sm)' }}
                      value={fulfilledRequestId}
                      onChange={e => setFulfilledRequestId(e.target.value)}
                    >
                      {openRequests.map(req => (
                        <option key={req.id} value={req.id}>
                          {req.subjectName ? `${req.subjectName}: ` : ''}{req.topicName} (requested by {req.requesterName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Department & Semester */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
                <div>
                  <label className="input-label" htmlFor="dept-input">Academic Department</label>
                  <input
                    id="dept-input"
                    className="input"
                    type="text"
                    placeholder="e.g. Computer Science & Engineering"
                    value={department}
                    onChange={e => setDepartment(e.target.value)}
                  />
                </div>
                <div>
                  <label className="input-label" htmlFor="sem-select">Semester</label>
                  <select
                    id="sem-select"
                    className="select"
                    style={{ width: '100%' }}
                    value={semester}
                    onChange={e => setSemester(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description / Study Notes Summary */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="input-label" htmlFor="desc-textarea">
                  Description & Study Highlights
                </label>
                <textarea
                  id="desc-textarea"
                  className="input"
                  rows={3}
                  placeholder="Provide context for peers: e.g. Includes detailed memory diagrams for heap vs stack, step-by-step 2023 exam questions, and summarized formulas."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Tags & Keywords */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="input-label">Discovery Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                  {SUGGESTED_TAGS.map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`topic-chip-card ${tags.includes(t) ? 'selected' : ''}`}
                      onClick={() => handleToggleTag(t)}
                    >
                      #{t}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    className="input"
                    type="text"
                    placeholder="Add custom tag (e.g. viva-questions)"
                    value={customTagInput}
                    onChange={e => setCustomTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomTag();
                      }
                    }}
                    style={{ fontSize: 'var(--text-sm)' }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAddCustomTag}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>

              {/* Contributor Name */}
              <div style={{ marginTop: 'var(--space-4)' }}>
                <label className="input-label" htmlFor="author-input">
                  Contributor Name <span style={{ color: 'var(--color-primary)' }}>*</span>
                </label>
                <input
                  id="author-input"
                  className="input"
                  type="text"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                />
              </div>

              {/* Academic Quality & Legibility Checkbox */}
              <div style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-base)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)'
              }}>
                <input
                  id="integrity-check"
                  type="checkbox"
                  checked={integrityConfirmed}
                  onChange={e => setIntegrityConfirmed(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="integrity-check" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-deep)', cursor: 'pointer', margin: 0 }}>
                  <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', color: 'var(--color-primary)', marginRight: '4px' }} />
                  I verify that these notes are academically relevant, legible, and accurate for student study.
                </label>
              </div>

              {/* Summary Pill Bar */}
              <div style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--color-base)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}>
                <span className="mono text-muted" style={{ fontSize: '11px', display: 'block', marginBottom: '4px' }}>
                  REVIEW INDEXING TARGET
                </span>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-deep)' }}>
                  {courseTitle || currentSubject?.name || 'General Course'} &rsaquo; {unitTitle || 'Module'} &rsaquo; <span style={{ color: 'var(--color-primary)' }}>{primaryTopic || 'All Topics'}</span>
                </div>
              </div>

              {/* Upload Progress Bar if submitting */}
              {uploading && (
                <div className="upload-progress-container">
                  <div className="upload-progress-track">
                    <div
                      className="upload-progress-bar"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 size={14} className="spin" />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                      {uploadStatusMessage}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 4: SUCCESS CELEBRATION */}
          {step === 4 && uploadedNote && (
            <div className="upload-success-card">
              <div className="upload-success-icon">
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ margin: '0 0 var(--space-2)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)' }}>
                {resourceKind === 'pyq' ? 'Examination Paper Published!' : 'Resource Published to Syllabus!'}
              </h3>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)', maxWidth: '420px', margin: '0 auto' }}>
                {resourceKind === 'pyq'
                  ? <>Your question paper has been indexed in the <strong>PYQ Archive</strong> under <strong>{uploadedNote.primaryTopic || currentSubject?.name}</strong> and is now accessible for exam preparation.</>
                  : <>Your note has been cataloged under <strong>{uploadedNote.primaryTopic || currentSubject?.name}</strong> and is now discoverable by students across your department.</>
                }
              </p>

              <div className="upload-summary-meta">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                  <span className="badge badge-secondary">{resourceKind === 'pyq' ? 'Past Question Paper' : uploadedNote.format}</span>
                  <span className="mono text-muted" style={{ fontSize: '11px' }}>
                    {resourceKind === 'pyq' ? `${questionCount} Questions` : `${uploadedNote.pages} pages`}
                  </span>
                </div>
                <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-base)', fontFamily: 'var(--font-display)' }}>
                  {uploadedNote.title}
                </h4>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  <span className="chip">{currentSubject?.name || 'Subject'}</span>
                  {resourceKind === 'pyq' && (
                    <span className="chip chip-primary">
                      {examMonth} {examYear} • {examType}
                    </span>
                  )}
                  {uploadedNote.primaryTopic && (
                    <span className="chip" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                      <Star size={11} fill="currentColor" style={{ marginRight: '4px' }} />
                      {uploadedNote.primaryTopic}
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', width: '100%', marginTop: 'var(--space-3)' }}>
                {resourceKind === 'pyq' ? (
                  <>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => {
                        handleClose();
                        navigate(`/pyq/${uploadedPyqId || uploadedNote.id}`);
                      }}
                    >
                      <BookOpen size={16} /> Open Paper
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => {
                        handleClose();
                        navigate('/pyq');
                      }}
                    >
                      <Layers size={16} /> PYQ Archive
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={handleOpenReader}
                    >
                      <BookOpen size={16} /> Open in Reader
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={handleViewContributions}
                    >
                      <Layers size={16} /> My Contributions
                    </button>
                  </>
                )}
              </div>

              {resourceKind === 'note' && uploadedNote && (
                <button
                  className="btn btn-sm"
                  style={{
                    width: '100%',
                    justifyContent: 'center',
                    marginTop: 'var(--space-2)',
                    borderColor: 'var(--color-primary-muted)',
                    color: 'var(--color-primary)'
                  }}
                  onClick={() => {
                    const url = `${window.location.origin}/notes/${uploadedNote.id}`;
                    navigator.clipboard.writeText(url);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                >
                  <Share2 size={14} />
                  <span>{copiedLink ? '✓ Study Link Copied to Clipboard!' : 'Share Note Link with Classmates'}</span>
                </button>
              )}

              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 'var(--space-4)', color: 'var(--color-muted)' }}
                onClick={handleUploadAnother}
              >
                Upload another resource
              </button>
            </div>
          )}
        </div>

        {/* Footer (Navigation for Steps 1-3) */}
        {step < 4 && (
          <div className="modal-footer" style={{ borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
            {step > 1 ? (
              <button
                className="btn btn-ghost"
                onClick={() => setStep((step - 1) as Step)}
                disabled={uploading}
              >
                <ChevronLeft size={16} /> Back
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={handleClose} disabled={uploading}>
                Cancel
              </button>
            )}

            {step < 3 ? (
              <button
                className="btn btn-primary"
                onClick={() => setStep((step + 1) as Step)}
                disabled={!canProceed()}
              >
                Next Step <ChevronRight size={16} />
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!canProceed() || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="spin" /> Publishing...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Publish Resource
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
