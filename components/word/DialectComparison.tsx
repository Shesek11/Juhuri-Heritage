import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ThumbsUp, ThumbsDown, Plus, Edit3, Volume2 } from 'lucide-react';
import { DialectScript, DictionaryEntry, PendingSuggestion } from '../../types';
import EditableField from '../dictionary/EditableField';

interface EnrichmentData {
  hebrewScript?: string;
  latinScript?: string;
  cyrillicScript?: string;
}

interface DialectComparisonProps {
  translations: DialectScript[];
  entry: DictionaryEntry;
  enrichmentData?: EnrichmentData | null;
  enrichmentLoading?: boolean;
  pendingSuggestions?: PendingSuggestion[];
  onVote: (translationId: number, voteType: 'up' | 'down') => void;
  onSuggestCorrection?: (translation: DialectScript, entryId: string, hebrewScript: string) => void;
  onPlay: (text: string, id: string) => void;
  isPlaying: string | null;
  translationVotes: Record<number, { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }>;
}

const DialectComparison: React.FC<DialectComparisonProps> = ({
  translations,
  entry,
  enrichmentData,
  enrichmentLoading = false,
  pendingSuggestions = [],
  onVote,
  onSuggestCorrection,
  onPlay,
  isPlaying,
  translationVotes,
}) => {
  const t = useTranslations('word');
  const [editingField, setEditingField] = useState<string | null>(null);

  const latinSuggestion = pendingSuggestions.find(s => s.fieldName === 'latinScript');
  const cyrillicSuggestion = pendingSuggestions.find(s => s.fieldName === 'cyrillicScript');

  // Primary translation (first one) for the large Hebrew/Russian display
  const primary = translations[0];

  return (
    <div>
      {/* Dialects table */}
      {translations.length > 0 && (
        <div>
          <h2 className="text-sm uppercase tracking-wider text-slate-300 dark:text-slate-300 font-bold mb-3">
            {t('dialects')}
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[340px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-right py-2 px-3 text-xs text-slate-300 font-bold uppercase tracking-wider">{t('dialectCol')}</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-300 font-bold uppercase tracking-wider">{t('latinCol')}</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-300 font-bold uppercase tracking-wider">{t('cyrillicCol')}</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-300 font-bold uppercase tracking-wider">{t('votesCol')}</th>
                  <th className="py-2 px-2"><span className="sr-only">{t('actionsCol')}</span></th>
                </tr>
              </thead>
              <tbody>
                {translations.map((tr, idx) => {
                  const voteData = tr.id ? translationVotes[tr.id] : null;
                  return (
                    <tr key={tr.id || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                      {/* Dialect name */}
                      <td className="py-3 px-3">
                        <span className="text-indigo-400 font-bold text-xs bg-indigo-900/30 px-1.5 py-0.5 rounded">
                          {tr.dialect && tr.dialect !== 'לא ידוע' && tr.dialect !== 'General' ? tr.dialect : '-'}
                        </span>
                      </td>

                      {/* Latin */}
                      <td className="py-3 px-3">
                        <EditableField
                          entryId={entry.id}
                          fieldName="latinScript"
                          dbValue={tr.latinScript || undefined}
                          aiValue={!tr.latinScript ? enrichmentData?.latinScript : undefined}
                          isEnriching={enrichmentLoading && !tr.latinScript}
                          pendingSuggestion={latinSuggestion}
                          fieldSource={entry.fieldSources?.latinScript}
                          compact
                          valueClassName="font-mono text-slate-300"
                          isEditing={editingField === `latin-${idx}`}
                          onStartEdit={() => setEditingField(`latin-${idx}`)}
                          onCloseEdit={() => setEditingField(null)}
                        />
                      </td>

                      {/* Cyrillic */}
                      <td className="py-3 px-3">
                        <EditableField
                          entryId={entry.id}
                          fieldName="cyrillicScript"
                          dbValue={tr.cyrillicScript || undefined}
                          aiValue={!tr.cyrillicScript ? enrichmentData?.cyrillicScript : undefined}
                          isEnriching={enrichmentLoading && !tr.cyrillicScript}
                          pendingSuggestion={cyrillicSuggestion}
                          fieldSource={entry.fieldSources?.cyrillicScript}
                          compact
                          valueClassName="font-serif text-slate-300"
                          isEditing={editingField === `cyrillic-${idx}`}
                          onStartEdit={() => setEditingField(`cyrillic-${idx}`)}
                          onCloseEdit={() => setEditingField(null)}
                        />
                      </td>

                      {/* Votes */}
                      <td className="py-3 px-3">
                        {tr.id && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onVote(tr.id!, 'up')}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                                voteData?.userVote === 'up'
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'text-slate-300 hover:bg-white/10'
                              }`}
                              title={t('upvote')}
                            >
                              <ThumbsUp size={12} />
                              <span className="font-bold">{voteData?.upvotes || 0}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onVote(tr.id!, 'down')}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                                voteData?.userVote === 'down'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'text-slate-300 hover:bg-white/10'
                              }`}
                              title={t('downvote')}
                            >
                              <ThumbsDown size={12} />
                              <span className="font-bold">{voteData?.downvotes || 0}</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onPlay(tr.cyrillicScript || tr.latinScript || tr.hebrewScript, `dialect-${idx}`)}
                            className={`p-1.5 rounded-full text-slate-300 hover:text-indigo-400 transition-colors ${isPlaying === `dialect-${idx}` ? 'text-indigo-400 animate-pulse' : ''}`}
                            title={t('play')}
                          >
                            <Volume2 size={14} />
                          </button>
                          {entry.id && (
                            <button
                              type="button"
                              onClick={() => onSuggestCorrection?.(tr, entry.id!, entry.hebrewScript)}
                              className="p-1.5 rounded-full text-slate-300 hover:text-amber-400 transition-colors"
                              title={t('suggestFix')}
                            >
                              <Edit3 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add dialect button */}
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-400 border border-dashed border-indigo-500/30 rounded-lg hover:border-indigo-400 hover:bg-indigo-500/10 transition-all"
            >
              <Plus size={14} />
              {t('addDialect')}
            </button>
            {entry.id && (
              <button
                type="button"
                onClick={() => onSuggestCorrection?.(primary, entry.id!, entry.hebrewScript)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-amber-400 border border-dashed border-amber-500/30 rounded-lg hover:border-amber-400 hover:bg-amber-500/10 transition-all"
              >
                <Edit3 size={14} />
                {t('suggestFix')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DialectComparison;
