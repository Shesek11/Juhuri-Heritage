import React, { useState, useEffect } from 'react';
import { Volume2, Copy, Check, Share2, Settings2, Bot, Users, Pencil, Shield, Star, Info } from 'lucide-react';
import { DictionaryEntry, PendingSuggestion } from '../../types';
import { partOfSpeechHebrew } from '../../utils/pos';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import MissingFieldPlaceholder from '../dictionary/MissingFieldPlaceholder';
import FieldEditForm from '../dictionary/FieldEditForm';
import AIValueBadge from '../dictionary/AIValueBadge';
import TransliterationGuideModal from '../dictionary/TransliterationGuideModal';

interface WordHeroProps {
  entry: DictionaryEntry;
  pendingSuggestions?: PendingSuggestion[];
  enrichmentLoading?: boolean;
  enrichedPronunciation?: string;
  enrichedPartOfSpeech?: string;
  enrichedHebrewTransliteration?: string;
}

const WordHero: React.FC<WordHeroProps> = ({
  entry,
  pendingSuggestions = [],
  enrichmentLoading = false,
  enrichedPronunciation,
  enrichedPartOfSpeech,
  enrichedHebrewTransliteration,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voice, setVoice] = useState<'Zephyr' | 'Fenrir'>('Zephyr');
  const [editingPOS, setEditingPOS] = useState(false);
  const [editingPronunciation, setEditingPronunciation] = useState(false);
  const [showTranslitGuide, setShowTranslitGuide] = useState(false);
  const [editingDialect, setEditingDialect] = useState(false);
  const [dialects, setDialects] = useState<{id: number; name: string; description?: string}[]>([]);
  const [selectedDialect, setSelectedDialect] = useState('');
  const [dialectSaving, setDialectSaving] = useState(false);

  const currentDialect = entry.translations?.[0]?.dialect || '';

  useEffect(() => {
    if (editingDialect && dialects.length === 0) {
      fetch('/api/dictionary/dialects')
        .then(r => r.json())
        .then(d => setDialects(d))
        .catch(() => {});
      setSelectedDialect(currentDialect);
    }
  }, [editingDialect]);

  const handleDialectSave = async () => {
    if (!entry.translations?.[0]?.id) return;
    setDialectSaving(true);
    try {
      const dialectId = dialects.find(d => d.name === selectedDialect)?.id || null;
      await fetch(`/api/dictionary/translations/${entry.translations[0].id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialectId: dialectId }),
      });
      setEditingDialect(false);
      window.location.reload();
    } catch {
    } finally {
      setDialectSaving(false);
    }
  };

  const handlePlay = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const text = entry.translations?.[0]?.latin || entry.translations?.[0]?.cyrillic || entry.term;
      const audioData = await generateSpeech(text);
      await playBase64Audio(audioData);
    } catch {
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

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `${entry.term} - מילון ג'והורי`,
      text: `${entry.term} — ${entry.translations?.[0]?.hebrew || ''}`,
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch { /* cancelled */ }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const pronunciation = entry.pronunciationGuide || enrichedPronunciation;
  const isPronunciationFromAI = !entry.pronunciationGuide && !!enrichedPronunciation;
  const displayPOS = entry.partOfSpeech || enrichedPartOfSpeech;
  const isPOSFromAI = !entry.partOfSpeech && !!enrichedPartOfSpeech;
  const pronSuggestion = pendingSuggestions.find(s => s.fieldName === 'pronunciationGuide');

  // Trust signals
  const verificationLabel = entry.verificationLevel === 'verified'
    ? 'מאומת'
    : entry.verificationLevel === 'community'
    ? 'קהילתי'
    : entry.verificationLevel === 'ai'
    ? 'AI'
    : null;

  const verificationColor = entry.verificationLevel === 'verified'
    ? 'text-emerald-400'
    : entry.verificationLevel === 'community'
    ? 'text-indigo-400'
    : entry.verificationLevel === 'ai'
    ? 'text-amber-400'
    : 'text-slate-300';

  return (
    <div className="p-8 bg-gradient-to-br from-white/10 to-transparent border-b border-white/10 text-white relative">
      <div className="flex flex-col gap-3">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block px-2 py-1 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">
            {entry.detectedLanguage === 'Hebrew' ? 'עברית' : "ג'והורי"}
          </span>
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
              <Check size={12} /> מאגר קהילתי
            </span>
          )}
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
                className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-white/20 rounded-md text-xs text-slate-300 hover:border-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Pencil size={10} />
                הוסף חלק דיבר
              </button>
            )
          )}
          {/* Dialect badge */}
          {currentDialect && currentDialect !== 'General' ? (
            <button
              type="button"
              onClick={() => setEditingDialect(true)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-violet-500/30 border border-violet-400/30 rounded-md text-xs font-medium text-violet-300 hover:bg-violet-500/40 transition-colors cursor-pointer"
            >
              {currentDialect}
              <Pencil size={8} />
            </button>
          ) : (
            !editingDialect && entry.id && (
              <button
                type="button"
                onClick={() => setEditingDialect(true)}
                className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-white/20 rounded-md text-xs text-slate-300 hover:border-violet-400 hover:text-violet-300 transition-colors"
              >
                <Pencil size={10} />
                הוסף ניב
              </button>
            )
          )}
        </div>

        {/* Dialect edit */}
        {editingDialect && (
          <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <select
              value={selectedDialect}
              onChange={e => setSelectedDialect(e.target.value)}
              title="בחר ניב"
              aria-label="בחר ניב"
              className="px-2 py-1 rounded bg-slate-800 border border-white/20 text-xs text-white"
            >
              <option value="">ללא ניב</option>
              {dialects.map(d => (
                <option key={d.id} value={d.name}>{d.description || d.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDialectSave}
              disabled={dialectSaving}
              className="px-2 py-1 bg-violet-600 hover:bg-violet-500 rounded text-xs text-white disabled:opacity-50"
            >
              {dialectSaving ? '...' : 'שמור'}
            </button>
            <button
              onClick={() => setEditingDialect(false)}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white"
            >
              ביטול
            </button>
          </div>
        )}

        {/* Source attribution */}
        {entry.source === 'AI' ? (
          <span className="text-xs text-amber-400/70">תרגום AI</span>
        ) : (
          <span className="text-xs text-slate-300">באדיבות {(entry as any).sourceName || (entry as any).contributorName || 'הקהילה'}</span>
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

        {/* Term - Hebrew script is primary */}
        {/^[\u0590-\u05FF]/.test(entry.term) ? (
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">{entry.term}</h1>
        ) : enrichedHebrewTransliteration ? (
          <AIValueBadge
            value={enrichedHebrewTransliteration}
            entryId={entry.id}
            fieldName="hebrewTransliteration"
            valueClassName="text-5xl md:text-6xl font-bold tracking-tight leading-tight"
          />
        ) : (
          /* Term is NOT in Hebrew — single CTA to add Hebrew transliteration */
          <div>
            {entry.id && (
              <MissingFieldPlaceholder
                fieldName="hebrewTransliteration"
                entryId={entry.id}
                isEnriching={enrichmentLoading}
                compact
              />
            )}
            {entry.term && (
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight font-serif text-slate-200 mt-2" dir="ltr">
                {entry.term}
              </h1>
            )}
          </div>
        )}

        {/* Subtitle: Latin + Cyrillic transliterations + POS */}
        <div className="flex items-center gap-3 text-base text-indigo-200 flex-wrap">
          {entry.translations?.[0]?.latin ? (
            <span className="flex items-center gap-1.5">
              <span className="text-slate-300 text-xs">תעתיק לטיני:</span>
              <span className="font-mono" dir="ltr">{entry.translations[0].latin}</span>
              <button
                type="button"
                onClick={() => setShowTranslitGuide(true)}
                className="text-indigo-400/50 hover:text-indigo-300 transition-colors"
                title="חוקי התעתיק"
              >
                <Info size={12} />
              </button>
            </span>
          ) : entry.id && (
            <MissingFieldPlaceholder fieldName="latin" entryId={entry.id} compact />
          )}
          {entry.translations?.[0]?.cyrillic && (
            <span className="flex items-center gap-1.5">
              <span className="text-slate-300 text-xs">תעתיק קירילי:</span>
              <span className="font-serif" dir="ltr">{entry.translations[0].cyrillic}</span>
            </span>
          )}
          {/* POS already shown in badges row above — no duplicate here */}
        </div>

        {/* Pronunciation */}
        {pronunciation ? (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-300 text-xs">הגייה:</span>
            {isPronunciationFromAI ? (
              <AIValueBadge
                value={pronunciation}
                entryId={entry.id}
                fieldName="pronunciationGuide"
                valueClassName="text-indigo-100 font-mono text-sm opacity-90"
                inline
              />
            ) : (
              <span className="text-indigo-100 font-mono text-sm opacity-90" dir="ltr">{pronunciation}</span>
            )}
          </div>
        ) : (
          !editingPronunciation && (
            <div className="max-w-xs">
              <MissingFieldPlaceholder
                fieldName="pronunciationGuide"
                entryId={entry.id}
                pendingSuggestion={pronSuggestion}
                isEnriching={enrichmentLoading}
                compact
              />
            </div>
          )
        )}

        {/* Pronunciation edit form */}
        {editingPronunciation && entry.id && (
          <FieldEditForm
            entryId={entry.id}
            fieldName="pronunciationGuide"
            currentValue={entry.pronunciationGuide || ''}
            onClose={() => setEditingPronunciation(false)}
            onSuccess={() => setEditingPronunciation(false)}
          />
        )}

        {/* Action buttons row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <button
            onClick={handlePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium ${isPlaying ? 'animate-pulse' : ''}`}
            title="השמע הגייה"
          >
            <Volume2 size={18} />
            <span>השמע</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
            title="שתף"
          >
            <Share2 size={18} />
            <span>שתף</span>
          </button>
        </div>

        {/* Trust signals row */}
        <div className="flex items-center gap-4 mt-1 text-sm flex-wrap">
          {typeof entry.communityScore === 'number' && entry.communityScore > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <Star size={14} fill="currentColor" />
              <span className="font-bold">{entry.communityScore}</span>
            </span>
          )}
          {verificationLabel && (
            <span className={`flex items-center gap-1 ${verificationColor}`}>
              <Shield size={14} />
              <span className="font-medium">{verificationLabel}</span>
            </span>
          )}
          {pendingSuggestions.length > 0 && (
            <span className="flex items-center gap-1 text-indigo-400">
              <Users size={14} />
              <span className="font-medium">{pendingSuggestions.length} תרומות ממתינות</span>
            </span>
          )}
        </div>

        {/* Per-field edit buttons are in MeaningSection and DialectComparison */}
      </div>
      {showTranslitGuide && <TransliterationGuideModal onClose={() => setShowTranslitGuide(false)} />}
    </div>
  );
};

export default WordHero;
