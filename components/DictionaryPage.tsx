'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { DictionaryEntry, HistoryItem, DialectItem } from '../types';
import { searchDictionary, searchByAudio, SearchResult } from '../services/geminiService';
import { blobToBase64 } from '../utils/audioUtils';
import ResultCard from './ResultCard';
import HistoryPanel from './HistoryPanel';
import HeroSection from './HeroSection';
import WordOfTheDay from './widgets/WordOfTheDay';
import CommunityTicker from './widgets/CommunityTicker';
import RecentAdditions from './widgets/RecentAdditions';
import MissingDialects from './widgets/MissingDialects';
import HebrewOnlyWidget from './widgets/HebrewOnlyWidget';
import JuhuriOnlyWidget from './widgets/JuhuriOnlyWidget';
import MissingAudioWidget from './widgets/MissingAudioWidget';
import { Mic, Search, Plus, Loader2 } from 'lucide-react';
import { SEOHead, buildDefinedTermJsonLd } from './seo/SEOHead';

const STORAGE_KEY = 'juhuri_history';

const POS_HEBREW: Record<string, string> = {
  noun: 'שם עצם', verb: 'פועל', adjective: 'שם תואר', adverb: 'תואר הפועל',
  pronoun: 'כינוי גוף', preposition: 'מילת יחס', conjunction: 'מילת חיבור',
  interjection: 'מילת קריאה', particle: 'מילית', numeral: 'שם מספר',
  phrase: 'צירוף', idiom: 'ניב', expression: 'ביטוי',
};
const posHebrew = (pos: string) => POS_HEBREW[pos.toLowerCase().trim()] || pos;

interface DictionaryPageProps {
  dialects: DialectItem[];
  onOpenContribute: () => void;
  onOpenAuthModal: (reason?: string) => void;
  onOpenTranslationModal: (entry: { id: number; term: string; existingTranslation?: any }) => void;
  onOpenWordListModal: (category: 'hebrew-only' | 'juhuri-only' | 'missing-dialects' | 'missing-audio', title: string, totalCount: number) => void;
}

