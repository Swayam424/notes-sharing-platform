import { useState } from 'react';
import { X, CheckCircle2, FileText, ArrowRight, Upload, Sparkles, AlertCircle } from 'lucide-react';
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
  const [success, setSuccess] = useState(false);

  if (!isOpen || !request) return null;

  // Filter notes that match the requested subject
  const subjectNotes = availableNotes.filter(
    n => n.subjectId === request.subjectId || (Boolean(n.subjectName) && n.subjectName!.toLowerCase() === request.subjectName.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNoteId) {
      setError('Please select a note from your library to fulfill this request.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.fulfillNoteRequest(request.id, selectedNoteId);
      setSuccess(true);
      setTimeout(() => {
        onFulfilled(request.id, res.fulfilledNoteId, res.fulfilledNoteTitle);
        onClose();
        setSuccess(false);
        setSelectedNoteId('');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to fulfill request.');
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
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1F1C18] dark:text-white">
                Share Notes with Classmates
              </h2>
              <p className="text-xs text-[#7A7265] dark:text-[#999]">
                Fulfill note request requested by {request.requesterName}
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
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600 animate-bounce">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold">Thank You for Sharing!</h3>
            <p className="text-xs text-[#7A7265] dark:text-[#999] max-w-xs">
              Your notes are now linked to this request and classmates can immediately study them.
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

            {/* Requested Topic Card */}
            <div className="p-3.5 rounded-xl bg-[#F0EAE1] dark:bg-[#282828] border border-[#E0D8CB] dark:border-[#383838]">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#C85A32] uppercase tracking-wider mb-1">
                <span>{request.subjectCode || request.subjectName}</span>
                {request.unitName && (
                  <>
                    <span>•</span>
                    <span className="text-[#7A7265] dark:text-[#AAA]">{request.unitName}</span>
                  </>
                )}
              </div>
              <h4 className="text-sm font-semibold text-[#1F1C18] dark:text-white">
                {request.topicName}
              </h4>
              {request.description && (
                <p className="text-xs text-[#7A7265] dark:text-[#999] mt-1 italic">
                  "{request.description}"
                </p>
              )}
            </div>

            {/* Select Note from Existing Library */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A7265] dark:text-[#888] mb-2">
                Select Matching Notes to Share *
              </label>

              {subjectNotes.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {subjectNotes.map(n => {
                    const isSelected = selectedNoteId === n.id;
                    return (
                      <div
                        key={n.id}
                        onClick={() => setSelectedNoteId(n.id)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'bg-[#C85A32]/10 border-[#C85A32] dark:border-[#C85A32]'
                            : 'bg-white dark:bg-[#252525] border-[#E5E0D8] dark:border-[#383838] hover:border-[#C85A32]/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-[#C85A32] text-white' : 'bg-black/5 dark:bg-white/5 text-[#7A7265]'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-semibold truncate text-[#1F1C18] dark:text-white">
                            {n.title}
                          </h5>
                          <p className="text-[11px] text-[#7A7265] dark:text-[#999] truncate">
                            {n.author} • {n.format} • {n.pages} pages
                          </p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center mt-1 shrink-0 ${
                          isSelected ? 'border-[#C85A32] bg-[#C85A32] text-white' : 'border-[#CCC] dark:border-[#555]'
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                  No notes in your current library directly match this subject. You can upload a new note right now to fulfill it!
                </div>
              )}
            </div>

            {/* Quick Upload Action if user wants to upload fresh */}
            {onOpenUploadModal && (
              <div className="pt-1 flex items-center justify-between text-xs text-[#7A7265] dark:text-[#AAA]">
                <span>Have physical/PDF notes not uploaded yet?</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUploadModal();
                  }}
                  className="font-semibold text-[#C85A32] hover:underline flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Fresh Note</span>
                </button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D9] dark:border-[#2C2C2C]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#7A7265] dark:text-[#AAA] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedNoteId}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Linking...' : 'Fulfill & Share Notes'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
