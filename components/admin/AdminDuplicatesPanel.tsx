import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Search, GitMerge, Eye, X, ChevronLeft, ChevronRight, AlertTriangle, Check, Trash2 } from 'lucide-react';
import apiService from '../../services/apiService';

interface DuplicateEntry {
  id: string;
  term: string;
  termNormalized?: string;
  partOfSpeech?: string;
  sourceName?: string;
  source?: string;
  createdAt: string;
  translations: { hebrew?: string; latin?: string; cyrillic?: string; dialect?: string }[];
}

interface DuplicateGroup {
  matchType: string;
  matchKey: string;
  entries: DuplicateEntry[];
}

interface CompareEntry {
  id: string;
  term: string;
  termNormalized?: string;
  detectedLanguage?: string;
  pronunciationGuide?: string;
  partOfSpeech?: string;
  russian?: string;
  english?: string;
  source?: string;
  sourceName?: string;
  contributorName?: string;
  createdAt: string;
  translations: { id: number; dialect: string; dialectId?: number; hebrew?: string; latin?: string; cyrillic?: string; upvotes: number; downvotes: number }[];
  definitions: string[];
  examples: { origin: string; translated: string; transliteration?: string }[];
  likesCount: number;
  commentsCount: number;
  totalViews: number;
}

interface MergeSuggestion {
  id: number;
  entry_id_a: number;
  entry_id_b: number;
  term_a: string;
  term_b: string;
  hebrew_a?: string;
  hebrew_b?: string;
  latin_a?: string;
  latin_b?: string;
  reason?: string;
  user_name?: string;
  created_at: string;
}

type ViewMode = 'groups' | 'compare' | 'suggestions';

