import React from 'react';
import { DictionaryEntry, PendingSuggestion } from '../../types';
import EditableField from './EditableField';

interface DetailsSectionProps {
  entry: DictionaryEntry;
  editingField: string | null;
  onStartEdit: (fieldName: string) => void;
  onCloseEdit: () => void;
  pendingSuggestions?: PendingSuggestion[];
  enrichmentLoading?: boolean;
  enrichedDefinition?: string;
  enrichedRussian?: string;
  hideRussian?: boolean;
}

const DetailsSection: React.FC<DetailsSectionProps> = ({
  entry,
  editingField,
  onStartEdit,
  onCloseEdit,
  pendingSuggestions = [],
  enrichmentLoading = false,
  enrichedDefinition,
  enrichedRussian,
  hideRussian = false,
}) => {
  const defSuggestion = pendingSuggestions.find(s => s.fieldName === 'definition');
  const rusSuggestion = pendingSuggestions.find(s => s.fieldName === 'russian');

  // Dedup: skip definition if it's identical to the first Hebrew translation
  const defText = entry.definitions.length > 0 ? entry.definitions.join('; ') : '';
  const firstHebrew = entry.translations?.[0]?.hebrew || '';
  const showDefinition = defText && defText !== firstHebrew;

  // AI enriched values
  const isDefinitionFromAI = !defText && !!enrichedDefinition;

  return (
    <div className="space-y-4">
      {/* Definition */}
      {(showDefinition || isDefinitionFromAI) ? (
        <div className="border-b border-white/10 pb-4">
          <EditableField
            entryId={entry.id}
            fieldName="definition"
            dbValue={showDefinition ? defText : undefined}
            aiValue={isDefinitionFromAI ? enrichedDefinition : undefined}
            isEnriching={enrichmentLoading && !defText}
            pendingSuggestion={defSuggestion}
            fieldSource={entry.fieldSources?.definition}
            valueClassName="text-slate-200 text-lg leading-relaxed font-medium"
            isEditing={editingField === 'definition'}
            onStartEdit={() => onStartEdit('definition')}
            onCloseEdit={onCloseEdit}
          />
        </div>
      ) : !defText ? (
        <div className="border-b border-white/10 pb-4">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-2">הגדרה</span>
          <EditableField
            entryId={entry.id}
            fieldName="definition"
            pendingSuggestion={defSuggestion}
            isEnriching={enrichmentLoading}
            isEditing={editingField === 'definition'}
            onStartEdit={() => onStartEdit('definition')}
            onCloseEdit={onCloseEdit}
          />
        </div>
      ) : (
        /* defText === firstHebrew: skip silently but still show border */
        <div className="border-b border-white/10" />
      )}

      {/* Russian — hidden when already shown in parent (e.g., WordPage DialectComparison) */}
      {!hideRussian && (
        <div className="border-b border-white/10 pb-3">
          {!entry.russian && !enrichedRussian && (
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block mb-2">רוסית</span>
          )}
          {(entry.russian || enrichedRussian) && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">רוסית</span>
            </div>
          )}
          <EditableField
            entryId={entry.id}
            fieldName="russian"
            dbValue={entry.russian}
            aiValue={enrichedRussian}
            isEnriching={enrichmentLoading && !entry.russian}
            pendingSuggestion={rusSuggestion}
            fieldSource={entry.fieldSources?.russian}
            valueClassName="font-serif text-lg"
            isEditing={editingField === 'russian'}
            onStartEdit={() => onStartEdit('russian')}
            onCloseEdit={onCloseEdit}
          />
        </div>
      )}
    </div>
  );
};

export default DetailsSection;
