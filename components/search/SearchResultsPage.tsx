'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Loader2, Mic, Plus, GitMerge, X, Check } from 'lucide-react';
import { DictionaryEntry, FuzzySuggestion } from '../../types';
import { searchDictionary } from '../../services/geminiService';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import SearchResultCard from './SearchResultCard';
import FuzzyMatchBanner from './FuzzyMatchBanner';
import ScriptDetectionBanner from './ScriptDetectionBanner';
import EmptyResultsCTA from './EmptyResultsCTA';
import ReportModal from './ReportModal';
import NewTranslationModal from './NewTranslationModal';

interface SearchResultsPageProps {
  onOpenAuthModal: (reason?: string) => void;
  onOpenContribute: () => void;
}

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({
  onOpenAuthModal,
  onOpenContribute,
}) => {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [fuzzySuggestions, setFuzzySuggestions] = useState<FuzzySuggestion[]>([]);

  // Modal state
  const [reportEntry, setReportEntry] = useState<DictionaryEntry | null>(null);
  const [showNewTranslation, setShowNewTranslation] = useState(false);
  const [mergeSourceEntry, setMergeSourceEntry] = useState<DictionaryEntry | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) return;
    setLoading(true);
    setError('');
    setSearched(true);
    setFuzzySuggestions([]);
    setSearchTerm(term.trim());

    // Update URL
    const params = new URLSearchParams();
    params.set('q', term.trim());
    router.replace(`/dictionary?${params.toString()}`, { scroll: false });

    try {
      const result = await searchDictionary(term.trim());
      const allResults = [result.entry, ...result.additionalResults];
      setResults(allResults);
    } catch (err: any) {
      if (err?.message === 'NOT_FOUND') {
        setResults([]);
        // Fetch fuzzy suggestions
        try {
          const fuzzy = await apiService.get<{ suggestions: FuzzySuggestion[] }>(
            `/dictionary/similar?q=${encodeURIComponent(term.trim())}&limit=5`
          );
          setFuzzySuggestions(fuzzy.suggestions);
        } catch { /* ignore */ }
      } else {
        setError('שגיאה בחיפוש. נסה שוב.');
      }
    }
    setLoading(false);
  }, [router]);

  // Auto-search on mount if query param exists
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  const handleFuzzySelect = (term: string) => {
    setQuery(term);
    performSearch(term);
  };

  const handleReport = async (data: { reportType: string; betterTranslation?: string; explanation?: string }) => {
    if (!reportEntry) return;
    try {
      await apiService.post(`/dictionary/entries/${reportEntry.id}/suggest-field`, {
        fieldName: 'hebrew',
        value: data.betterTranslation || '',
        reason: `[דיווח: ${data.reportType}] ${data.explanation || ''}`,
        reportType: 'report',
        searchContext: searchTerm,
      });
    } catch { /* ignore */ }
    setReportEntry(null);
  };

  const handleNewTranslation = async (data: { term: string; latin?: string; cyrillic?: string; dialect?: string }) => {
    try {
      await apiService.post('/dictionary/entries', {
        term: data.term,
        hebrew: searchTerm,
        latin: data.latin,
        cyrillic: data.cyrillic,
        dialect: data.dialect || '',
      });
    } catch { /* ignore */ }
    setShowNewTranslation(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Search Bar */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="חפש מילה בעברית, ג'והורי, רוסית..."
            className="w-full px-5 py-4 pr-14 text-lg rounded-2xl bg-[#0d1424]/60 backdrop-blur-xl border border-white/10 text-white placeholder-slate-500 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:border-amber-500/50 outline-none transition-all font-rubik"
            dir="auto"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
          </button>
        </div>
      </form>

      {/* Script Detection Banner */}
      {searched && searchTerm && <ScriptDetectionBanner query={searchTerm} onSwitchScript={() => {}} />}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 size={32} className="animate-spin text-amber-500 mx-auto" />
          <p className="text-slate-400 mt-3 text-sm">מחפש "{searchTerm}"...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && !error && searched && results.length > 0 && (
        <div className="space-y-3">
          {/* Results header */}
          <div className="flex items-center justify-between text-sm text-slate-400 px-1">
            <span>{results.length} תוצאות עבור "{searchTerm}"</span>
          </div>

          {/* Fuzzy suggestions (if results exist but no exact match) */}
          {fuzzySuggestions.length > 0 && (
            <FuzzyMatchBanner suggestions={fuzzySuggestions} onSelect={handleFuzzySelect} />
          )}

          {/* Result cards */}
          {results.map((entry, idx) => (
            <SearchResultCard
              key={entry.id || idx}
              entry={entry}
              isBestMatch={idx === 0}
              searchQuery={searchTerm}
              onReport={() => setReportEntry(entry)}
              onNavigate={() => router.push(`/word/${encodeURIComponent(entry.term)}`)}
              onSuggestMerge={entry.hasDuplicates ? (e) => setMergeSourceEntry(e) : undefined}
            />
          ))}

          {/* Bottom actions */}
          <div className="bg-[#0d1424]/40 backdrop-blur-xl rounded-xl border border-dashed border-white/10 p-4">
            <p className="text-sm text-slate-400 mb-3 text-center">לא מצאת מה שחיפשת?</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => setShowNewTranslation(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-colors text-sm font-medium border border-indigo-500/20"
              >
                <Plus size={14} />
                הצע תרגום חדש ל"{searchTerm}"
              </button>
              <button
                onClick={onOpenContribute}
                className="flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:bg-white/5 rounded-lg transition-colors text-sm"
              >
                הוסף מילה חדשה למילון
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && searched && results.length === 0 && (
        <EmptyResultsCTA
          query={searchTerm}
          suggestions={fuzzySuggestions}
          onAddWord={onOpenContribute}
          onRequestTranslation={() => setShowNewTranslation(true)}
          onSelectSuggestion={handleFuzzySelect}
        />
      )}

      {/* Not searched yet */}
      {!searched && !loading && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📖</div>
          <h2 className="text-xl font-bold text-white mb-2">מילון ג'והורי-עברי</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            חפש מילים בעברית, ג'והורי, רוסית או בתעתיק לטיני. המילון שלנו מכיל אלפי ערכים עם תרגומים, הגייה ודוגמאות.
          </p>
        </div>
      )}

      {/* Report Modal */}
      {reportEntry && (
        <ReportModal
          searchQuery={searchTerm}
          entry={reportEntry}
          onClose={() => setReportEntry(null)}
          onSubmit={handleReport}
        />
      )}

      {/* New Translation Modal */}
      {showNewTranslation && (
        <NewTranslationModal
          searchQuery={searchTerm}
          onClose={() => setShowNewTranslation(false)}
          onSubmit={handleNewTranslation}
        />
      )}

      {/* Suggest Merge Modal */}
      {mergeSourceEntry && (
        <SuggestMergeModal
          sourceEntry={mergeSourceEntry}
          candidates={results.filter(r => r.id !== mergeSourceEntry.id)}
          onClose={() => setMergeSourceEntry(null)}
          onSubmit={async (targetIds, reason) => {
            if (!isAuthenticated) {
              onOpenAuthModal('כדי להציע מיזוג ערכים, צריך להתחבר');
              return;
            }
            try {
              const sourceId = parseInt(mergeSourceEntry.id || '0');
              for (const targetId of targetIds) {
                await apiService.post('/dictionary/duplicates/suggest', {
                  entryIdA: sourceId,
                  entryIdB: parseInt(targetId),
                  reason: reason || undefined,
                });
              }
              setMergeSourceEntry(null);
            } catch { /* ignore */ }
          }}
        />
      )}
    </div>
  );
};

