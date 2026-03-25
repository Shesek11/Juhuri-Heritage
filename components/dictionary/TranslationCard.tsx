import React from 'react';
import { Volume2, ThumbsUp, ThumbsDown, Edit3 } from 'lucide-react';
import { Translation, DictionaryEntry, PendingSuggestion } from '../../types';
import EditableField from './EditableField';

interface EnrichmentData {
  hebrew?: string;
  latin?: string;
  cyrillic?: string;
}

interface TranslationCardProps {
  translation: Translation;
  index: number;
  entry: DictionaryEntry;
  voteData: { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null } | null;
  isPlaying: string | null;
  editingField: string | null;
  onPlay: (text: string, id: string) => void;
  onVote: (translationId: number, voteType: 'up' | 'down') => void;
  onStartEdit: (fieldName: string) => void;
  onCloseEdit: () => void;
  onSuggestCorrection?: (translation: Translation, entryId: string, term: string) => void;
  pendingSuggestions?: PendingSuggestion[];
  enrichmentLoading?: boolean;
  enrichmentData?: EnrichmentData | null;
}

const TranslationCard: React.FC<TranslationCardProps> = ({
  translation: t,
  index: idx,
  entry,
  voteData,
  isPlaying,
  editingField,
  onPlay,
  onVote,
  onStartEdit,
  onCloseEdit,
  onSuggestCorrection,
  pendingSuggestions = [],
  enrichmentLoading = false,
  enrichmentData,
}) => {
  const latinSuggestion = pendingSuggestions.find(s => s.fieldName === 'latin');
  const cyrillicSuggestion = pendingSuggestions.find(s => s.fieldName === 'cyrillic');
  const hebrewSuggestion = pendingSuggestions.find(s => s.fieldName === 'hebrew');

  return (
    <div className="relative p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group border border-white/10">
      <div className="flex gap-3">
        {/* Play button */}
        <button
          onClick={() => onPlay(t.cyrillic || t.latin || t.hebrew, `trans-${idx}`)}
          className={`p-2 rounded-full text-slate-400 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all self-start mt-1 shrink-0 ${isPlaying === `trans-${idx}` ? 'text-indigo-600 !opacity-100 animate-pulse' : ''}`}
        >
          <Volume2 size={20} />
        </button>

        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Hebrew */}
          <EditableField
            entryId={entry.id}
            fieldName="hebrew"
            dbValue={t.hebrew}
            aiValue={enrichmentData?.hebrew}
            isEnriching={enrichmentLoading && !t.hebrew}
            pendingSuggestion={hebrewSuggestion}
            fieldSource={entry.fieldSources?.hebrew}
            valueClassName="text-2xl font-bold text-slate-100 font-rubik"
            isEditing={editingField === 'hebrew'}
            onStartEdit={() => onStartEdit('hebrew')}
            onCloseEdit={onCloseEdit}
          />

          {/* Latin + Dialect row */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {t.dialect && t.dialect !== 'לא ידוע' && (
              <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-xs">{t.dialect}</span>
            )}
            <EditableField
              entryId={entry.id}
              fieldName="latin"
              dbValue={t.latin}
              aiValue={enrichmentData?.latin}
              isEnriching={enrichmentLoading && !t.latin}
              pendingSuggestion={latinSuggestion}
              fieldSource={entry.fieldSources?.latin}
              compact
              valueClassName="text-slate-300 font-mono tracking-wide"
              isEditing={editingField === 'latin'}
              onStartEdit={() => onStartEdit('latin')}
              onCloseEdit={onCloseEdit}
            />
          </div>

          {/* Cyrillic */}
          <EditableField
            entryId={entry.id}
            fieldName="cyrillic"
            dbValue={t.cyrillic}
            aiValue={enrichmentData?.cyrillic}
            isEnriching={enrichmentLoading && !t.cyrillic}
            pendingSuggestion={cyrillicSuggestion}
            fieldSource={entry.fieldSources?.cyrillic}
            compact
            valueClassName="text-lg text-slate-400 font-serif"
            isEditing={editingField === 'cyrillic'}
            onStartEdit={() => onStartEdit('cyrillic')}
            onCloseEdit={onCloseEdit}
          />

          {/* Voting and Correction Row */}
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
            {t.id && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onVote(t.id!, 'up')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${voteData?.userVote === 'up'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'text-slate-400 hover:bg-white/10'
                    }`}
                  title="הצבע לטובה"
                >
                  <ThumbsUp size={14} />
                  <span className="font-bold">{voteData?.upvotes || 0}</span>
                </button>
                <button
                  onClick={() => onVote(t.id!, 'down')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${voteData?.userVote === 'down'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'text-slate-400 hover:bg-white/10'
                    }`}
                  title="הצבע נגד"
                >
                  <ThumbsDown size={14} />
                  <span className="font-bold">{voteData?.downvotes || 0}</span>
                </button>
              </div>
            )}
            {entry.id && (
              <button
                onClick={() => onSuggestCorrection?.(t, entry.id!, entry.term)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                title="הצע תיקון"
              >
                <Edit3 size={14} />
                <span>הצע תיקון</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranslationCard;
