import React, { useState } from 'react';
import { Volume2, Bot, Users } from 'lucide-react';
import { DictionaryEntry } from '../../types';
import { partOfSpeechHebrew } from '../../utils/pos';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import EditableField from './EditableField';
import type { PendingSuggestion } from '../../types';

interface CardHeaderProps {
  entry: DictionaryEntry;
  pendingSuggestions?: PendingSuggestion[];
  enrichmentLoading?: boolean;
  enrichedPronunciation?: string;
  enrichedPartOfSpeech?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({
  entry,
  pendingSuggestions = [],
  enrichmentLoading = false,
  enrichedPronunciation,
  enrichedPartOfSpeech,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const text = entry.translations?.[0]?.latin || entry.translations?.[0]?.cyrillic || entry.term;
      const audioData = await generateSpeech(text);
      await playBase64Audio(audioData);
    } catch (error) {
      try {
        const utterance = new SpeechSynthesisUtterance(entry.term);
        utterance.lang = 'he-IL';
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        return;
      } catch { /* ignore */ }
    }
    setIsPlaying(false);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-white/10 to-transparent border-b border-white/10 text-white relative">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Language badge */}
            <span className="inline-block px-2 py-1 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">
              {entry.detectedLanguage === 'Hebrew' ? 'עברית' : 'ג\'והורי'}
            </span>
            {/* Source badge */}
            {entry.source === 'AI' ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
                <Bot size={12} /> תרגום AI
              </span>
            ) : entry.source === 'קהילה' ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
                <Users size={12} /> תרומה קהילתית
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
                ✓ מאגר קהילתי
              </span>
            )}
            {/* Part of speech */}
            <EditableField
              entryId={entry.id}
              fieldName="partOfSpeech"
              dbValue={entry.partOfSpeech ? partOfSpeechHebrew(entry.partOfSpeech) : undefined}
              aiValue={enrichedPartOfSpeech ? partOfSpeechHebrew(enrichedPartOfSpeech) : undefined}
              isEnriching={enrichmentLoading && !entry.partOfSpeech}
              pendingSuggestion={pendingSuggestions.find(s => s.fieldName === 'partOfSpeech')}
              compact
              valueClassName="text-xs font-medium"
              isEditing={editingField === 'partOfSpeech'}
              onStartEdit={() => setEditingField('partOfSpeech')}
              onCloseEdit={() => setEditingField(null)}
            />
          </div>

          {/* Source attribution */}
          {entry.source === 'AI' ? (
            <span className="text-[11px] text-amber-400/70">תרגום AI</span>
          ) : (
            <span className="text-[11px] text-slate-400">באדיבות {(entry as any).sourceName || (entry as any).contributorName || 'הקהילה'}</span>
          )}

          {/* Term */}
          <h2 className="text-4xl font-bold tracking-tight">{entry.term}</h2>

          {/* Pronunciation */}
          <div className="max-w-xs">
            <EditableField
              entryId={entry.id}
              fieldName="pronunciationGuide"
              dbValue={entry.pronunciationGuide}
              aiValue={enrichedPronunciation}
              isEnriching={enrichmentLoading && !entry.pronunciationGuide}
              pendingSuggestion={pendingSuggestions.find(s => s.fieldName === 'pronunciationGuide')}
              compact
              valueClassName="text-indigo-100 font-mono text-sm opacity-90"
              isEditing={editingField === 'pronunciationGuide'}
              onStartEdit={() => setEditingField('pronunciationGuide')}
              onCloseEdit={() => setEditingField(null)}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePlay}
            className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors ${isPlaying ? 'animate-pulse' : ''}`}
            title="השמע הגייה"
          >
            <Volume2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardHeader;
