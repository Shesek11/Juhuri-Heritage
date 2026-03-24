import React from 'react';
import { Pencil, Bot, Loader2 } from 'lucide-react';
import { DictionaryEntry, PendingSuggestion } from '../../types';
import FieldSourceBadge from '../dictionary/FieldSourceBadge';
import ConfirmAiButton from '../dictionary/ConfirmAiButton';
import FieldEditForm from '../dictionary/FieldEditForm';
import MissingFieldPlaceholder from '../dictionary/MissingFieldPlaceholder';

interface MeaningSectionProps {
  entry: DictionaryEntry;
  editingField: string | null;
  onStartEdit: (fieldName: string) => void;
  onCloseEdit: () => void;
  pendingSuggestions?: PendingSuggestion[];
  enrichmentLoading?: boolean;
  enrichedDefinition?: string;
}

const EditBtn: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0"
  >
    <Pencil size={10} /> ערוך
  </button>
);

const MeaningSection: React.FC<MeaningSectionProps> = ({
  entry,
  editingField,
  onStartEdit,
  onCloseEdit,
  pendingSuggestions = [],
  enrichmentLoading = false,
  enrichedDefinition,
}) => {
  const hebrewSuggestion = pendingSuggestions.find(s => s.fieldName === 'hebrew');
  const defSuggestion = pendingSuggestions.find(s => s.fieldName === 'definition');

  const primaryHebrew = entry.translations?.[0]?.hebrew;

  // Definition from DB or AI enrichment
  const defText = entry.definitions.length > 0 ? entry.definitions.join('; ') : '';
  const displayDefinition = defText || enrichedDefinition;
  const isDefinitionFromAI = !defText && !!enrichedDefinition;
  // Show definition only if it adds info beyond the Hebrew translation
  const showDefinition = displayDefinition && displayDefinition !== primaryHebrew;

  return (
    <div className="space-y-3">
      {/* Hebrew translation */}
      <div className="flex items-start gap-2">
        <span className="text-sm text-slate-500 mt-1.5 shrink-0 min-w-[100px]">עברית:</span>
        {primaryHebrew ? (
          <div className="flex items-center gap-2 flex-wrap group flex-1">
            <span className="text-2xl font-bold text-slate-100 font-rubik">{primaryHebrew}</span>
            <FieldSourceBadge source={entry.fieldSources?.hebrew} />
            <ConfirmAiButton entryId={entry.id} fieldName="hebrew" value={primaryHebrew} source={entry.fieldSources?.hebrew} />
            {entry.id && <EditBtn onClick={() => onStartEdit('hebrew')} />}
          </div>
        ) : (
          <div className="flex-1">
            {enrichmentLoading ? (
              <div className="flex items-center gap-2 text-xs text-amber-400">
                <Loader2 size={12} className="animate-spin" />
                <span>AI מתרגם...</span>
                <div className="flex-1 h-5 bg-white/5 rounded animate-pulse" />
              </div>
            ) : (
              <MissingFieldPlaceholder
                fieldName="hebrew"
                entryId={entry.id}
                pendingSuggestion={hebrewSuggestion}
              />
            )}
          </div>
        )}
      </div>
      {editingField === 'hebrew' && entry.id && (
        <FieldEditForm entryId={entry.id} fieldName="hebrew" currentValue={primaryHebrew || ''} onClose={onCloseEdit} onSuccess={() => {}} />
      )}

      {/* Russian translation */}
      {entry.russian && (
        <div className="flex items-start gap-2 group">
          <span className="text-sm text-slate-500 mt-0.5 shrink-0 min-w-[100px]">רוסית:</span>
          <span className="text-lg text-slate-300 font-serif flex-1 text-right">{entry.russian}</span>
          {entry.id && <EditBtn onClick={() => onStartEdit('russian')} />}
        </div>
      )}
      {editingField === 'russian' && entry.id && (
        <FieldEditForm entryId={entry.id} fieldName="russian" currentValue={entry.russian || ''} onClose={onCloseEdit} onSuccess={() => {}} />
      )}

      {/* Expanded definition — smaller, with AI badge if from enrichment */}
      {showDefinition && (
        <div className={`flex items-start gap-2 ${isDefinitionFromAI ? 'animate-in fade-in duration-500' : ''}`}>
          <span className="text-sm text-slate-500 mt-0.5 shrink-0 min-w-[100px]">תרגום (עברית):</span>
          <div className="flex items-start gap-1.5 flex-1 group">
            {isDefinitionFromAI && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-900/30 text-amber-300 shrink-0 mt-0.5">
                <Bot size={10} /> AI
              </span>
            )}
            {!isDefinitionFromAI && <FieldSourceBadge source={entry.fieldSources?.definition} />}
            <span className="text-sm text-slate-400 leading-relaxed flex-1">{displayDefinition}</span>
            {isDefinitionFromAI && entry.id && (
              <ConfirmAiButton entryId={entry.id} fieldName="definition" value={displayDefinition!} source="ai" />
            )}
            {!isDefinitionFromAI && entry.id && <EditBtn onClick={() => onStartEdit('definition')} />}
          </div>
        </div>
      )}
      {editingField === 'definition' && entry.id && (
        <FieldEditForm entryId={entry.id} fieldName="definition" currentValue={defText} onClose={onCloseEdit} onSuccess={() => {}} />
      )}

      {/* AI loading skeleton for definition */}
      {!showDefinition && !defText && enrichmentLoading && (
        <div className="flex items-start gap-2">
          <span className="text-sm text-slate-500 mt-0.5 shrink-0 min-w-[100px]">תרגום (עברית):</span>
          <div className="flex items-center gap-2 text-xs text-amber-400 flex-1">
            <Loader2 size={12} className="animate-spin" />
            <span>AI מתרגם...</span>
            <div className="flex-1 h-4 bg-white/5 rounded animate-pulse" />
          </div>
        </div>
      )}
    </div>
  );
};

export default MeaningSection;
