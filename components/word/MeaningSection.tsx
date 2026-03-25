import React from 'react';
import { DictionaryEntry, PendingSuggestion } from '../../types';
import EditableField from '../dictionary/EditableField';

interface MeaningSectionProps {
  entry: DictionaryEntry;
  editingField: string | null;
  onStartEdit: (fieldName: string) => void;
  onCloseEdit: () => void;
  pendingSuggestions?: PendingSuggestion[];
  enrichmentLoading?: boolean;
  enrichedDefinition?: string;
  enrichedRussian?: string;
}

const MeaningSection: React.FC<MeaningSectionProps> = ({
  entry,
  editingField,
  onStartEdit,
  onCloseEdit,
  pendingSuggestions = [],
  enrichmentLoading = false,
  enrichedDefinition,
  enrichedRussian,
}) => {
  const primaryHebrew = entry.translations?.[0]?.hebrew;
  const primaryLatin = entry.translations?.[0]?.latin;
  const defText = entry.definitions.length > 0 ? entry.definitions.join('; ') : '';
  const displayDefinition = defText || enrichedDefinition;
  const showDefinition = displayDefinition && displayDefinition !== primaryHebrew;

  return (
    <div className="space-y-3">
      {/* Hebrew translation */}
      <div className="flex items-start gap-2">
        <span className="text-sm text-slate-300 mt-1.5 shrink-0 min-w-[100px]">עברית:</span>
        <div className="flex-1">
          <EditableField
            entryId={entry.id}
            fieldName="hebrew"
            dbValue={primaryHebrew}
            isEnriching={enrichmentLoading && !primaryHebrew}
            pendingSuggestion={pendingSuggestions.find(s => s.fieldName === 'hebrew')}
            fieldSource={entry.fieldSources?.hebrew}
            latinHint={primaryLatin}
            valueClassName="text-2xl font-bold text-slate-100 font-rubik"
            isEditing={editingField === 'hebrew'}
            onStartEdit={() => onStartEdit('hebrew')}
            onCloseEdit={onCloseEdit}
          />
        </div>
      </div>

      {/* Russian translation */}
      <div className="flex items-start gap-2">
        <span className="text-sm text-slate-300 mt-0.5 shrink-0 min-w-[100px]">רוסית:</span>
        <div className="flex-1">
          <EditableField
            entryId={entry.id}
            fieldName="russian"
            dbValue={entry.russian}
            aiValue={enrichedRussian}
            isEnriching={enrichmentLoading && !entry.russian}
            pendingSuggestion={pendingSuggestions.find(s => s.fieldName === 'russian')}
            fieldSource={entry.fieldSources?.russian}
            valueClassName="text-lg text-slate-300 font-serif"
            isEditing={editingField === 'russian'}
            onStartEdit={() => onStartEdit('russian')}
            onCloseEdit={onCloseEdit}
          />
        </div>
      </div>

      {/* Expanded definition */}
      {(showDefinition || (!defText && enrichmentLoading)) && (
        <div className="flex items-start gap-2">
          <span className="text-sm text-slate-300 mt-0.5 shrink-0 min-w-[100px]">תרגום (עברית):</span>
          <div className="flex-1">
            <EditableField
              entryId={entry.id}
              fieldName="definition"
              dbValue={defText && defText !== primaryHebrew ? defText : undefined}
              aiValue={!defText ? enrichedDefinition : undefined}
              isEnriching={enrichmentLoading && !defText}
              pendingSuggestion={pendingSuggestions.find(s => s.fieldName === 'definition')}
              fieldSource={entry.fieldSources?.definition}
              valueClassName="text-sm text-slate-300 leading-relaxed"
              isEditing={editingField === 'definition'}
              onStartEdit={() => onStartEdit('definition')}
              onCloseEdit={onCloseEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MeaningSection;
