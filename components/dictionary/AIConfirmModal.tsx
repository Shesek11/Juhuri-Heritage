import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, Edit3, Loader2, X as XIcon, Sparkles } from 'lucide-react';
import apiService from '../../services/apiService';
import { FIELD_LABELS } from '../../utils/fieldLabels';

interface AIConfirmModalProps {
  entryId: string;
  fieldName: string;
  aiValue: string;
  onClose: () => void;
  onConfirmed: () => void;
}

/** Modal for confirming or correcting an AI-generated field value */
const AIConfirmModal: React.FC<AIConfirmModalProps> = ({
  entryId,
  fieldName,
  aiValue,
  onClose,
  onConfirmed,
}) => {
  const [mode, setMode] = useState<'confirm' | 'correct'>('confirm');
  const [correctedValue, setCorrectedValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  const label = FIELD_LABELS[fieldName] || fieldName;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleConfirm = async () => {
    setSubmitting(true);
    setMessage('');
    try {
      await apiService.post(`/dictionary/entries/${entryId}/confirm-ai-field`, {
        fieldName,
        value: aiValue,
      });
      setMessage('אושר ונשמר!');
      setTimeout(() => { onConfirmed(); onClose(); }, 1000);
    } catch (err: any) {
      setMessage(err.message || 'שגיאה באישור');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCorrect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctedValue.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      await apiService.post(`/dictionary/entries/${entryId}/suggest-field`, {
        fieldName,
        currentValue: aiValue,
        suggestedValue: correctedValue.trim(),
        reason: reason.trim() || 'תיקון הצעת AI',
      });
      setMessage('ההצעה נשלחה!');
      setTimeout(() => { onConfirmed(); onClose(); }, 1000);
    } catch (err: any) {
      setMessage(err.message || 'שגיאה בשליחה');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm mx-4 bg-[#0d1424] border border-white/15 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 text-slate-400 hover:text-white transition-colors"
        >
          <XIcon size={16} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-amber-400" />
          <h3 className="text-sm font-bold text-white">הצעת AI — {label}</h3>
        </div>

        {/* AI Value display */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400/70 mb-1">הערך שנוצר על ידי AI:</p>
          <p className="text-base text-white font-medium" dir="auto">{aiValue}</p>
        </div>

        {mode === 'confirm' ? (
          /* Confirm mode */
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              האם הערך נכון? לחץ אישור לשמור, או תקן אם צריך שינוי.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                אשר ושמור
              </button>
              <button
                type="button"
                onClick={() => setMode('correct')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-white/10 text-slate-300 rounded-lg hover:bg-white/15 hover:text-white disabled:opacity-50 transition-colors"
              >
                <Edit3 size={14} />
                תקן
              </button>
            </div>
          </div>
        ) : (
          /* Correct mode */
          <form onSubmit={handleCorrect} className="space-y-3">
            <input
              type="text"
              value={correctedValue}
              onChange={(e) => setCorrectedValue(e.target.value)}
              placeholder="הערך הנכון..."
              required
              autoFocus
              dir="auto"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-white/5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="סיבה / מקור (אופציונלי)"
              dir="auto"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-600 bg-white/5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={submitting || !correctedValue.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
                שלח תיקון
              </button>
              <button
                type="button"
                onClick={() => setMode('confirm')}
                disabled={submitting}
                className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                חזור
              </button>
            </div>
          </form>
        )}

        {/* Status message */}
        {message && (
          <p className={`text-xs text-center ${message.includes('שגיאה') ? 'text-red-400' : 'text-green-400'}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default AIConfirmModal;
