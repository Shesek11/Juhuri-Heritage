import React, { useState } from 'react';
import { Volume2, Copy, Check, Settings2, Bot, Users, Pencil } from 'lucide-react';
import { DictionaryEntry } from '../../types';
import { partOfSpeechHebrew } from '../../utils/pos';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import MissingFieldPlaceholder from './MissingFieldPlaceholder';
import FieldEditForm from './FieldEditForm';
import AIValueBadge from './AIValueBadge';
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
  const [copied, setCopied] = useState(false);
  const [voice, setVoice] = useState<'Zephyr' | 'Fenrir'>('Zephyr');
  const [editingPOS, setEditingPOS] = useState(false);
  const [editingPronunciation, setEditingPronunciation] = useState(false);

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const text = entry.translations?.[0]?.cyrillic || entry.translations?.[0]?.latin || entry.term;
      const audioData = await generateSpeech(text, voice);
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

  const copyToClipboard = () => {
    const allText = `${entry.term}\n${entry.translations.map(t => `${t.hebrew} | ${t.latin} | ${t.cyrillic}`).join('\n')}`;
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pronunciation = entry.pronunciationGuide || enrichedPronunciation;
  const isPronunciationFromAI = !entry.pronunciationGuide && !!enrichedPronunciation;
  const displayPOS = entry.partOfSpeech || enrichedPartOfSpeech;
  const isPOSFromAI = !entry.partOfSpeech && !!enrichedPartOfSpeech;
  const posSuggestion = pendingSuggestions.find(s => s.fieldName === 'partOfSpeech');
  const pronSuggestion = pendingSuggestions.find(s => s.fieldName === 'pronunciationGuide');

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
            {displayPOS ? (
              isPOSFromAI ? (
                <AIValueBadge
                  value={partOfSpeechHebrew(displayPOS)}
                  entryId={entry.id}
                  fieldName="partOfSpeech"
                  valueClassName="text-xs font-medium"
                  inline
                />
              ) : (
                <span className="inline-flex items-center px-2 py-1 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">
                  {partOfSpeechHebrew(displayPOS)}
                </span>
              )
            ) : (
              !editingPOS && entry.id && (
                <button
                  type="button"
                  onClick={() => setEditingPOS(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-white/20 rounded-md text-xs text-slate-400 hover:border-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <Pencil size={10} />
                  הוסף חלק דיבר
                </button>
              )
            )}
          </div>

          {/* Source attribution */}
          {entry.source === 'AI' ? (
            <span className="text-[10px] text-amber-400/70">תרגום AI</span>
          ) : (
            <span className="text-[10px] text-slate-400">באדיבות {(entry as any).sourceName || (entry as any).contributorName || 'הקהילה'}</span>
          )}

          {/* POS edit form */}
          {editingPOS && entry.id && (
            <FieldEditForm
              entryId={entry.id}
              fieldName="partOfSpeech"
              currentValue={entry.partOfSpeech || ''}
              onClose={() => setEditingPOS(false)}
              onSuccess={() => setEditingPOS(false)}
            />
          )}

          {/* Term */}
          <h2 className="text-4xl font-bold tracking-tight">{entry.term}</h2>

          {/* Pronunciation */}
          {pronunciation ? (
            isPronunciationFromAI ? (
              <AIValueBadge
                value={pronunciation}
                entryId={entry.id}
                fieldName="pronunciationGuide"
                valueClassName="text-indigo-100 font-mono text-sm opacity-90"
                inline
              />
            ) : (
              <p className="text-indigo-100 font-mono text-sm opacity-90" dir="ltr" style={{ textAlign: 'right' }}>
                {pronunciation}
              </p>
            )
          ) : (
            <div className="max-w-xs">
              <MissingFieldPlaceholder
                fieldName="pronunciationGuide"
                entryId={entry.id}
                pendingSuggestion={pronSuggestion}
                isEnriching={enrichmentLoading}
                compact
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2 items-end shrink-0">
          <div className="flex gap-2">
            {/* Voice Selection */}
            <div className="relative group">
              <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors" title="בחר קול">
                <Settings2 size={20} />
              </button>
              <div className="absolute top-full left-0 mt-2 w-32 bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow-xl p-1 hidden group-hover:block z-20 text-slate-200 text-sm">
                <button onClick={() => setVoice('Zephyr')} className={`w-full text-right px-3 py-2 rounded-md hover:bg-white/10 ${voice === 'Zephyr' ? 'font-bold text-indigo-600' : ''}`}>קול אישה</button>
                <button onClick={() => setVoice('Fenrir')} className={`w-full text-right px-3 py-2 rounded-md hover:bg-white/10 ${voice === 'Fenrir' ? 'font-bold text-indigo-600' : ''}`}>קול גבר</button>
              </div>
            </div>

            <button
              onClick={handlePlay}
              className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors ${isPlaying ? 'animate-pulse' : ''}`}
              title="השמע מקור"
            >
              <Volume2 size={20} />
            </button>
            <button onClick={copyToClipboard} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors" title="העתק">
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardHeader;
