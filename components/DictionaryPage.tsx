'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { DictionaryEntry, HistoryItem, DialectItem, FuzzySuggestion } from '../types';
import apiService from '../services/apiService';
import { searchDictionary, searchByAudio, SearchResult } from '../services/geminiService';
import { blobToBase64 } from '../utils/audioUtils';
import ResultCard, { EnrichmentData } from './dictionary/ResultCard';
import SearchResultCard from './search/SearchResultCard';
import FuzzyMatchBanner from './search/FuzzyMatchBanner';
import ScriptDetectionBanner from './search/ScriptDetectionBanner';
import EmptyResultsCTA from './search/EmptyResultsCTA';
import ReportModal from './search/ReportModal';
import NewTranslationModal from './search/NewTranslationModal';
import HistoryPanel from './HistoryPanel';
import HeroSection from './HeroSection';
import WordOfTheDay from './widgets/WordOfTheDay';
import RecentAdditions from './widgets/RecentAdditions';
import ContributionGrid from './widgets/ContributionGrid';
import { Mic, Search, Plus, Loader2 } from 'lucide-react';
import { SEOHead, buildDefinedTermJsonLd } from './seo/SEOHead';
import { useTranslations } from 'next-intl';

import { partOfSpeechHebrew as posHebrew } from '../utils/pos';

const STORAGE_KEY = 'juhuri_history';

interface DictionaryPageProps {
  dialects: DialectItem[];
  onOpenContribute: () => void;
  onOpenAuthModal: (reason?: string) => void;
  onOpenTranslationModal: (entry: { id: number; term: string; existingTranslation?: any }) => void;
  onOpenWordListModal: (category: import('./shell/AppContext').ContributionCategory, title: string, totalCount: number, featuredTerm?: string) => void;
}

