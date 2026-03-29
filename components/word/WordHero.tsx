import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Volume2, Copy, Check, Share2, Bot, Users, Pencil, Shield, Star } from 'lucide-react';
import { DictionaryEntry, PendingSuggestion, DialectScript } from '../../types';
import { partOfSpeechHebrew } from '../../utils/pos';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import EditableField from '../dictionary/EditableField';
import TransliterationGuideModal from '../dictionary/TransliterationGuideModal';
import { getDialectDisplayName } from '../../utils/localeDisplay';

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
  const t = useTranslations('word');
  const tc = useTranslations('common');
  const locale = useLocale();
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

  const currentDialect = entry.dialectScripts?.[0]?.dialect || '';

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
    if (!entry.dialectScripts?.[0]?.id) return;
    setDialectSaving(true);
    try {
      const dialectId = dialects.find(d => d.name === selectedDialect)?.id || null;
      await fetch(`/api/dictionary/translations/${entry.dialectScripts[0].id}`, {
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
      const text = entry.dialectScripts?.[0]?.latinScript || entry.dialectScripts?.[0]?.cyrillicScript || entry.hebrewScript;
      const audioData = await generateSpeech(text);
      await playBase64Audio(audioData);
    } catch {
      try {
        const utterance = new SpeechSynthesisUtterance(entry.hebrewScript);
        utterance.lang = 'he-IL';
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        return;
      } catch { /* ignore */ }
    }
    setIsPlaying(false);
  };

  const copyToClipboard = () => {
    const allText = `${entry.hebrewScript}\n${entry.dialectScripts.map(t => `${t.hebrewScript} | ${t.latinScript} | ${t.cyrillicScript}`).join('\n')}`;
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: `${entry.hebrewScript} - ${t('shareTitle')}`,
      text: `${entry.hebrewScript} — ${entry.hebrewShort || ''}`,
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

  const pronSuggestion = pendingSuggestions.find(s => s.fieldName === 'pronunciationGuide');

  // Trust signals
  const verificationLabel = entry.verificationLevel === 'verified'
    ? t('verified')
    : entry.verificationLevel === 'community'
    ? t('community')
    : entry.verificationLevel === 'ai'
    ? t('ai')
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
            {entry.detectedLanguage === 'Hebrew' ? t('hebrew') : t('juhuri')}
          </span>
          {entry.source === 'AI' ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
              <Bot size={12} /> {t('aiSource')}
            </span>
          ) : entry.source === 'קהילה' ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
              <Users size={12} /> {t('communitySource')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
              <Check size={12} /> {t('communityRepo')}
            </span>
          )}
          <EditableField
            entryId={entry.id}
            fieldName="partOfSpeech"
            dbValue={entry.partOfSpeech ? partOfSpeechHebrew(entry.partOfSpeech) : undefined}
            aiValue={enrichedPartOfSpeech ? partOfSpeechHebrew(enrichedPartOfSpeech) : undefined}
            isEnriching={enrichmentLoading && !entry.partOfSpeech}
            compact
            valueClassName="text-xs font-medium"
            isEditing={editingPOS}
            onStartEdit={() => setEditingPOS(true)}
            onCloseEdit={() => setEditingPOS(false)}
          />
          {/* Dialect badge */}
          {currentDialect && currentDialect !== 'General' ? (
            <button
              type="button"
              onClick={() => setEditingDialect(true)}
              className="inline-flex items-center gap-1 px-2 py-1 bg-violet-500/30 border border-violet-400/30 rounded-md text-xs font-medium text-violet-300 hover:bg-violet-500/40 transition-colors cursor-pointer"
            >
              {getDialectDisplayName(currentDialect, locale)}
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
                {t('addDialect')}
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
              title={t('selectDialect')}
              aria-label={t('selectDialect')}
              className="px-2 py-1 rounded bg-slate-800 border border-white/20 text-xs text-white"
            >
              <option value="">{t('noDialect')}</option>
              {dialects.map(d => (
                <option key={d.id} value={d.name}>{getDialectDisplayName(d.name, locale)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDialectSave}
              disabled={dialectSaving}
              className="px-2 py-1 bg-violet-600 hover:bg-violet-500 rounded text-xs text-white disabled:opacity-50"
            >
              {dialectSaving ? '...' : tc('save')}
            </button>
            <button
              onClick={() => setEditingDialect(false)}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white"
            >
              {tc('cancel')}
            </button>
          </div>
        )}

        {/* Source attribution */}
        {entry.source === 'AI' ? (
          <span className="text-xs text-amber-400/70">{t('aiSource')}</span>
        ) : (
          <span className="text-xs text-slate-300">{t('attribution', { source: (entry as any).sourceName || (entry as any).contributorName || 'הקהילה' })}</span>
        )}

        {/* Primary term — locale's script as big heading */}
        {(() => {
          const latin = entry.dialectScripts?.[0]?.latinScript;
          const cyrillic = entry.dialectScripts?.[0]?.cyrillicScript;
          const hebrew = entry.hebrewScript;

          // Pick the primary display term based on locale
          const primaryTerm = locale === 'ru'
            ? (cyrillic || latin || hebrew)
            : locale === 'en'
            ? (latin || hebrew || cyrillic)
            : hebrew; // he default

          return (
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight" dir="auto">
              {primaryTerm}
            </h1>
          );
        })()}

        {/* Pronunciation guide — right below term */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300 text-xs">{t('pronunciation')}</span>
          <EditableField
            entryId={entry.id}
            fieldName="pronunciationGuide"
            dbValue={entry.dialectScripts?.[0]?.pronunciationGuide}
            aiValue={enrichedPronunciation}
            isEnriching={enrichmentLoading && !entry.dialectScripts?.[0]?.pronunciationGuide}
            pendingSuggestion={pronSuggestion}
            compact
            valueClassName="text-indigo-100 font-mono text-sm opacity-90"
            isEditing={editingPronunciation}
            onStartEdit={() => setEditingPronunciation(true)}
            onCloseEdit={() => setEditingPronunciation(false)}
          />
        </div>

        {/* Transliterations — ordered by locale */}
        <div className="space-y-1">
          {/* he: Latin → Cyrillic → Hebrew(skip, it's primary) */}
          {/* en: Cyrillic → Hebrew */}
          {/* ru: Latin → Hebrew */}
          {locale === 'he' && (
            <>
              <div className="flex items-center gap-1.5 text-base text-indigo-200">
                <span className="text-slate-300 text-xs">{t('latinScript')}</span>
                <EditableField entryId={entry.id} fieldName="latinScript" dbValue={entry.dialectScripts?.[0]?.latinScript || undefined} compact valueClassName="font-mono text-indigo-200" />
              </div>
              {entry.dialectScripts?.[0]?.cyrillicScript && (
                <div className="flex items-center gap-1.5 text-base text-indigo-200">
                  <span className="text-slate-300 text-xs">{t('cyrillicScript')}</span>
                  <span className="font-serif" dir="ltr">{entry.dialectScripts[0].cyrillicScript}</span>
                </div>
              )}
            </>
          )}
          {locale === 'en' && (
            <>
              {entry.dialectScripts?.[0]?.cyrillicScript && (
                <div className="flex items-center gap-1.5 text-base text-indigo-200">
                  <span className="text-slate-300 text-xs">{t('cyrillicScript')}</span>
                  <span className="font-serif" dir="ltr">{entry.dialectScripts[0].cyrillicScript}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-base text-indigo-200">
                <span className="text-slate-300 text-xs">{t('hebrewScript')}</span>
                <span dir="rtl">{entry.hebrewScript}</span>
              </div>
            </>
          )}
          {locale === 'ru' && (
            <>
              <div className="flex items-center gap-1.5 text-base text-indigo-200">
                <span className="text-slate-300 text-xs">{t('latinScript')}</span>
                <EditableField entryId={entry.id} fieldName="latinScript" dbValue={entry.dialectScripts?.[0]?.latinScript || undefined} compact valueClassName="font-mono text-indigo-200" />
              </div>
              <div className="flex items-center gap-1.5 text-base text-indigo-200">
                <span className="text-slate-300 text-xs">{t('hebrewScript')}</span>
                <span dir="rtl">{entry.hebrewScript}</span>
              </div>
            </>
          )}
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <button
            onClick={handlePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium ${isPlaying ? 'animate-pulse' : ''}`}
            title={t('playPronunciation')}
          >
            <Volume2 size={18} />
            <span>{t('play')}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
            title={t('share')}
          >
            <Share2 size={18} />
            <span>{t('share')}</span>
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
              <span className="font-medium">{pendingSuggestions.length} {t('pendingContributions')}</span>
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