const AdminDuplicatesPanel: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  // Compare view
  const [compareEntries, setCompareEntries] = useState<CompareEntry[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Entry selection within groups (for picking 2 to merge)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Suggestions
  const [suggestions, setSuggestions] = useState<MergeSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const limit = 20;

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiService.get<{ groups: DuplicateGroup[]; total: number }>(
        `/dictionary/duplicates?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`
      );
      setGroups(res.groups);
      setTotal(res.total);
    } catch {
      setError('שגיאה בטעינת כפילויות');
    }
    setLoading(false);
  }, [page, search]);

  const fetchSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const res = await apiService.get<{ suggestions: MergeSuggestion[] }>('/dictionary/duplicates/suggestions');
      setSuggestions(res.suggestions);
    } catch { /* ignore */ }
    setSuggestionsLoading(false);
  }, []);

  useEffect(() => {
    if (viewMode === 'groups') fetchGroups();
    else if (viewMode === 'suggestions') fetchSuggestions();
  }, [viewMode, fetchGroups, fetchSuggestions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  // Which entry to keep (in compare view)
  const [keepEntryId, setKeepEntryId] = useState<string>('');

  const openCompare = async (ids: string[]) => {
    setCompareLoading(true);
    setViewMode('compare');
    setSelectedFields({});
    setKeepEntryId('');
    try {
      const res = await apiService.get<{ entries: CompareEntry[] }>(
        `/dictionary/duplicates/compare?ids=${ids.join(',')}`
      );
      setCompareEntries(res.entries);
      // Default: keep the first entry
      if (res.entries.length >= 2) {
        setKeepEntryId(res.entries[0].id);
        const a = res.entries[0];
        const defaults: Record<string, string> = {};
        for (const field of ['term', 'pronunciation_guide', 'part_of_speech', 'russian', 'english']) {
          const key = field === 'pronunciation_guide' ? 'pronunciationGuide' : field === 'part_of_speech' ? 'partOfSpeech' : field;
          defaults[field] = (a as any)[key] || '';
        }
        setSelectedFields(defaults);
      }
    } catch {
      setError('שגיאה בטעינת נתוני השוואה');
    }
    setCompareLoading(false);
  };

  const selectField = (field: string, value: string) => {
    setSelectedFields(prev => ({ ...prev, [field]: value }));
  };

  const executeMerge = async () => {
    if (compareEntries.length < 2 || !keepEntryId) return;
    setMerging(true);
    try {
      const keepId = parseInt(keepEntryId);
      const deleteIds = compareEntries.filter(e => e.id !== keepEntryId).map(e => parseInt(e.id));
      // Merge sequentially — each delete into the keep
      for (const deleteId of deleteIds) {
        await apiService.post('/dictionary/duplicates/merge', {
          keepId,
          deleteId,
          fieldOverrides: selectedFields,
        });
      }
      setShowConfirm(false);
      setSelectedIds([]);
      setViewMode('groups');
      fetchGroups();
    } catch {
      setError('שגיאה במיזוג ערכים');
    }
    setMerging(false);
  };

  const dismissSuggestion = async (id: number) => {
    try {
      await apiService.put(`/dictionary/duplicates/suggestions/${id}/dismiss`, {});
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch { /* ignore */ }
  };

  const totalPages = Math.ceil(total / limit);

  // ──── Groups View ────
  const renderGroups = () => (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="חפש ערכים כפולים..."
            className="w-full pr-10 pl-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-amber-500/50 focus:outline-none"
            dir="rtl"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          חפש
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          {search ? 'לא נמצאו כפילויות עבור החיפוש' : 'לא נמצאו כפילויות במילון'}
        </div>
      ) : (
        <>
          <div className="text-sm text-slate-400 mb-3">{total} קבוצות כפולות</div>
          <div className="space-y-3">
            {groups.map((group, gi) => {
              const groupIds = group.entries.map(e => e.id);
              const selectedInGroup = selectedIds.filter(id => groupIds.includes(id));
              const isExpanded = expandedGroups.has(gi);
              const toggleExpand = () => setExpandedGroups(prev => {
                const next = new Set(prev);
                if (next.has(gi)) next.delete(gi); else next.add(gi);
                return next;
              });

              const matchLabels: Record<string, { label: string; color: string }> = {
                term: { label: 'מונח זהה', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
                latin: { label: 'לטינית זהה', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
                hebrew: { label: 'עברית זהה', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
                russian: { label: 'רוסית זהה', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
                cyrillic: { label: 'קירילית זהה', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
              };
              const ml = matchLabels[group.matchType] || matchLabels.term;

              return (
                <div key={gi} className="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden" dir="rtl">
                  {/* Collapsible header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/80 transition-colors"
                    onClick={toggleExpand}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${ml.color}`}>
                        {ml.label}
                      </span>
                      <span className="text-white font-medium">{group.matchKey}</span>
                      <span className="text-slate-500 text-xs">({group.entries.length} ערכים)</span>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {selectedInGroup.length >= 2 && (
                        <button
                          onClick={() => openCompare(selectedInGroup)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs hover:bg-amber-700 transition-colors"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          השווה ומזג ({selectedInGroup.length})
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedIds(prev => [...prev.filter(id => !groupIds.includes(id)), ...groupIds])}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                      >
                        בחר הכל
                      </button>
                      {selectedInGroup.length > 0 && (
                        <button
                          onClick={() => setSelectedIds(prev => prev.filter(id => !groupIds.includes(id)))}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                        >
                          נקה
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Collapsible body */}
                  {isExpanded && (
                  <div className="grid gap-2 px-4 pb-4">
                    {group.entries.map(entry => {
                      const t = entry.translations?.[0];
                      const isSelected = selectedIds.includes(entry.id);

                      return (
                        <div
                          key={entry.id}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedIds(prev => prev.filter(id => id !== entry.id));
                            } else {
                              setSelectedIds(prev => [...prev, entry.id]);
                            }
                          }}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-500/20 border border-indigo-500/30'
                              : 'bg-slate-900/50 border border-transparent hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                              isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'border-slate-600'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                            <span className="text-white font-medium">{entry.term || <span className="text-slate-600 italic">ללא מונח</span>}</span>
                            {t?.hebrew && <span className="text-slate-400">{t.hebrew}</span>}
                            {t?.latin && <span className="text-slate-500 text-xs">{t.latin}</span>}
                            {(entry as any).russian && <span className="text-slate-500 text-xs">({(entry as any).russian})</span>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {entry.sourceName && <span>{entry.sourceName}</span>}
                            {entry.partOfSpeech && <span className="text-slate-600">({entry.partOfSpeech})</span>}
                            <span>#{entry.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button title="הקודם" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm text-slate-400">{page} / {totalPages}</span>
              <button title="הבא" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 disabled:opacity-30 hover:bg-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ──── Compare View ────
  const renderCompare = () => {
    if (compareLoading) {
      return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>;
    }
    if (compareEntries.length < 2) {
      return <div className="text-center py-12 text-slate-400">בחר קבוצת כפילויות להשוואה</div>;
    }

    const keepEntry = compareEntries.find(e => e.id === keepEntryId);
    const deleteEntries = compareEntries.filter(e => e.id !== keepEntryId);

    const fields: { key: string; apiKey: string; label: string }[] = [
      { key: 'term', apiKey: 'term', label: 'מונח' },
      { key: 'pronunciationGuide', apiKey: 'pronunciation_guide', label: 'מדריך הגייה' },
      { key: 'partOfSpeech', apiKey: 'part_of_speech', label: 'חלק דיבר' },
      { key: 'russian', apiKey: 'russian', label: 'רוסית' },
      { key: 'english', apiKey: 'english', label: 'אנגלית' },
    ];

    // Collect all unique values per field across all entries
    const fieldValues = (apiKey: string, key: string) => {
      const vals = compareEntries.map(e => (e as any)[key] || '').filter(Boolean);
      return [...new Set(vals)];
    };

    return (
      <div dir="rtl">
        <button onClick={() => { setViewMode('groups'); setSelectedIds([]); }} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white mb-4 transition-colors">
          <ChevronRight className="w-4 h-4" />
          חזרה לרשימה
        </button>

        {/* Step 1: Pick which entry to keep */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">בחר ערך לשמירה (השאר יימחקו וימוזגו אליו):</h4>
          <div className="grid gap-2">
            {compareEntries.map(e => {
              const isKeep = e.id === keepEntryId;
              const t = e.translations[0];
              return (
                <div
                  key={e.id}
                  onClick={() => setKeepEntryId(e.id)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all border ${
                    isKeep
                      ? 'bg-emerald-900/20 border-emerald-500/30'
                      : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isKeep ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}>
                      {isKeep && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-white font-medium">{e.term}</span>
                    {t?.hebrew && <span className="text-slate-400">{t.hebrew}</span>}
                    {t?.latin && <span className="text-slate-500 text-xs">{t.latin}</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {e.sourceName && <span>{e.sourceName}</span>}
                    <span>{e.likesCount} לייקים</span>
                    <span>{e.totalViews} צפיות</span>
                    <span>#{e.id}</span>
                    {isKeep && <span className="text-emerald-400 font-medium">נשמר</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Pick field values */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">בחר ערכי שדות (לחץ על הערך הרצוי):</h4>
          <div className="space-y-2">
            {fields.map(({ key, apiKey, label }) => {
              const uniqueVals = fieldValues(apiKey, key);
              if (uniqueVals.length <= 1) {
                // All same or only one has a value — no choice needed
                return (
                  <div key={key} className="flex items-center gap-3 text-sm">
                    <span className="text-slate-400 w-24 shrink-0">{label}</span>
                    <span className="text-slate-300">{uniqueVals[0] || <span className="text-slate-600 italic">ריק</span>}</span>
                  </div>
                );
              }
              const selected = selectedFields[apiKey] ?? uniqueVals[0];
              return (
                <div key={key} className="bg-amber-500/5 rounded-lg p-2 -mx-2">
                  <div className="text-slate-400 text-sm font-medium mb-1">{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueVals.map((val, vi) => (
                      <button
                        key={vi}
                        type="button"
                        onClick={() => selectField(apiKey, val)}
                        className={`text-right px-3 py-1.5 rounded-lg text-sm transition-all ${
                          selected === val
                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-white'
                            : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Translations - all kept */}
        <div className="mb-6">
          <h4 className="text-white font-medium mb-2">תרגומים (כולם נשמרים — {compareEntries.reduce((sum, e) => sum + e.translations.length, 0)} סה״כ)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
            {compareEntries.map(e =>
              e.translations.map((t, i) => (
                <div key={`${e.id}-${i}`} className="bg-slate-800/60 rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-slate-500">#{e.id}</span>
                    <span className={`text-xs ${e.id === keepEntryId ? 'text-emerald-400' : 'text-blue-400'}`}>{t.dialect || 'כללי'}</span>
                  </div>
                  <div className="text-white">{[t.hebrew, t.latin, t.cyrillic].filter(Boolean).join(' / ') || '-'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Merge button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!keepEntryId}
            className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <GitMerge className="w-5 h-5" />
            מזג {deleteEntries.length} ערכים ל-1
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && keepEntry && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowConfirm(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full" dir="rtl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                <h3 className="text-lg font-bold text-white">אישור מיזוג</h3>
              </div>
              <p className="text-slate-300 text-sm mb-2">
                <strong className="text-red-400">{deleteEntries.length} ערכים</strong> יימחקו וימוזגו לערך <strong className="text-emerald-400">"{keepEntry.term}"</strong> (#{keepEntry.id}).
              </p>
              <p className="text-slate-400 text-xs mb-4">כל התרגומים, ההגדרות, הדוגמאות, הלייקים והתגובות שלהם יישמרו.</p>
              <div className="flex gap-3">
                <button
                  onClick={executeMerge}
                  disabled={merging}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {merging ? 'ממזג...' : 'אישור מיזוג'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ──── Suggestions View ────
  const renderSuggestions = () => (
    <div dir="rtl">
      {suggestionsLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12 text-slate-400">אין הצעות מיזוג ממתינות</div>
      ) : (
        <div className="space-y-3">
          {suggestions.map(s => (
            <div key={s.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <GitMerge className="w-4 h-4 text-amber-400" />
                  <span className="text-white font-medium">{s.term_a}</span>
                  <span className="text-slate-500">↔</span>
                  <span className="text-white font-medium">{s.term_b}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openCompare([String(s.entry_id_a), String(s.entry_id_b)])}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    השווה
                  </button>
                  <button
                    onClick={() => dismissSuggestion(s.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs hover:bg-slate-600 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    דחה
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                {s.hebrew_a && <span>{s.hebrew_a}</span>}
                {s.latin_a && <span>{s.latin_a}</span>}
                <span>·</span>
                {s.hebrew_b && <span>{s.hebrew_b}</span>}
                {s.latin_b && <span>{s.latin_b}</span>}
              </div>
              {s.reason && <p className="text-slate-400 text-sm mt-2">{s.reason}</p>}
              <div className="text-xs text-slate-600 mt-1">
                {s.user_name && <span>הוצע ע״י {s.user_name}</span>}
                {' · '}
                {new Date(s.created_at).toLocaleDateString('he-IL')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm" dir="rtl">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button title="סגור" onClick={() => setError('')} className="mr-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-800/40 rounded-lg p-1" dir="rtl">
        <button
          onClick={() => setViewMode('groups')}
          className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
            viewMode === 'groups' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          קבוצות כפולות ({total})
        </button>
        <button
          onClick={() => setViewMode('suggestions')}
          className={`flex-1 py-2 px-3 rounded-md text-sm transition-colors ${
            viewMode === 'suggestions' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          הצעות מיזוג ({suggestions.length})
        </button>
      </div>

      {viewMode === 'groups' && renderGroups()}
      {viewMode === 'compare' && renderCompare()}
      {viewMode === 'suggestions' && renderSuggestions()}
    </div>
  );
};

export default AdminDuplicatesPanel;
