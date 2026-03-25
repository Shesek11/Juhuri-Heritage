import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Pencil, Plus, Edit3, Volume2 } from 'lucide-react';
import { Translation, DictionaryEntry, PendingSuggestion } from '../../types';
import FieldSourceBadge from '../dictionary/FieldSourceBadge';
import ConfirmAiButton from '../dictionary/ConfirmAiButton';
import FieldEditForm from '../dictionary/FieldEditForm';
import MissingFieldPlaceholder from '../dictionary/MissingFieldPlaceholder';
import AIValueBadge from '../dictionary/AIValueBadge';
interface EnrichmentData {
  hebrew?: string;
  latin?: string;
  cyrillic?: string;
}

interface DialectComparisonProps {
  translations: Translation[];
  entry: DictionaryEntry;
  enrichmentData?: EnrichmentData | null;
  enrichmentLoading?: boolean;
  pendingSuggestions?: PendingSuggestion[];
  onVote: (translationId: number, voteType: 'up' | 'down') => void;
  onSuggestCorrection?: (translation: Translation, entryId: string, term: string) => void;
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
  const [editingField, setEditingField] = useState<string | null>(null);

  const latinSuggestion = pendingSuggestions.find(s => s.fieldName === 'latin');
  const cyrillicSuggestion = pendingSuggestions.find(s => s.fieldName === 'cyrillic');
  const hebrewSuggestion = pendingSuggestions.find(s => s.fieldName === 'hebrew');

  // Primary translation (first one) for the large Hebrew/Russian display
  const primary = translations[0];
  const displayHebrew = primary?.hebrew;
  const displayRussian = entry.russian;

  // Group translations by dialect
  const dialects = translations.map((t, idx) => {
    const displayLatin = t.latin || enrichmentData?.latin;
    const displayCyrillic = t.cyrillic || enrichmentData?.cyrillic;
    const isLatinFromAI = !t.latin && !!enrichmentData?.latin;
    const isCyrillicFromAI = !t.cyrillic && !!enrichmentData?.cyrillic;
    return { ...t, idx, displayLatin, displayCyrillic, isLatinFromAI, isCyrillicFromAI };
  });

