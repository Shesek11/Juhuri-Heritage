import React from 'react';
import { Pencil } from 'lucide-react';
import { DictionaryEntry, PendingSuggestion } from '../../types';
import FieldSourceBadge from './FieldSourceBadge';
import ConfirmAiButton from './ConfirmAiButton';
import FieldEditForm from './FieldEditForm';
import MissingFieldPlaceholder from './MissingFieldPlaceholder';

interface DetailsSectionProps {
  entry: DictionaryEntry;
  editingField: string | null;
  onStartEdit: (fieldName: string) => void;
  onCloseEdit: () => void;
  pendingSuggestions?: PendingSuggestion[];
  enrichmentLoading?: boolean;
  hideRussian?: boolean;
}

const DetailsSection: React.FC<DetailsSectionProps> = ({
  entry,
  editingField,
  onStartEdit,
  onCloseEdit,
  pendingSuggestions = [],
  enrichmentLoading = false,
  hideRussian = false,
}) => {
  const defSuggestion = pendingSuggestions.find(s => s.fieldName === 'definition');
  const rusSuggestion = pendingSuggestions.find(s => s.fieldName === 'russian');

  // Dedup: skip definition if it's identical to the first Hebrew translation
  const defText = entry.definitions.length > 0 ? entry.definitions.join('; ') : '';
  const firstHebrew = entry.translations?.[0]?.hebrew || '';
  const showDefinition = defText && defText !== firstHebrew;

  return (
    <div className="space-y-4">
      {/* Definition */}
      {showDefinition ? (
        <div className="text-slate-700 dark:text-slate-200 text-lg leading-relaxed border-b border-white/10 pb-4 font-medium group">
          <div className="flex items-start gap-1">
            <div className="flex-1">
              <FieldSourceBadge source={entry.fieldSources?.definition} />
              {defText}
            </div>
            <ConfirmAiButton entryId={entry.id} fieldName="definition" value={defText} source={entry.fieldSources?.definition} />
            {entry.id && (
              <button
                type="button"
                onClick={() => onStartEdit('definition')}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                title="הצע תיקון להגדרה"
              >
                <Pencil size={10} />
                ערוך
              </button>
            )}
          </div>
          {editingField === 'definition' && entry.id && (
            <FieldEditForm entryId={entry.id} fieldName="definition" currentValue={defText} onClose={onCloseEdit} onSuccess={() => {}} />
          )}
        </div>
      ) : !defText ? (
        <div className="border-b border-white/10 pb-4">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">הגדרה</span>
          <MissingFieldPlaceholder
            fieldName="definition"
            entryId={entry.id}
            pendingSuggestion={defSuggestion}
            isEnriching={enrichmentLoading}
          />
        </div>
      ) : (
        /* defText === firstHebrew: skip silently but still show border */
        <div className="border-b border-white/10" />
      )}

      {/* Russian — hidden when already shown in parent (e.g., WordPage DialectComparison) */}
      {!hideRussian && (entry.russian ? (
        <div className="border-b border-white/10 pb-3 group">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">רוסית</span>
            <FieldSourceBadge source={entry.fieldSources?.russian} />
            <span className="font-serif text-lg flex-1" dir="ltr">{entry.russian}</span>
            <ConfirmAiButton entryId={entry.id} fieldName="russian" value={entry.russian} source={entry.fieldSources?.russian} />
            {entry.id && (
              <button
                type="button"
                onClick={() => onStartEdit('russian')}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                title="הצע תיקון לרוסית"
              >
                <Pencil size={10} />
                ערוך
              </button>
            )}
          </div>
          {editingField === 'russian' && entry.id && (
            <FieldEditForm entryId={entry.id} fieldName="russian" currentValue={entry.russian} onClose={onCloseEdit} onSuccess={() => {}} />
          )}
        </div>
      ) : (
        <div className="border-b border-white/10 pb-3">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">רוסית</span>
          <MissingFieldPlaceholder
            fieldName="russian"
            entryId={entry.id}
            pendingSuggestion={rusSuggestion}
          />
        </div>
      ))}
    </div>
  );
};

export default DetailsSection;
