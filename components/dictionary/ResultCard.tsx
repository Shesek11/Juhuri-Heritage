import React, { useState } from 'react';
import { DictionaryEntry, Translation, Example, PendingSuggestion } from '../../types';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import { useAuth } from '../../contexts/AuthContext';
import VoiceRecorder from '../audio/VoiceRecorder';
import CardHeader from './CardHeader';
import DetailsSection from './DetailsSection';
import TranslationCard from './TranslationCard';
import ExamplesSection from './ExamplesSection';
import CommunityActions from './CommunityActions';

export interface EnrichmentData {
  hebrewTransliteration?: string;
  hebrew?: string;
  latin?: string;
  cyrillic?: string;
  russian?: string;
  pronunciationGuide?: string;
  definition?: string;
  partOfSpeech?: string;
}

interface ResultCardProps {
  entry: DictionaryEntry;
  onOpenAuthModal: (reason?: string) => void;
  onSuggestCorrection?: (translation: Translation, entryId: string, term: string) => void;
  enrichmentData?: EnrichmentData | null;
  enrichmentLoading?: boolean;
}

const ResultCard: React.FC<ResultCardProps> = ({
  entry,
  onOpenAuthModal,
  onSuggestCorrection,
  enrichmentData,
  enrichmentLoading = false,
}) => {
  const { isAuthenticated } = useAuth();
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [voice, setVoice] = useState<'Zephyr' | 'Fenrir'>('Zephyr');

  // Translation voting state
  const [translationVotes, setTranslationVotes] = useState<Record<number, { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }>>(
    () => {
      const initialVotes: Record<number, { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }> = {};
      entry.translations.forEach(t => {
        if (t.id) {
          initialVotes[t.id] = { upvotes: t.upvotes || 0, downvotes: t.downvotes || 0, userVote: t.userVote || null };
        }
      });
      return initialVotes;
    }
  );

  const pendingSuggestions: PendingSuggestion[] = entry.pendingSuggestions || [];

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
    if (!isAuthenticated) return onOpenAuthModal('כדי להצביע על תרגומים, יש להתחבר תחילה');
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
    <div className="group/card relative w-full max-w-2xl bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 transition-all duration-500 hover:-translate-y-1 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] font-rubik">
      {/* Subtle top gradient line */}
      <div className="absolute z-50 top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover/card:scale-x-100 transition-transform duration-700" />

      {/* Header: term, POS, pronunciation, badges, controls */}
      <CardHeader
        entry={entry}
        pendingSuggestions={pendingSuggestions}
        enrichmentLoading={enrichmentLoading}
        enrichedPronunciation={enrichmentData?.pronunciationGuide}
        enrichedPartOfSpeech={enrichmentData?.partOfSpeech}
      />

      <div className="p-6 space-y-6">
        {/* Details: definition + russian */}
        <DetailsSection
          entry={entry}
          editingField={editingField}
          onStartEdit={setEditingField}
          onCloseEdit={() => setEditingField(null)}
          pendingSuggestions={pendingSuggestions}
          enrichmentLoading={enrichmentLoading}
          enrichedDefinition={enrichmentData?.definition}
          enrichedRussian={enrichmentData?.russian}
        />

        {/* Translations */}
        <div>
          <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-400 font-bold mb-3">תרגומים</h3>
          <div className="grid gap-4">
            {entry.translations.map((t, idx) => (
              <TranslationCard
                key={t.id || idx}
                translation={t}
                index={idx}
                entry={entry}
                voteData={t.id ? translationVotes[t.id] : null}
                isPlaying={isPlaying}
                editingField={editingField}
                onPlay={handlePlay}
                onVote={handleTranslationVote}
                onStartEdit={setEditingField}
                onCloseEdit={() => setEditingField(null)}
                onSuggestCorrection={onSuggestCorrection}
                pendingSuggestions={pendingSuggestions}
                enrichmentLoading={enrichmentLoading}
                enrichmentData={enrichmentData ? { hebrew: enrichmentData.hebrew, latin: enrichmentData.latin, cyrillic: enrichmentData.cyrillic } : null}
              />
            ))}
          </div>
        </div>

        {/* Voice Recording */}
        {entry.id && <VoiceRecorder entryId={entry.id} />}

        {/* Examples & Community Proverbs */}
        <ExamplesSection
          entry={entry}
          isPlaying={isPlaying}
          onPlay={handlePlay}
        />

        {/* Community Actions: likes, comments */}
        <CommunityActions entry={entry} onOpenAuthModal={onOpenAuthModal} />
      </div>
    </div>
  );
};

export default ResultCard;