  return (
    <div>
      {/* Dialects table */}
      {dialects.length > 0 && (
        <div>
          <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-400 font-bold mb-3">
            ניבים
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[340px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-right py-2 px-3 text-xs text-slate-400 font-bold uppercase tracking-wider">ניב</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-400 font-bold uppercase tracking-wider">תעתיק לטיני</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-400 font-bold uppercase tracking-wider">תעתיק קירילי</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-400 font-bold uppercase tracking-wider">הצבעות</th>
                  <th className="py-2 px-2"><span className="sr-only">פעולות</span></th>
                </tr>
              </thead>
              <tbody>
                {dialects.map((d) => {
                  const voteData = d.id ? translationVotes[d.id] : null;
                  return (
                    <tr key={d.id || d.idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                      {/* Dialect name */}
                      <td className="py-3 px-3">
                        <span className="text-indigo-400 font-bold text-xs bg-indigo-900/30 px-1.5 py-0.5 rounded">
                          {d.dialect && d.dialect !== 'לא ידוע' && d.dialect !== 'General' ? d.dialect : '-'}
                        </span>
                      </td>

                      {/* Latin */}
                      <td className="py-3 px-3">
                        {d.displayLatin ? (
                          d.isLatinFromAI ? (
                            <AIValueBadge
                              value={d.displayLatin}
                              entryId={entry.id}
                              fieldName="latin"
                              valueClassName="font-mono text-slate-300"
                              inline
                            />
                          ) : (
                            <div className="flex items-center gap-1 font-mono text-slate-300">
                              <FieldSourceBadge source={entry.fieldSources?.latin} />
                              <span>{d.displayLatin}</span>
                              <ConfirmAiButton entryId={entry.id} fieldName="latin" value={d.displayLatin} source={entry.fieldSources?.latin} />
                              {entry.id && (
                                <button
                                  type="button"
                                  onClick={() => setEditingField(`latin-${d.idx}`)}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
                                  title="ערוך לטיני"
                                >
                                  <Pencil size={10} />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <MissingFieldPlaceholder
                            fieldName="latin"
                            entryId={entry.id}
                            pendingSuggestion={latinSuggestion}
                            isEnriching={enrichmentLoading && !d.latin}
                            compact
                          />
                        )}
                        {editingField === `latin-${d.idx}` && entry.id && (
                          <FieldEditForm entryId={entry.id} fieldName="latin" currentValue={d.latin || ''} onClose={() => setEditingField(null)} onSuccess={() => setEditingField(null)} />
                        )}
                      </td>

                      {/* Cyrillic */}
                      <td className="py-3 px-3">
                        {d.displayCyrillic ? (
                          d.isCyrillicFromAI ? (
                            <AIValueBadge
                              value={d.displayCyrillic}
                              entryId={entry.id}
                              fieldName="cyrillic"
                              valueClassName="font-serif text-slate-400"
                              inline
                            />
                          ) : (
                            <div className="flex items-center gap-1 font-serif text-slate-400">
                              <FieldSourceBadge source={entry.fieldSources?.cyrillic} />
                              <span>{d.displayCyrillic}</span>
                              <ConfirmAiButton entryId={entry.id} fieldName="cyrillic" value={d.displayCyrillic} source={entry.fieldSources?.cyrillic} />
                              {entry.id && (
                                <button
                                  type="button"
                                  onClick={() => setEditingField(`cyrillic-${d.idx}`)}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
                                  title="ערוך קירילי"
                                >
                                  <Pencil size={10} />
                                </button>
                              )}
                            </div>
                          )
                        ) : (
                          <MissingFieldPlaceholder
                            fieldName="cyrillic"
                            entryId={entry.id}
                            pendingSuggestion={cyrillicSuggestion}
                            isEnriching={enrichmentLoading && !d.cyrillic}
                            compact
                          />
                        )}
                        {editingField === `cyrillic-${d.idx}` && entry.id && (
                          <FieldEditForm entryId={entry.id} fieldName="cyrillic" currentValue={d.cyrillic || ''} onClose={() => setEditingField(null)} onSuccess={() => setEditingField(null)} />
                        )}
                      </td>

                      {/* Votes */}
                      <td className="py-3 px-3">
                        {d.id && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onVote(d.id!, 'up')}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                                voteData?.userVote === 'up'
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'text-slate-400 hover:bg-white/10'
                              }`}
                              title="הצבע לטובה"
                            >
                              <ThumbsUp size={12} />
                              <span className="font-bold">{voteData?.upvotes || 0}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onVote(d.id!, 'down')}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                                voteData?.userVote === 'down'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'text-slate-400 hover:bg-white/10'
                              }`}
                              title="הצבע נגד"
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
                            onClick={() => onPlay(d.cyrillic || d.latin || d.hebrew, `dialect-${d.idx}`)}
                            className={`p-1.5 rounded-full text-slate-400 hover:text-indigo-400 transition-colors ${isPlaying === `dialect-${d.idx}` ? 'text-indigo-400 animate-pulse' : ''}`}
                            title="השמע"
                          >
                            <Volume2 size={14} />
                          </button>
                          {entry.id && (
                            <button
                              type="button"
                              onClick={() => onSuggestCorrection?.(d, entry.id!, entry.term)}
                              className="p-1.5 rounded-full text-slate-400 hover:text-amber-400 transition-colors"
                              title="הצע תיקון"
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
              הוסף ניב
            </button>
            {entry.id && (
              <button
                type="button"
                onClick={() => onSuggestCorrection?.(primary, entry.id!, entry.term)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs text-amber-400 border border-dashed border-amber-500/30 rounded-lg hover:border-amber-400 hover:bg-amber-500/10 transition-all"
              >
                <Edit3 size={14} />
                הצע תיקון
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DialectComparison;
