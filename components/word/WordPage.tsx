import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Copy, GitMerge, Check, X as XIcon } from 'lucide-react';
import { DictionaryEntry, DuplicatePreview, DialectScript, Example, PendingSuggestion } from '../../types';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import { useAuth } from '../../contexts/AuthContext';
import WordHero from './WordHero';
import DialectComparison from './DialectComparison';
import RecordingsList from './RecordingsList';
import RelatedWords from './RelatedWords';
import MeaningSection from './MeaningSection';
import ExamplesSection from '../dictionary/ExamplesSection';
import CommunityActions from '../dictionary/CommunityActions';

export interface EnrichmentData {
  hebrewTransliteration?: string;
  hebrewShort?: string;
  hebrewScript?: string;
  latinScript?: string;
  cyrillicScript?: string;
  russianShort?: string;
  pronunciationGuide?: string;
  hebrewLong?: string;
  partOfSpeech?: string;
}

interface WordPageProps {
  entry: DictionaryEntry;
  onOpenAuthModal: (reason?: string) => void;
  onSuggestCorrection?: (translation: DialectScript, entryId: string, hebrewScript: string) => void;
  enrichmentData?: EnrichmentData | null;
  enrichmentLoading?: boolean;
}

const WordPage: React.FC<WordPageProps> = ({
  entry,
  onOpenAuthModal,
  onSuggestCorrection,
  enrichmentData,
  enrichmentLoading = false,
}) => {
  const t = useTranslations('word');
  const tc = useTranslations('common');
  const { isAuthenticated } = useAuth();
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [voice, setVoice] = useState<'Zephyr' | 'Fenrir'>('Zephyr');

  // Translation voting state
  const [translationVotes, setTranslationVotes] = useState<Record<number, { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }>>(
    () => {
      const initialVotes: Record<number, { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }> = {};
      entry.dialectScripts.forEach(t => {
        if (t.id) {
          initialVotes[t.id] = { upvotes: t.upvotes || 0, downvotes: t.downvotes || 0, userVote: t.userVote || null };
        }
      });
      return initialVotes;
    }
  );

  // Related words state (placeholder - will be fetched from API)
  const [relatedWords, setRelatedWords] = useState<{ id: string; hebrewScript: string; hebrewShort: string; partOfSpeech?: string }[]>([]);

  // Recordings state (placeholder - will be fetched from API)
  const [recordings, setRecordings] = useState<any[]>([]);

  const pendingSuggestions: PendingSuggestion[] = entry.pendingSuggestions || [];

  // Fetch related words
  useEffect(() => {
    if (!entry.id) return;
    const fetchRelated = async () => {
      try {
        const apiService = (await import('../../services/apiService')).default;
        const res = await apiService.get<{ relatedWords: { id: string; hebrewScript: string; hebrewShort: string; partOfSpeech?: string }[] }>(
          `/dictionary/entries/${entry.id}/related`
        );
        setRelatedWords(res.relatedWords || []);
      } catch {
        // API may not exist yet - silently ignore
      }
    };
    fetchRelated();
  }, [entry.id]);

  // Fetch recordings
  useEffect(() => {
    if (!entry.id) return;
    const fetchRecordings = async () => {
      try {
        const apiService = (await import('../../services/apiService')).default;
        const res = await apiService.get<{ recordings: any[] }>(
          `/dictionary/entries/${entry.id}/recordings`
        );
        setRecordings(res.recordings || []);
      } catch {
        // API may not exist yet - silently ignore
      }
    };
    fetchRecordings();
  }, [entry.id]);

  const handlePlay = async (text: string, id: string) => {
    if (isPlaying) return;
    setIsPlaying(id);
    try {
      const audioData = await generateSpeech(text, voice);
      await playBase64Audio(audioData);
    } catch {
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = /[\u0590-\u05FF]/.test(text) ? 'he-IL' : 'en-US';
        utterance.onend = () => setIsPlaying(null);
        utterance.onerror = () => setIsPlaying(null);
        window.speechSynthesis.speak(utterance);
        return;
      } catch { /* ignore */ }
    }
    setIsPlaying(null);
  };

  const handleTranslationVote = async (translationId: number, voteType: 'up' | 'down') => {
    if (!isAuthenticated) return onOpenAuthModal(t('voteAuth'));
    if (!translationId) return;

    const currentVote = translationVotes[translationId];
    const newUserVote = currentVote?.userVote === voteType ? null : voteType;

    setTranslationVotes(prev => {
      const current = prev[translationId] || { upvotes: 0, downvotes: 0, userVote: null };
      let newUpvotes = current.upvotes;
      let newDownvotes = current.downvotes;
      if (current.userVote === 'up') newUpvotes--;
      if (current.userVote === 'down') newDownvotes--;
      if (newUserVote === 'up') newUpvotes++;
      if (newUserVote === 'down') newDownvotes++;
      return { ...prev, [translationId]: { upvotes: newUpvotes, downvotes: newDownvotes, userVote: newUserVote } };
    });

    try {
      const apiService = (await import('../../services/apiService')).default;
      await apiService.post(`/dictionary/translations/${translationId}/vote`, { voteType: newUserVote });
    } catch {
      setTranslationVotes(prev => ({ ...prev, [translationId]: currentVote || { upvotes: 0, downvotes: 0, userVote: null } }));
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto font-rubik">
      {/* AI tip */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-2 px-2">
        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-400 shrink-0">
          <Sparkles size={9} />
          AI
        </span>
        <span>{t('aiTip')}</span>
      </div>

      {/* Hero Section */}
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-t-2xl border border-white/10 border-b-0 overflow-hidden">
        <WordHero
          entry={entry}
          pendingSuggestions={pendingSuggestions}
          enrichmentLoading={enrichmentLoading}
          enrichedPronunciation={enrichmentData?.pronunciationGuide}
          enrichedPartOfSpeech={enrichmentData?.partOfSpeech}
          enrichedHebrewTransliteration={enrichmentData?.hebrewTransliteration}
        />
      </div>

      {/* Content — 3 zones + extras */}
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-b-2xl border border-white/10 border-t-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 md:p-8 space-y-0">

          {/* ZONE 2: Meaning — Hebrew + Russian + expanded definition */}
          <div className="pb-6">
            <MeaningSection
              entry={entry}
              editingField={editingField}
              onStartEdit={setEditingField}
              onCloseEdit={() => setEditingField(null)}
              pendingSuggestions={pendingSuggestions}
              enrichmentLoading={enrichmentLoading}
              enrichedDefinition={enrichmentData?.hebrewLong}
              enrichedRussian={enrichmentData?.russianShort}
            />
          </div>

          {/* ZONE 3: Dialects table */}
          <div className="border-t border-white/10 pt-6 pb-6">
            <DialectComparison
              translations={entry.dialectScripts}
              entry={entry}
              enrichmentData={enrichmentData ? { hebrewScript: enrichmentData.hebrewScript, latinScript: enrichmentData.latinScript, cyrillicScript: enrichmentData.cyrillicScript } : null}
              enrichmentLoading={enrichmentLoading}
              pendingSuggestions={pendingSuggestions}
              onVote={handleTranslationVote}
              onSuggestCorrection={onSuggestCorrection}
              onPlay={handlePlay}
              isPlaying={isPlaying}
              translationVotes={translationVotes}
            />
          </div>

          {/* Examples & Proverbs */}
          <div className="border-t border-white/10 pt-6 pb-6">
            <ExamplesSection
              entry={entry}
              isPlaying={isPlaying}
              onPlay={handlePlay}
            />
          </div>

          {/* Recordings */}
          {entry.id && (
            <div className="border-t border-white/10 pt-6 pb-6">
              <RecordingsList recordings={recordings} entryId={entry.id} />
            </div>
          )}

          {/* Related Words */}
          {relatedWords.length > 0 && (
            <div className="border-t border-white/10 pt-6 pb-6">
              <RelatedWords relatedWords={relatedWords} />
            </div>
          )}

          {/* Possible Duplicates */}
          {entry.possibleDuplicates && entry.possibleDuplicates.length > 0 && (
            <div className="border-t border-white/10 pt-6 pb-6">
              <PossibleDuplicates
                entry={entry}
                duplicates={entry.possibleDuplicates}
                isAuthenticated={isAuthenticated}
                onOpenAuthModal={onOpenAuthModal}
              />
            </div>
          )}

          {/* Community Actions */}
          <div className="border-t border-white/10 pt-6">
            <CommunityActions entry={entry} onOpenAuthModal={onOpenAuthModal} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ──── Possible Duplicates section ────
import apiService from '../../services/apiService';

const PossibleDuplicates: React.FC<{
  entry: DictionaryEntry;
  duplicates: DuplicatePreview[];
  isAuthenticated: boolean;
  onOpenAuthModal: (reason?: string) => void;
}> = ({ entry, duplicates, isAuthenticated, onOpenAuthModal }) => {
  const t = useTranslations('word');
  const tc = useTranslations('common');
  const ts = useTranslations('search');
  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  const handleSuggest = async (dupId: string) => {
    if (!isAuthenticated) {
      onOpenAuthModal(t('mergeAuth'));
      return;
    }
    setSubmitting(true);
    try {
      await apiService.post('/dictionary/duplicates/suggest', {
        entryIdA: parseInt(entry.id || '0'),
        entryIdB: parseInt(dupId),
        reason: reason || undefined,
      });
      setSubmitted(prev => new Set(prev).add(dupId));
      setSuggestingId(null);
      setReason('');
    } catch { /* ignore */ }
    setSubmitting(false);
  };

  return (
    <div dir="rtl">
      <h2 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <Copy className="w-4 h-4 text-orange-400" />
        {t('similarEntries')}
      </h2>
      <div className="space-y-2">
        {duplicates.map(dup => (
          <div key={dup.id} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-3 py-2.5 border border-slate-700/50">
            <a
              href={`/word/${encodeURIComponent(dup.hebrewScript)}`}
              className="flex items-center gap-3 text-sm hover:text-amber-300 transition-colors"
              onClick={e => e.stopPropagation()}
            >
              <span className="text-white font-medium">{dup.hebrewScript}</span>
              {dup.hebrewShort && <span className="text-slate-400">{dup.hebrewShort}</span>}
              {dup.latinScript && <span className="text-slate-500 text-xs">{dup.latinScript}</span>}
            </a>
            {submitted.has(dup.id) ? (
              <span className="flex items-center gap-1 text-emerald-400 text-xs"><Check className="w-3.5 h-3.5" /> {t('mergeSuggestionSent')}</span>
            ) : suggestingId === dup.id ? (
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={ts('mergeReason')}
                  className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-xs text-white w-28 placeholder-slate-500 focus:outline-none"
                  dir="rtl"
                />
                <button
                  type="button"
                  onClick={() => handleSuggest(dup.id)}
                  disabled={submitting}
                  className="px-2 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 disabled:opacity-50"
                >
                  {submitting ? '...' : tc('submit')}
                </button>
                <button type="button" onClick={() => setSuggestingId(null)} title={tc('cancel')} className="text-slate-500 hover:text-white">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSuggestingId(dup.id); }}
                className="flex items-center gap-1 text-orange-300/70 hover:text-orange-300 text-xs transition-colors"
              >
                <GitMerge className="w-3.5 h-3.5" />
                {t('suggestMerge')}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WordPage;
