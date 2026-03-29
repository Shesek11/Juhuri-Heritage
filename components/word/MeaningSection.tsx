import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
  const t = useTranslations('word');
  const locale = useLocale();
  const primaryHebrew = entry.hebrewShort;
  const primaryLatin = entry.dialectScripts?.[0]?.latinScript;
  const defText = entry.hebrewLong || '';
  const displayDefinition = defText || enrichedDefinition;
  const showDefinition = displayDefinition && displayDefinition !== primaryHebrew;

  // Build meaning rows ordered by locale preference
  const hebrewRow = (
    <div key="hebrew" className="flex items-start gap-2">
      <span className="text-sm text-slate-300 mt-1.5 shrink-0 min-w-[100px]">{t('hebrewMeaning')}</span>
      <div className="flex-1">
        <EditableField
          entryId={entry.id}
          fieldName="hebrewShort"
          dbValue={primaryHebrew}
          isEnriching={enrichmentLoading && !primaryHebrew}
          pendingSuggestion={pendingSuggestions.find(s => s.fieldName === 'hebrewShort')}
          fieldSource={entry.fieldSources?.hebrewShort}
          latinHint={primaryLatin}
          valueClassName="text-2xl font-bold text-slate-100 font-rubik"
          isEditing={editingField === 'hebrewShort'}
          onStartEdit={() => onStartEdit('hebrewShort')}
          onCloseEdit={onCloseEdit}
        />
      </div>
    </div>
  );

  const russianRow = (
    <div key="russian" className="flex items-start gap-2">
      <span className="text-sm text-slate-300 mt-0.5 shrink-0 min-w-[100px]">{t('russianMeaning')}</span>
      <div className="flex-1">
        <EditableField
          entryId={entry.id}
          fieldName="russianShort"
          dbValue={entry.russianShort}
          aiValue={enrichedRussian}
          isEnriching={enrichmentLoading && !entry.russianShort}
          pendingSuggestion={pendingSuggestions.find(s => s.fieldName === 'russianShort')}
          fieldSource={entry.fieldSources?.russianShort}
          valueClassName="text-lg text-slate-300 font-serif"
          isEditing={editingField === 'russianShort'}
          onStartEdit={() => onStartEdit('russianShort')}
          onCloseEdit={onCloseEdit}
        />
      </div>
    </div>
  );

  const englishRow = entry.englishShort ? (
    <div key="english" className="flex items-start gap-2">
      <span className="text-sm text-slate-300 mt-0.5 shrink-0 min-w-[100px]">{t('englishMeaning')}</span>
      <div className="flex-1">
        <EditableField
          entryId={entry.id}
          fieldName="englishShort"
          dbValue={entry.englishShort}
          valueClassName="text-lg text-slate-300"
          isEditing={editingField === 'englishShort'}
          onStartEdit={() => onStartEdit('englishShort')}
          onCloseEdit={onCloseEdit}
        />
      </div>
    </div>
  ) : null;

  // Order: locale's language first, then English, then the other
  const rows = locale === 'ru'
    ? [russianRow, englishRow, hebrewRow]
    : locale === 'en'
    ? [englishRow || hebrewRow, hebrewRow, russianRow].filter((r, i, arr) => arr.indexOf(r) === i)
    : [hebrewRow, englishRow, russianRow]; // he default

  return (
    <div className="space-y-3">
      {rows.filter(Boolean)}

      {/* Expanded definition */}
      {(showDefinition || (!defText && enrichmentLoading)) && (
        <div className="flex items-start gap-2">
          <span className="text-sm text-slate-300 mt-0.5 shrink-0 min-w-[100px]">{t('hebrewTranslation')}</span>
          <div className="flex-1">
            <EditableField
              entryId={entry.id}
              fieldName="hebrewLong"
              dbValue={defText && defText !== primaryHebrew ? defText : undefined}
              aiValue={!defText ? enrichedDefinition : undefined}
              isEnriching={enrichmentLoading && !defText}
              pendingSuggestion={pendingSuggestions.find(s => s.fieldName === 'hebrewLong')}
              fieldSource={entry.fieldSources?.hebrewLong}
              valueClassName="text-sm text-slate-300 leading-relaxed"
              isEditing={editingField === 'hebrewLong'}
              onStartEdit={() => onStartEdit('hebrewLong')}
              onCloseEdit={onCloseEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MeaningSection;