// ──── Inline SuggestMergeModal ────
interface SuggestMergeModalProps {
  sourceEntry: DictionaryEntry;
  candidates: DictionaryEntry[];
  onClose: () => void;
  onSubmit: (targetIds: string[], reason?: string) => Promise<void>;
}

const SuggestMergeModal: React.FC<SuggestMergeModalProps> = ({ sourceEntry, candidates, onClose, onSubmit }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    setSubmitting(true);
    await onSubmit([...selectedIds], reason);
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full text-center" dir="rtl" onClick={e => e.stopPropagation()}>
          <Check className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-white font-medium mb-1">ההצעה נשלחה</p>
          <p className="text-slate-400 text-sm mb-4">מנהל יבדוק את ההצעה. תודה!</p>
          <button onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600 transition-colors">סגור</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">הצעת מיזוג</h3>
          </div>
          <button onClick={onClose} title="סגור" className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-slate-300 text-sm mb-3">
          בחר ערכים כפולים של <strong className="text-white">"{sourceEntry.term}"</strong>:
        </p>

        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {candidates.map(c => {
            const t = c.translations?.[0];
            const isSelected = selectedIds.has(c.id || '');
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleId(c.id || '')}
                className={`w-full text-right px-3 py-2.5 rounded-lg border transition-all text-sm flex items-center gap-2 ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/30 text-white'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 text-xs ${
                  isSelected ? 'bg-amber-500 border-amber-400 text-white' : 'border-slate-600'
                }`}>{isSelected && '✓'}</div>
                <span className="font-medium">{c.term}</span>
                {t?.hebrew && <span className="text-slate-400 mr-1">{t.hebrew}</span>}
                {t?.latin && <span className="text-slate-500 text-xs mr-1">{t.latin}</span>}
              </button>
            );
          })}
          {candidates.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-4">אין ערכים נוספים בתוצאות החיפוש</p>
          )}
        </div>

        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="סיבה (לא חובה)"
          rows={2}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-amber-500/50 focus:outline-none resize-none mb-4"
          dir="rtl"
        />

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={selectedIds.size === 0 || submitting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors text-sm"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitMerge className="w-4 h-4" />}
            {`שלח הצעה${selectedIds.size > 1 ? ` (${selectedIds.size})` : ''}`}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm">
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchResultsPage;
