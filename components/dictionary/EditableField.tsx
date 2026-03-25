import React, { useState } from 'react';
import { Pencil, Plus, Send, Loader2, X as XIcon, Clock, ThumbsUp } from 'lucide-react';
import DictionaryInput from './inputs/DictionaryInput';
import AIValueBadge from './AIValueBadge';
import FieldSourceBadge from './FieldSourceBadge';
import { FIELD_LABELS } from '../../utils/fieldLabels';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import type { PendingSuggestion } from '../../types';

interface EditableFieldProps {
  entryId?: string;
  fieldName: string;
  dbValue?: string;
  aiValue?: string;
  isEnriching?: boolean;
  pendingSuggestion?: PendingSuggestion | null;
  fieldSource?: string;
  latinHint?: string;
  compact?: boolean;
  valueClassName?: string;
  onSuggestionSubmitted?: () => void;
  /** External edit state control */
  isEditing?: boolean;
  onStartEdit?: () => void;
  onCloseEdit?: () => void;
}

const EditableField: React.FC<EditableFieldProps> = ({
  entryId,
  fieldName,
  dbValue,
  aiValue,
  isEnriching,
  pendingSuggestion,
  fieldSource,
  latinHint,
  compact = false,
  valueClassName = '',
  onSuggestionSubmitted,
  isEditing: externalIsEditing,
  onStartEdit: externalOnStartEdit,
  onCloseEdit: externalOnCloseEdit,
}) => {
  const { user } = useAuth();

  // Internal edit state (used when no external control)
  const [internalEditing, setInternalEditing] = useState(false);
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalEditing;
  const startEdit = externalOnStartEdit || (() => setInternalEditing(true));
  const closeEdit = externalOnCloseEdit || (() => setInternalEditing(false));

  // Form state
  const [formValue, setFormValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Upvote state
  const [upvoting, setUpvoting] = useState(false);
  const [upvoted, setUpvoted] = useState(false);

  const label = FIELD_LABELS[fieldName] || fieldName;

  const handleStartEdit = () => {
    setFormValue('');
    setReason('');
    setMessage('');
    startEdit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValue.trim() || !entryId) return;
    setSubmitting(true);
    setMessage('');
    try {
      await apiService.post(`/dictionary/entries/${entryId}/suggest-field`, {
        fieldName,
        currentValue: dbValue || aiValue || '',
        suggestedValue: formValue.trim(),
        reason: reason.trim() || undefined,
      });
      setMessage('ההצעה נשלחה בהצלחה!');
      setTimeout(() => {
        closeEdit();
        onSuggestionSubmitted?.();
      }, 1500);
    } catch (err: any) {
      setMessage(err.message || 'שגיאה בשליחת ההצעה');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async () => {
    if (!pendingSuggestion || upvoted || upvoting) return;
    setUpvoting(true);
    try {
      await apiService.post(`/dictionary/suggestions/${pendingSuggestion.id}/upvote`);
      setUpvoted(true);
    } catch { /* silently fail */ }
    finally { setUpvoting(false); }
  };

  const editButton = entryId ? (
    <button
      type="button"
      onClick={handleStartEdit}
      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors shrink-0 ${
        compact ? '' : 'opacity-100 md:opacity-0 md:group-hover/field:opacity-100'
      }`}
      title={`ערוך ${label}`}
    >
      <Pencil size={10} />
      {!compact && 'ערוך'}
    </button>
  ) : null;

  // ─── STATE 6: EDITING ───
  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="mt-1 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-2 animate-in fade-in slide-in-from-top-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
            הצע {dbValue || aiValue ? 'תיקון' : 'ערך'} ל{label}
          </span>
          <button type="button" onClick={closeEdit} className="text-slate-400 hover:text-slate-600" title="סגור">
            <XIcon size={14} />
          </button>
        </div>
        {(dbValue || aiValue) && (
          <div className="text-xs text-slate-400">
            ערך נוכחי: <span className="font-medium">{dbValue || aiValue}</span>
          </div>
        )}
        <DictionaryInput
          fieldName={fieldName}
          value={formValue}
          onChange={setFormValue}
          latinHint={latinHint}
          autoFocus
        />
        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="סיבה / מקור (אופציונלי)"
          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
          dir="rtl"
        />
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || !formValue.trim()}
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
  }

  // ─── STATE 1: HAS DB VALUE ───
  if (dbValue) {
    return (
      <div className={`group/field flex items-center gap-1.5 ${compact ? '' : 'flex-wrap'}`}>
        <span className={valueClassName || (compact ? 'text-sm text-slate-200' : 'text-base text-slate-100')} dir="auto">
          {dbValue}
        </span>
        <FieldSourceBadge source={fieldSource} />
        {editButton}
        {isEnriching && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-400/60">
            <Loader2 size={8} className="animate-spin" />
          </span>
        )}
      </div>
    );
  }

  // ─── STATE 2: HAS AI VALUE ───
  if (aiValue) {
    return (
      <div className={`group/field flex items-center gap-1.5 ${compact ? '' : 'flex-wrap'}`}>
        <AIValueBadge
          value={aiValue}
          entryId={entryId}
          fieldName={fieldName}
          valueClassName={valueClassName || (compact ? 'text-sm text-slate-200' : 'text-base text-slate-100')}
          inline
        />
        {editButton}
      </div>
    );
  }

  // ─── STATE 3: ENRICHING (no value yet) ───
  if (isEnriching) {
    return (
      <div className={`group/field flex items-center gap-2 ${compact ? 'py-1' : 'py-2'}`}>
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <Loader2 size={12} className="animate-spin" />
          <span>AI מעשיר...</span>
        </div>
        <div className={`flex-1 ${compact ? 'h-4' : 'h-5'} bg-white/5 rounded animate-pulse max-w-[120px]`} />
        {entryId && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors shrink-0"
          >
            <Pencil size={10} />
            הוסף ידנית
          </button>
        )}
      </div>
    );
  }

  // ─── STATE 4: PENDING SUGGESTION ───
  if (pendingSuggestion) {
    const isOwnSuggestion = user?.id && pendingSuggestion.userId === user.id;
    return (
      <div className={`group/field ${compact ? 'py-1.5 px-2' : 'py-2 px-3'} rounded-md border border-amber-500/30 bg-amber-500/5`}>
        <div className="flex items-center gap-2 flex-wrap">
          <Clock size={12} className="text-amber-500 shrink-0" />
          {isOwnSuggestion ? (
            <span className="text-xs text-green-500 font-medium">ההצעה שלך נשמרה לבדיקה</span>
          ) : (
            <span className="text-xs text-amber-400">יש הצעה ממתינה</span>
          )}
          <span className={`${compact ? 'text-sm' : 'text-base'} text-slate-300 font-medium`} dir="auto">
            {pendingSuggestion.suggestedValue}
          </span>
          {!isOwnSuggestion && entryId && (
            <div className="flex items-center gap-1 mr-auto">
              <button
                onClick={handleUpvote}
                disabled={upvoted || upvoting}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                  upvoted
                    ? 'bg-green-900/30 text-green-400'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-green-400'
                }`}
                title="חיזוק ההצעה"
              >
                {upvoting ? <Loader2 size={10} className="animate-spin" /> : <ThumbsUp size={10} />}
                {upvoted ? 'חוזק' : 'חזק'}
              </button>
              <button
                onClick={handleStartEdit}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-white/5 text-slate-400 hover:bg-white/10 hover:text-indigo-400 transition-colors"
              >
                <Plus size={10} />
                הצעה חלופית
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── STATE 5: EMPTY ───
  if (!entryId) return null;

  return (
    <button
      type="button"
      onClick={handleStartEdit}
      className={`flex items-center gap-2 ${
        compact ? 'py-1.5 px-2 text-xs' : 'py-2 px-3 text-sm'
      } rounded-md border border-dashed border-slate-600/40 text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all cursor-pointer group/add`}
    >
      <Plus size={compact ? 12 : 14} className="shrink-0 opacity-50 group-hover/add:opacity-100 transition-opacity" />
      <span>הוסף {label}</span>
    </button>
  );
};

export default EditableField;