const DictionaryPage: React.FC<DictionaryPageProps> = ({
  dialects,
  onOpenContribute,
  onOpenAuthModal,
  onOpenTranslationModal,
  onOpenWordListModal,
}) => {
  const params = useParams();
  const term = params?.term as string | undefined;
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [result, setResult] = useState<DictionaryEntry | null>(null);
  const [additionalResults, setAdditionalResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initialSearchDone = useRef(false);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Handle URL parameter search
  useEffect(() => {
    if (term && !initialSearchDone.current) {
      initialSearchDone.current = true;
      const decoded = decodeURIComponent(term);
      setQuery(decoded);
      performSearch(decoded);
    }
  }, [term]);

  // Loading message
  useEffect(() => {
    if (loading) {
      setLoadingMessage('מחפש במילון...');
    } else {
      setLoadingMessage('');
    }
  }, [loading]);

  const addToHistory = (entry: DictionaryEntry) => {
    const newItem: HistoryItem = { ...entry, timestamp: Date.now(), id: Date.now().toString() };
    const updated = [newItem, ...history.filter(h => h.term !== entry.term)].slice(0, 10);
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
    setAdditionalResults([]);
    try {
      const { entry, additionalResults: extras } = await searchDictionary(searchTerm);
      setResult(entry);
      setAdditionalResults(extras);
      addToHistory(entry);
      // Update URL to reflect the searched term
      router.replace(`/word/${encodeURIComponent(entry.term)}`);
    } catch (err: any) {
      if (err?.message === 'NOT_FOUND') {
        setError(`המילה "${searchTerm}" לא נמצאה במילון. בדוק את האיות או הוסף אותה בעצמך!`);
      } else {
        setError('שגיאה בחיפוש. נסה שוב.');
      }
      setResult(null);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectResult = (entry: DictionaryEntry) => {
    setResult(entry);
    setAdditionalResults([]);
    setQuery(entry.term);
    addToHistory(entry);
    router.replace(`/word/${encodeURIComponent(entry.term)}`);
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
          setQuery(data.term);
          router.replace(`/word/${encodeURIComponent(data.term)}`);
        } catch (err) {
          setError('לא הצלחנו לזהות את הדיבור. נסה שוב, בקול ברור.');
          console.error(err);
        } finally {
          setLoading(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('נדרשת גישה למיקרופון כדי להקליט.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Build SEO data based on whether we have a result
  const seoTitle = result ? `${result.term} - תרגום ג'והורי` : undefined;
  const seoDescription = result
    ? `תרגום ומשמעות של "${result.term}" במילון הג'והורי-עברי`
    : undefined;
  const seoCanonicalPath = result ? `/word/${encodeURIComponent(result.term)}` : '/';
  const seoJsonLd = result
    ? buildDefinedTermJsonLd(result.term, result.translations?.[0]?.hebrew || result.term)
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
        <div className="w-full relative group max-w-2xl mx-auto">
          <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/30 to-yellow-600/30 rounded-[2rem] blur-md opacity-50 group-hover:opacity-80 transition duration-500"></div>
          <form onSubmit={handleSearch} className="relative flex bg-[#050B14]/70 border border-white/10 backdrop-blur-2xl rounded-full overflow-hidden p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="חפש במילון המורשת..."
              className="flex-1 bg-transparent px-6 py-3 text-lg outline-none text-white placeholder:text-slate-400"
              disabled={loading}
            />
            <div className="flex items-center border-r border-white/10 pr-2 gap-2 pl-1">
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
                title="לחיצה ארוכה להקלטה"
              >
                <Mic size={24} className={isRecording ? 'animate-pulse' : ''} />
              </button>
              <button
                type="submit"
                disabled={loading}
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/80 backdrop-blur text-white p-3 rounded-xl text-center animate-in fade-in slide-in-from-top-2 mt-4 mx-auto max-w-lg shadow-lg">
            {error}
          </div>
        )}

        {/* History Panel */}
        {!result && !loading && (
          <div className="mt-4 w-full">
            <HistoryPanel
              history={history}
              onClear={clearHistory}
              onSelect={(item) => {
                setQuery(item.term);
                handleSearch(undefined, item.term);
              }}
            />
          </div>
        )}
      </HeroSection>

      <div className="w-full max-w-5xl mx-auto px-4 mt-0 relative z-20">

        {/* Floating CTA: Add Word Button */}
        <button
          onClick={onOpenContribute}
          className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-full shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 transition-all font-bold text-sm group"
        >
          <Plus size={20} className="group-hover:rotate-90 transition-transform" />
          <span className="hidden sm:inline">הוסף מילה</span>
        </button>

        {/* Widgets Grid - Only show if not searching (result is null) and not loading */}
        {!result && !loading && (
          <>
            {/* Row 1: Translation Gaps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700 mb-6">
              <div className="h-56 md:h-64">
                <HebrewOnlyWidget
                  onAddTranslation={(entryId, term) => onOpenTranslationModal({ id: entryId, term })}
                  onOpenAuthModal={onOpenAuthModal}
                  onViewAll={(total) => onOpenWordListModal('hebrew-only', 'מילים עם עברית בלבד', total)}
                />
              </div>
              <div className="h-56 md:h-64">
                <JuhuriOnlyWidget
                  onAddTranslation={(entryId, term) => onOpenTranslationModal({ id: entryId, term })}
                  onOpenAuthModal={onOpenAuthModal}
                  onViewAll={(total) => onOpenWordListModal('juhuri-only', 'מילים עם ג\'והורי בלבד', total)}
                />
              </div>
              <div className="h-56 md:h-64">
                <MissingDialects
                  onAddDialect={(entryId, term, missing) => onOpenTranslationModal({ id: entryId, term })}
                  onOpenAuthModal={onOpenAuthModal}
                  onViewAll={(total) => onOpenWordListModal('missing-dialects', 'מילים חסרות ניבים', total)}
                />
              </div>
            </div>

            {/* Row 2: Audio + Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="h-64 md:h-80">
                <MissingAudioWidget
                  onAddAudio={(entryId, term) => onOpenTranslationModal({ id: entryId, term })}
                  onOpenAuthModal={onOpenAuthModal}
                  onViewAll={(total) => onOpenWordListModal('missing-audio', 'מילים חסרות הקלטה', total)}
                />
              </div>
              <div className="h-64 md:h-80"><WordOfTheDay onSelectWord={(term) => { setQuery(term); handleSearch(undefined, term); }} /></div>
              <div className="h-64 md:h-80"><RecentAdditions onSelectWord={setQuery} /></div>
            </div>

            {/* Community Ticker - Full Width */}
            <div className="mt-6 animate-in slide-in-from-bottom-8 duration-700 delay-300">
              <div className="h-64 md:h-72"><CommunityTicker /></div>
            </div>
          </>
        )}

        {/* Results Container */}
        <div className="w-full max-w-2xl mx-auto mt-8">
          {/* Main Result */}
          {result && !loading && (
            <div className="w-full animate-in slide-in-from-bottom-8 duration-500">
              <ResultCard
                entry={result}
                onOpenAuthModal={(reason) => onOpenAuthModal(reason)}
                onSuggestCorrection={(translation, entryId, term) => {
                  onOpenTranslationModal({
                    id: Number(entryId),
                    term,
                    existingTranslation: {
                      id: translation.id,
                      dialect: translation.dialect,
                      hebrew: translation.hebrew,
                      latin: translation.latin,
                      cyrillic: translation.cyrillic
                    }
                  });
                }}
              />
            </div>
          )}

          {/* Additional Results */}
          {additionalResults.length > 0 && !loading && (
            <div className="mt-6 animate-in slide-in-from-bottom-8 duration-500 delay-150">
              <h3 className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-3">תוצאות נוספות</h3>
              <div className="space-y-2">
                {additionalResults.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => selectResult(entry)}
                    className="w-full text-right p-4 rounded-xl bg-[#0d1424]/60 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 hover:bg-[#0d1424]/90 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xl font-bold text-slate-100">{entry.term}</span>
                          {entry.partOfSpeech && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-slate-400">{posHebrew(entry.partOfSpeech)}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
                          {entry.translations?.[0]?.hebrew && (
                            <span>{entry.translations[0].hebrew}</span>
                          )}
                          {entry.translations?.[0]?.latin && (
                            <span className="font-mono text-xs text-slate-500">{entry.translations[0].latin}</span>
                          )}
                          {entry.russian && (
                            <span className="text-xs text-slate-500" dir="ltr">{entry.russian}</span>
                          )}
                        </div>
                      </div>
                      <Search size={16} className="text-slate-500 group-hover:text-amber-500 transition-colors shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DictionaryPage;