const DictionaryPage: React.FC<DictionaryPageProps> = ({
  dialects,
  onOpenContribute,
  onOpenAuthModal,
  onOpenTranslationModal,
  onOpenWordListModal,
}) => {
  const t = useTranslations('dictionary');
  const tc = useTranslations('common');
  const { isAuthenticated } = useAuth();
  const params = useParams();
  const searchParams = useSearchParams();
  const term = params?.term as string | undefined;
  const qParam = searchParams?.get('q') || undefined;
  const initialTerm = term || qParam;
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  const [additionalResults, setAdditionalResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);
  const enrichmentEntryRef = useRef<string | null>(null);

  // New: report/contribution modals + fuzzy suggestions
  const [reportEntry, setReportEntry] = useState<DictionaryEntry | null>(null);
  const [showNewTranslation, setShowNewTranslation] = useState(false);
  const [fuzzySuggestions, setFuzzySuggestions] = useState<FuzzySuggestion[]>([]);
  const [mergeSourceEntry, setMergeSourceEntry] = useState<DictionaryEntry | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initialSearchDone = useRef(false);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Handle URL parameter search (/dictionary/:term OR /dictionary?q=term)
  // Also re-run when qParam changes (back/forward navigation)
  useEffect(() => {
    if (initialTerm) {
      const decoded = decodeURIComponent(initialTerm);
      // Skip if already showing this query's results
      if (initialSearchDone.current && decoded === query && result) return;
      initialSearchDone.current = true;
      setQuery(decoded);
      performSearch(decoded);
    } else if (initialSearchDone.current && !initialTerm) {
      // User navigated back to /dictionary without query — clear results
      setResult(null);
      setAdditionalResults([]);
      setError(null);
    }
  }, [initialTerm, qParam]);

  // Loading message
  useEffect(() => {
    if (loading) {
      setLoadingMessage(t('searching'));
    } else {
      setLoadingMessage('');
    }
  }, [loading]);

  const addToHistory = (entry: DictionaryEntry) => {
    const newItem: HistoryItem = { ...entry, timestamp: Date.now(), id: Date.now().toString() };
    const updated = [newItem, ...history.filter(h => h.hebrewScript !== entry.hebrewScript)].slice(0, 10);
    setHistory(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setAdditionalResults([]);
    setEnrichmentData(null);
    setEnrichmentLoading(false);
    try {
      const searchResult = await searchDictionary(searchTerm);
      const { entry, additionalResults: extras } = searchResult;
      setResult(entry);
      setAdditionalResults(extras);
      addToHistory(entry);

      // Handle enrichment promise (if returned)
      if (searchResult.enrichmentPromise) {
        const entryTerm = entry.hebrewScript;
        enrichmentEntryRef.current = entryTerm;
        setEnrichmentLoading(true);
        searchResult.enrichmentPromise.then(data => {
          // Guard against stale results
          if (enrichmentEntryRef.current === entryTerm && data) {
            setEnrichmentData(data as EnrichmentData);
          }
          setEnrichmentLoading(false);
        });
      }
      // Update URL to reflect what the user searched — push (not replace) so back button works
      router.push(`/dictionary?q=${encodeURIComponent(searchTerm)}`, { scroll: false });
    } catch (err: any) {
      if (err?.message === 'NOT_FOUND') {
        setNotFound(true);
        setError(t('notFoundMessage', { term: searchTerm }));
        // Fetch fuzzy suggestions
        setFuzzySuggestions([]);
        try {
          const fuzzy = await apiService.get<{ suggestions: FuzzySuggestion[] }>(
            `/dictionary/similar?q=${encodeURIComponent(searchTerm.trim())}&limit=5`
          );
          setFuzzySuggestions(fuzzy.suggestions || []);
        } catch { /* ignore */ }
      } else {
        setError(t('searchError'));
      }
      setResult(null);
      if (process.env.NODE_ENV === 'development') console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectResult = (entry: DictionaryEntry) => {
    setResult(entry);
    setAdditionalResults([]);
    setQuery(entry.hebrewScript);
    addToHistory(entry);
    router.replace(`/dictionary?q=${encodeURIComponent(entry.hebrewScript)}`, { scroll: false });
  };

  const handleSearch = async (e?: React.FormEvent, specificTerm?: string) => {
    if (e) e.preventDefault();
    const termToSearch = specificTerm || query;
    if (specificTerm && specificTerm !== query) {
      setQuery(specificTerm);
    }
    await performSearch(termToSearch);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const base64Audio = await blobToBase64(audioBlob);

        setLoading(true);
        setError(null);
        try {
          const data = await searchByAudio(base64Audio, 'audio/webm');
          setResult(data);
          setAdditionalResults([]);
          addToHistory(data);
          setQuery(data.hebrewScript);
          router.replace(`/dictionary?q=${encodeURIComponent(data.hebrewScript)}`, { scroll: false });
        } catch (err) {
          setError(t('speechError'));
          if (process.env.NODE_ENV === 'development') console.error(err);
        } finally {
          setLoading(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Error accessing microphone:', err);
      setError(t('micPermission'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Build SEO data based on whether we have a result
  const seoTitle = result ? `${result.hebrewScript} - ${t('resultsFor')}` : undefined;
  const seoDescription = result
    ? `${result.hebrewScript} - ${t('resultsFor')} ${result.hebrewShort || ''}`
    : undefined;
  const seoCanonicalPath = result ? `/word/${encodeURIComponent(result.hebrewScript)}` : '/';
  const seoJsonLd = result
    ? buildDefinedTermJsonLd(result.hebrewScript, result.hebrewShort || result.hebrewScript)
    : undefined;

  return (
    <>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        canonicalPath={seoCanonicalPath}
        jsonLd={seoJsonLd}
      />

      {/* HERO SECTION */}
      <HeroSection dialects={dialects} showBottomContent={!result}>
        <div className="w-full relative group max-w-2xl mx-auto px-4">
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-yellow-600/30 rounded-[2rem] blur-md opacity-50 group-hover:opacity-80 transition duration-500"></div>
          <form onSubmit={handleSearch} className="relative flex bg-[#050B14]/70 border border-white/10 backdrop-blur-2xl rounded-full overflow-hidden p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="flex-1 min-w-0 bg-transparent px-4 sm:px-6 py-3 text-lg outline-none text-white placeholder:text-slate-400"
              disabled={loading}
            />
            <div className="flex items-center border-s border-white/10 ps-2 gap-2 pe-1">
              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                onMouseLeave={stopRecording}
                className={`p-3 rounded-full transition-all duration-300 ${isRecording
                  ? 'bg-red-500 text-white scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-amber-500'
                  }`}
                title={t('voiceRecord')}
                aria-label={t('voiceLabel')}
              >
                <Mic size={24} className={isRecording ? 'animate-pulse' : ''} />
              </button>
              <button
                type="submit"
                disabled={loading}
                aria-label={tc('search')}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-[#050B14] p-3 rounded-full transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50 hover:scale-105"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
              </button>
            </div>
          </form>
        </div>
        {/* Progressive Loading Feedback */}
        {loading && (
          <div className="text-white font-medium animate-pulse text-sm mt-4 text-center flex items-center justify-center gap-2">
            <span>{loadingMessage}</span>
          </div>
        )}

        {/* Error Message — only show red banner for actual network/server errors, not "not found" */}
        {error && !notFound && (
          <div className="bg-red-500/80 backdrop-blur text-white p-3 rounded-xl text-center animate-in fade-in slide-in-from-top-2 mt-4 mx-auto max-w-lg shadow-lg">
            {error}
          </div>
        )}

        {/* Empty state CTA — show ABOVE history when word not found */}
        {!result && !loading && error && (
          <div className="w-full max-w-2xl mx-auto mt-8">
            <EmptyResultsCTA
              query={query}
              suggestions={fuzzySuggestions}
              onAddWord={onOpenContribute}
              onRequestTranslation={() => setShowNewTranslation(true)}
              onSelectSuggestion={(term) => { setQuery(term); performSearch(term); }}
              onOpenAuthModal={onOpenAuthModal}
            />
          </div>
        )}

        {/* History Panel — hide when there's an error (CTA shown instead) */}
        {!result && !loading && !error && (
          <div className="mt-4 w-full">
            <HistoryPanel
              history={history}
              onClear={clearHistory}
              onSelect={(item) => {
                setQuery(item.hebrewScript);
                handleSearch(undefined, item.hebrewScript);
              }}
            />
          </div>
        )}
      </HeroSection>

      <div className="w-full max-w-full md:max-w-5xl mx-auto px-5 mt-0 relative z-20">

        {/* Floating CTA: Add Word Button */}
        <button
          onClick={onOpenContribute}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 transition-all font-bold text-sm group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          <span className="hidden sm:inline">{t('addNewWord')}</span>
        </button>

        {/* Widgets — Only show if not searching (result is null) and not loading */}
        {!result && !loading && (
          <>
            {/* Contribution CTAs */}
            <ContributionGrid onOpenWordList={onOpenWordListModal} />

            {/* Content: Word of Day + Recent Additions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in slide-in-from-bottom-6 duration-700 delay-150">
              <div className="min-h-64 md:min-h-72">
                <WordOfTheDay onSelectWord={(term) => { setQuery(term); handleSearch(undefined, term); }} />
              </div>
              <div className="min-h-64 md:min-h-72 max-h-96">
                <RecentAdditions onSelectWord={(_term, id) => {
                  router.push(`/word/${id}`);
                }} />
              </div>
            </div>
          </>
        )}

        {/* Script Detection Banner */}
        {result && query && <ScriptDetectionBanner query={query} onSwitchScript={() => {}} />}

        {/* Fuzzy suggestions already included in EmptyResultsCTA above */}

        {/* Results Container — full width like widgets */}
        <div className="w-full mt-8">
          {/* All Results as SearchResultCards */}
          {result && !loading && (
            <div className="animate-in slide-in-from-bottom-8 duration-500">
              {/* Results count */}
              <div className="flex items-center justify-between text-sm text-slate-400 px-1 mb-3">
                <span>{1 + additionalResults.length} {t('resultsFor')} "{query}"</span>
              </div>

              {/* Results grid: auto-fit columns */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {/* Best match */}
                <SearchResultCard
                  entry={result}
                  isBestMatch
                  searchQuery={query}
                  onReport={() => setReportEntry(result)}
                  onNavigate={() => router.push(`/word/${encodeURIComponent(result.hebrewScript || result.id || '')}`)}
                  onSuggestMerge={result.hasDuplicates ? (e) => setMergeSourceEntry(e) : undefined}
                />

                {/* Additional results */}
                {additionalResults.map((entry, idx) => (
                  <SearchResultCard
                    key={entry.id || idx}
                    entry={entry}
                    searchQuery={query}
                    onReport={() => setReportEntry(entry)}
                    onNavigate={() => router.push(`/word/${encodeURIComponent(entry.hebrewScript || entry.id || '')}`)}
                    onSuggestMerge={entry.hasDuplicates ? (e) => setMergeSourceEntry(e) : undefined}
                  />
                ))}
              </div>

              {/* Bottom actions — full width */}
              <div className="mt-4 bg-[#0d1424]/40 backdrop-blur-xl rounded-xl border border-dashed border-white/10 p-4">
                <p className="text-sm text-slate-400 mb-3 text-center">{t('notFoundCta')}</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowNewTranslation(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/30 transition-colors text-sm font-medium border border-indigo-500/20"
                  >
                    <Plus size={14} />
                    {t('suggestTranslation')}"{query}"
                  </button>
                  <button
                    type="button"
                    onClick={onOpenContribute}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-slate-400 hover:bg-white/5 rounded-lg transition-colors text-sm"
                  >
                    {t('addNewWord')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {reportEntry && (
        <ReportModal
          searchQuery={query}
          entry={reportEntry}
          onClose={() => setReportEntry(null)}
          onSubmit={async (data) => {
            try {
              await apiService.post(`/dictionary/entries/${reportEntry.id}/suggest-field`, {
                fieldName: 'hebrewShort',
                value: data.betterTranslation || '',
                reason: `[דיווח: ${data.reportType}] ${data.explanation || ''}`,
                reportType: 'report',
                searchContext: query,
              });
            } catch { /* ignore */ }
            setReportEntry(null);
          }}
        />
      )}

      {/* New Translation Modal */}
      {showNewTranslation && (
        <NewTranslationModal
          searchQuery={query}
          onClose={() => setShowNewTranslation(false)}
          onSubmit={async (data) => {
            try {
              await apiService.post('/dictionary/entries', {
                term: data.term,
                hebrew: query,
                latin: data.latin,
                cyrillic: data.cyrillic,
                dialect: data.dialect || '',
              });
            } catch { /* ignore */ }
            setShowNewTranslation(false);
          }}
        />
      )}

      {/* Suggest Merge Modal */}
      {mergeSourceEntry && (
        <SuggestMergeInlineModal
          sourceEntry={mergeSourceEntry}
          candidates={[...(result && result.id !== mergeSourceEntry.id ? [result] : []), ...additionalResults.filter(r => r.id !== mergeSourceEntry.id)]}
          isAuthenticated={isAuthenticated}
          onClose={() => setMergeSourceEntry(null)}
          onNeedAuth={() => onOpenAuthModal(t('mergeAuth'))}
        />
      )}
    </>
  );
};

// Inline merge suggestion modal
const SuggestMergeInlineModal: React.FC<{
  sourceEntry: DictionaryEntry;
  candidates: DictionaryEntry[];
  isAuthenticated: boolean;
  onClose: () => void;
  onNeedAuth: () => void;
}> = ({ sourceEntry, candidates, isAuthenticated, onClose, onNeedAuth }) => {
  const ts = useTranslations('search');
  const tc = useTranslations('common');
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
    if (!isAuthenticated) { onNeedAuth(); return; }
    setSubmitting(true);
    try {
      const sourceId = parseInt(sourceEntry.id || '0');
      for (const id of selectedIds) {
        await apiService.post('/dictionary/duplicates/suggest', {
          entryIdA: sourceId,
          entryIdB: parseInt(id),
          reason: reason || undefined,
        });
      }
      setSubmitted(true);
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-emerald-400 text-3xl mb-2">✓</div>
            <p className="text-white font-medium mb-1">{ts('mergeSent')}</p>
            <p className="text-slate-400 text-sm mb-4">{ts('mergeSentDetail')}</p>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-600">{tc('close')}</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{ts('mergeTitle')}</h3>
              <button type="button" onClick={onClose} title={tc('close')} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-slate-300 text-sm mb-3">
              {ts('mergeInstruction', { term: sourceEntry.hebrewScript })}
            </p>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {candidates.map(c => {
                const t = c.dialectScripts?.[0];
                const isSelected = selectedIds.has(c.id || '');
                return (
                  <button key={c.id} type="button" onClick={() => toggleId(c.id || '')}
                    className={`w-full text-start px-3 py-2.5 rounded-lg border transition-all text-sm flex items-center gap-2 ${
                      isSelected ? 'bg-amber-500/15 border-amber-500/30 text-white' : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-amber-500 border-amber-400 text-white' : 'border-slate-600'
                    }`}>{isSelected && '✓'}</div>
                    <span className="font-medium">{c.hebrewScript}</span>
                    {c.hebrewShort && <span className="text-slate-400 ms-1">{c.hebrewShort}</span>}
                  </button>
                );
              })}
            </div>
            <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder={ts('mergeReason')} rows={2}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:border-amber-500/50 focus:outline-none resize-none mb-4" />
            <div className="flex gap-3">
              <button type="button" onClick={handleSubmit} disabled={selectedIds.size === 0 || submitting}
                className="flex-1 px-4 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 text-sm">
                {submitting ? tc('loading') : selectedIds.size > 1 ? ts('mergeSendCount', { count: selectedIds.size }) : ts('mergeSend')}
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm">{tc('cancel')}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DictionaryPage;
