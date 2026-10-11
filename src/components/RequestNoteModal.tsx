import { useState } from 'react';
import { X, Send, BookOpen, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
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
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const currentSubject = subjects.find(s => s.id === subjectId) || subjects[0];
  const units = currentSubject?.units || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError('Please select a course / subject.');
      return;
    }
    if (!topicName.trim()) {
      setError('Please specify the topic or lecture name you need notes for.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await api.createNoteRequest({
        subjectId,
        unitId: unitId || undefined,
        topicName: topicName.trim(),
        description: description.trim() || undefined
      });

      setSuccess(true);
      setTimeout(() => {
        onRequestCreated(created);
        onClose();
        setSuccess(false);
        setTopicName('');
        setDescription('');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] dark:bg-[#1E1E1E] text-[#2D2A26] dark:text-[#EDEDED] border border-[#E8E2D9] dark:border-[#333] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8E2D9] dark:border-[#2C2C2C] bg-[#F4EFEA] dark:bg-[#252525]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C85A32]/10 dark:bg-[#C85A32]/20 flex items-center justify-center text-[#C85A32]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1F1C18] dark:text-white">
                Request Notes from Classmates
              </h2>
              <p className="text-xs text-[#7A7265] dark:text-[#999]">
                Crowdsource missing lecture notes or tricky derivations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7A7265] hover:text-[#1F1C18] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {success ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold">Request Posted to Your Batch!</h3>
            <p className="text-xs text-[#7A7265] dark:text-[#999] max-w-xs">
              Peers will see this in the requested notes feed and can upload or link matching notes directly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Subject Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7265] dark:text-[#888] mb-1.5">
                Target Subject / Course *
              </label>
              <select
                value={subjectId}
                onChange={e => {
                  setSubjectId(e.target.value);
                  setUnitId('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#282828] border border-[#DDD6CC] dark:border-[#404040] text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A32]/40"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.code} — ` : ''}{s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Optional Unit Selector */}
            {units.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7265] dark:text-[#888] mb-1.5">
                  Unit (Optional)
                </label>
                <select
                  value={unitId}
                  onChange={e => setUnitId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#282828] border border-[#DDD6CC] dark:border-[#404040] text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A32]/40"
                >
                  <option value="">Any / General Unit</option>
                  {units.map((u, idx) => (
                    <option key={u.id} value={u.id}>
                      Unit {idx + 1}: {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Topic / Lecture Title */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7265] dark:text-[#888] mb-1.5">
                Topic or Lecture Name *
              </label>
              <input
                type="text"
                value={topicName}
                onChange={e => setTopicName(e.target.value)}
                placeholder="e.g. CMOS Inverter Noise Margins / Tuesday Lecture"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#282828] border border-[#DDD6CC] dark:border-[#404040] text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A32]/40"
                required
              />
            </div>

            {/* Description / Specific Request Details */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7265] dark:text-[#888] mb-1.5">
                Specific Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Missed Friday's class, need legible diagrams and step-by-step mathematical steps."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#282828] border border-[#DDD6CC] dark:border-[#404040] text-sm focus:outline-none focus:ring-2 focus:ring-[#C85A32]/40 resize-none"
              />
            </div>

            {/* Tips banner */}
            <div className="p-3 rounded-xl bg-[#FAF0E6] dark:bg-[#2A231F] border border-[#F0DFD1] dark:border-[#3D3028] text-xs text-[#7A7265] dark:text-[#AAA] flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
              <span>
                Classmates enrolled in this subject will see your request in their feed and can link or upload matching notes with one click.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#7A7265] dark:text-[#AAA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#C85A32] hover:bg-[#B34E28] text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-60"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Post Note Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
