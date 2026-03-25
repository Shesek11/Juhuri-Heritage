import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Plus, Edit3, Volume2 } from 'lucide-react';
import { Translation, DictionaryEntry, PendingSuggestion } from '../../types';
import EditableField from '../dictionary/EditableField';

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

  // Primary translation (first one) for the large Hebrew/Russian display
  const primary = translations[0];

  return (
    <div>
      {/* Dialects table */}
      {translations.length > 0 && (
        <div>
          <h3 className="text-sm uppercase tracking-wider text-slate-300 dark:text-slate-300 font-bold mb-3">
            ניבים
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[340px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-right py-2 px-3 text-xs text-slate-300 font-bold uppercase tracking-wider">ניב</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-300 font-bold uppercase tracking-wider">תעתיק לטיני</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-300 font-bold uppercase tracking-wider">תעתיק קירילי</th>
                  <th className="text-right py-2 px-3 text-xs text-slate-300 font-bold uppercase tracking-wider">הצבעות</th>
                  <th className="py-2 px-2"><span className="sr-only">פעולות</span></th>
                </tr>
              </thead>
              <tbody>
                {translations.map((t, idx) => {
                  const voteData = t.id ? translationVotes[t.id] : null;
                  return (
                    <tr key={t.id || idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group/row">
                      {/* Dialect name */}
                      <td className="py-3 px-3">
                        <span className="text-indigo-400 font-bold text-xs bg-indigo-900/30 px-1.5 py-0.5 rounded">
                          {t.dialect && t.dialect !== 'לא ידוע' && t.dialect !== 'General' ? t.dialect : '-'}
                        </span>
                      </td>

                      {/* Latin */}
                      <td className="py-3 px-3">
                        <EditableField
                          entryId={entry.id}
                          fieldName="latin"
                          dbValue={t.latin || undefined}
                          aiValue={!t.latin ? enrichmentData?.latin : undefined}
                          isEnriching={enrichmentLoading && !t.latin}
                          pendingSuggestion={latinSuggestion}
                          fieldSource={entry.fieldSources?.latin}
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
                          fieldName="cyrillic"
                          dbValue={t.cyrillic || undefined}
                          aiValue={!t.cyrillic ? enrichmentData?.cyrillic : undefined}
                          isEnriching={enrichmentLoading && !t.cyrillic}
                          pendingSuggestion={cyrillicSuggestion}
                          fieldSource={entry.fieldSources?.cyrillic}
                          compact
                          valueClassName="font-serif text-slate-300"
                          isEditing={editingField === `cyrillic-${idx}`}
                          onStartEdit={() => setEditingField(`cyrillic-${idx}`)}
                          onCloseEdit={() => setEditingField(null)}
                        />
                      </td>

                      {/* Votes */}
                      <td className="py-3 px-3">
                        {t.id && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onVote(t.id!, 'up')}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                                voteData?.userVote === 'up'
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'text-slate-300 hover:bg-white/10'
                              }`}
                              title="הצבע לטובה"
                            >
                              <ThumbsUp size={12} />
                              <span className="font-bold">{voteData?.upvotes || 0}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onVote(t.id!, 'down')}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${
                                voteData?.userVote === 'down'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'text-slate-300 hover:bg-white/10'
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
                            onClick={() => onPlay(t.cyrillic || t.latin || t.hebrew, `dialect-${idx}`)}
                            className={`p-1.5 rounded-full text-slate-300 hover:text-indigo-400 transition-colors ${isPlaying === `dialect-${idx}` ? 'text-indigo-400 animate-pulse' : ''}`}
                            title="השמע"
                          >
                            <Volume2 size={14} />
                          </button>
                          {entry.id && (
                            <button
                              type="button"
                              onClick={() => onSuggestCorrection?.(t, entry.id!, entry.term)}
                              className="p-1.5 rounded-full text-slate-300 hover:text-amber-400 transition-colors"
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
