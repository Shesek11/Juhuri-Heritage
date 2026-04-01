import React, { useState, useEffect } from 'react';
import { Volume2, ArrowLeft, ArrowRight, Sun } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { DictionaryEntry } from '../../types';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import apiService from '../../services/apiService';

const LOCALE_MAP: Record<string, string> = { he: 'he-IL', en: 'en-US', ru: 'ru-RU' };

/** Primary term in the user's script */
function getPrimaryTerm(word: any, locale: string): string {
    const ds = word.dialectScripts?.[0];
    if (locale === 'ru') return ds?.cyrillicScript || ds?.latinScript || ds?.hebrewScript || '—';
    if (locale === 'en') return ds?.latinScript || ds?.cyrillicScript || ds?.hebrewScript || '—';
    return ds?.hebrewScript || word.hebrewScript || ds?.latinScript || '—';
}

/** Short meaning in the user's language */
function getMeaning(word: any, locale: string): string | undefined {
    if (locale === 'ru') return word.russianShort || word.hebrewShort;
    if (locale === 'en') return word.englishShort || word.hebrewShort;
    return word.hebrewShort;
}

/** Secondary transliteration: Latin for he/ru, Cyrillic for en */
function getSecondaryScript(word: any, locale: string): string | undefined {
    const ds = word.dialectScripts?.[0];
    if (locale === 'en') return ds?.cyrillicScript || undefined;
    return ds?.latinScript || undefined;
}

interface WordOfTheDayProps {
    onSelectWord: (term: string) => void;
}

const WordOfTheDay: React.FC<WordOfTheDayProps> = ({ onSelectWord }) => {
    const t = useTranslations('widgets');
    const locale = useLocale();
    const isRtl = locale === 'he';
    const [word, setWord] = useState<DictionaryEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const fetchWord = async () => {
            try {
                const res = await apiService.get<{ word: DictionaryEntry | null }>('/dictionary/word-of-day');
                if (res.word) setWord(res.word);
            } catch (err) {
                if (process.env.NODE_ENV === 'development') console.error("Failed to fetch word of the day", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWord();
    }, []);

    const displayWord = word || {
        hebrewScript: 'ג׳והורי',
        detectedLanguage: 'Juhuri' as const,
        hebrewShort: 'שפת יהודי ההרים',
        hebrewLong: null,
        dialectScripts: [{ dialect: 'General', hebrewScript: 'ג׳והורי', latinScript: 'Juhuri', cyrillicScript: 'Джуьгьури', pronunciationGuide: '' }],
        examples: []
    };

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) return;
        const ttsText = displayWord.dialectScripts[0]?.latinScript || displayWord.hebrewScript || displayWord.hebrewShort;
        if (!ttsText) return;
        setIsPlaying(true);
        try {
            const audioData = await generateSpeech(ttsText, 'Zephyr');
            await playBase64Audio(audioData);
        } catch (err) {
            if (process.env.NODE_ENV === 'development') console.error("TTS Failed", err);
        } finally {
            setIsPlaying(false);
        }
    };

    if (isLoading) return <div className="h-full bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl animate-pulse min-h-[16rem]" />;

    const primaryTerm = getPrimaryTerm(displayWord, locale);
    const meaning = getMeaning(displayWord, locale);
    const secondaryScript = getSecondaryScript(displayWord, locale);
    const pronunciation = displayWord.dialectScripts?.[0]?.pronunciationGuide;
    const dateStr = new Date().toLocaleDateString(LOCALE_MAP[locale] || locale);
    const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

    return (
        <div
            className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/[0.06] overflow-hidden font-rubik h-full flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 cursor-pointer"
            onClick={() => onSelectWord(displayWord.hebrewScript || displayWord.hebrewShort || primaryTerm)}
        >
            {/* Header — single line: title (date) + icon */}
            <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <Sun size={20} />
                </div>
                <h3 className="font-bold text-sm text-white">
                    {t('wordOfTheDay')} <span className="font-normal text-slate-400">({dateStr})</span>
                </h3>
            </div>

            {/* Word content — stacked: primary → meaning → secondary script → pronunciation */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-5 pb-4 gap-1">
                {/* 1. Primary term in current locale's script */}
                <h4 className="text-3xl font-bold text-white group-hover:text-amber-400 transition-colors" dir="auto">
                    {primaryTerm}
                </h4>

                {/* 2. Short meaning in current language */}
                {meaning && meaning !== primaryTerm && (
                    <p className="text-base text-slate-300 font-medium" dir="auto">{meaning}</p>
                )}

                {/* 3. Secondary script (Latin for he/ru, Cyrillic for en) */}
                {secondaryScript && secondaryScript !== primaryTerm && (
                    <p className="text-sm text-slate-400 font-mono" dir="ltr">{secondaryScript}</p>
                )}

                {/* 4. Pronunciation guide */}
                {pronunciation && (
                    <p className="text-xs text-slate-500 font-mono" dir="ltr">{pronunciation}</p>
                )}

                {/* Play button */}
                <button
                    type="button"
                    onClick={handlePlay}
                    title={t('playPronunciation')}
                    aria-label={t('playPronunciation')}
                    className={`mt-2 p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors ${isPlaying ? 'animate-pulse' : ''}`}
                >
                    <Volume2 size={20} />
                </button>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-white/[0.03] border-t border-white/[0.05] flex items-center justify-center gap-1.5">
                <span className="text-slate-300 text-xs font-medium">{t('fullCard')}</span>
                <ArrowIcon size={14} className="text-slate-300" />
            </div>
        </div>
    );
};

export default WordOfTheDay;
