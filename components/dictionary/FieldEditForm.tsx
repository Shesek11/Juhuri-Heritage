import React, { useState } from 'react';
import { Send, Loader2, X as XIcon } from 'lucide-react';
import apiService from '../../services/apiService';
import { FIELD_LABELS } from '../../utils/fieldLabels';

/** Inline field edit form for suggesting corrections */
const FieldEditForm: React.FC<{
  entryId: string;
  fieldName: string;
  currentValue: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ entryId, fieldName, currentValue, onClose, onSuccess }) => {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      await apiService.post(`/dictionary/entries/${entryId}/suggest-field`, {
        fieldName,
        currentValue,
        suggestedValue: value.trim(),
        reason: reason.trim() || undefined,
      });
      setMessage('ההצעה נשלחה בהצלחה!');
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err: any) {
      setMessage(err.message || 'שגיאה בשליחת ההצעה');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-2 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
          הצע תיקון ל{FIELD_LABELS[fieldName] || fieldName}
        </span>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" title="סגור">
          <XIcon size={14} />
        </button>
      </div>
      {currentValue && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          ערך נוכחי: <span className="font-medium">{currentValue}</span>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="הערך המוצע..."
        required
        autoFocus
        className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        dir="auto"
      />
      <input
        type="text"
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="סיבה / מקור (אופציונלי)"
        className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        dir="auto"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          שלח הצעה
        </button>
        {message && (
          <span className={`text-xs ${message.includes('שגיאה') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
};

export default FieldEditForm;
