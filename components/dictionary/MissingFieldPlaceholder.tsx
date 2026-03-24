import React, { useState } from 'react';
import { Plus, Clock, ThumbsUp, Loader2 } from 'lucide-react';
import { FIELD_LABELS } from '../../utils/fieldLabels';
import FieldEditForm from './FieldEditForm';
import type { PendingSuggestion } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

interface MissingFieldPlaceholderProps {
  fieldName: string;
  entryId?: string;
  pendingSuggestion?: PendingSuggestion | null;
  isEnriching?: boolean;
  /** Compact mode for inline fields like latin/cyrillic inside translation cards */
  compact?: boolean;
}

/** Placeholder shown when a field is empty — invites users to contribute */
const MissingFieldPlaceholder: React.FC<MissingFieldPlaceholderProps> = ({
  fieldName,
  entryId,
  pendingSuggestion,
  isEnriching,
  compact = false,
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [upvoted, setUpvoted] = useState(false);

  const label = FIELD_LABELS[fieldName] || fieldName;

  const handleUpvote = async () => {
    if (!pendingSuggestion || upvoted || upvoting) return;
    setUpvoting(true);
    try {
      await apiService.post(`/dictionary/suggestions/${pendingSuggestion.id}/upvote`);
      setUpvoted(true);
    } catch {
      // silently fail
    } finally {
      setUpvoting(false);
    }
  };

  // Loading state — AI enriching
  if (isEnriching) {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2 px-3'} rounded-md`}>
        <div className="flex items-center gap-1.5 text-xs text-amber-400">
          <Loader2 size={12} className="animate-spin" />
          <span>AI מעשיר...</span>
        </div>
        <div className={`flex-1 ${compact ? 'h-4' : 'h-5'} bg-white/5 rounded animate-pulse`} />
      </div>
    );
  }

  // Pending suggestion state
  if (pendingSuggestion) {
    const isOwnSuggestion = user?.id && pendingSuggestion.userId === user.id;

    return (
      <div className={`${compact ? 'py-1.5 px-2' : 'py-2 px-3'} rounded-md border border-amber-500/30 bg-amber-500/5`}>
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
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors ${
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
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-white/5 text-slate-400 hover:bg-white/10 hover:text-indigo-400 transition-colors"
              >
                <Plus size={10} />
                הצעה חלופית
              </button>
            </div>
          )}
        </div>
        {showForm && entryId && (
          <FieldEditForm
            entryId={entryId}
            fieldName={fieldName}
            currentValue=""
            onClose={() => setShowForm(false)}
            onSuccess={() => setShowForm(false)}
          />
        )}
      </div>
    );
  }

  // Empty state — invite contribution
  if (!entryId) {
    return null; // Can't contribute without an entry ID
  }

  if (showForm) {
    return (
      <FieldEditForm
        entryId={entryId}
        fieldName={fieldName}
        currentValue=""
        onClose={() => setShowForm(false)}
        onSuccess={() => setShowForm(false)}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowForm(true)}
      className={`w-full flex items-center gap-2 ${
        compact ? 'py-1.5 px-2 text-xs' : 'py-2 px-3 text-sm'
      } rounded-md border border-dashed border-slate-600/40 text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 hover:bg-indigo-500/5 transition-all cursor-pointer group/add`}
    >
      <Plus size={compact ? 12 : 14} className="shrink-0 opacity-50 group-hover/add:opacity-100 transition-opacity" />
      <span>הוסף {label}</span>
    </button>
  );
};

export default MissingFieldPlaceholder;
