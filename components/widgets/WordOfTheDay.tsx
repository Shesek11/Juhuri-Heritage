import React, { useState, useEffect } from 'react';
import { Volume2, ArrowLeft, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DictionaryEntry } from '../../types';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import apiService from '../../services/apiService';

interface WordOfTheDayProps {
    onSelectWord: (term: string) => void;
}

const WordOfTheDay: React.FC<WordOfTheDayProps> = ({ onSelectWord }) => {
    const t = useTranslations('widgets');
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
        phonetic: 'Juhuri',
        detectedLanguage: 'Juhuri' as const,
        hebrewShort: 'שפת יהודי ההרים',
        hebrewLong: null,
        dialectScripts: [{ dialect: 'General', hebrewScript: 'ג׳והורי', latinScript: 'Juhuri', cyrillicScript: '', pronunciationGuide: '' }],
        examples: []
    };

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) return;
        // Use term, or fall back to latin transliteration, or hebrew translation
        const ttsText = displayWord.hebrewScript || displayWord.dialectScripts[0]?.latinScript || displayWord.hebrewShort;
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

    const latin = displayWord.dialectScripts[0]?.latinScript;
    const hebrew = displayWord.hebrewShort;

    return (
        <div
            className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/[0.06] overflow-hidden font-rubik h-full flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 cursor-pointer"
            onClick={() => onSelectWord(displayWord.hebrewScript)}
        >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <Sun size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-white">{t('wordOfTheDay')}</h3>
                    <span className="text-xs text-slate-300">{new Date().toLocaleDateString('he-IL')}</span>
                </div>
            </div>

            {/* Word content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-5 pb-4">
                <h4 className="text-3xl font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
                    {displayWord.hebrewScript}
                </h4>
                {latin && (
                    <p className="text-sm text-slate-300 font-mono mb-1" dir="ltr">{latin}</p>
                )}
                {displayWord.dialectScripts?.[0]?.pronunciationGuide && (
                    <p className="text-xs text-slate-300 font-mono mb-2" dir="ltr">{displayWord.dialectScripts[0].pronunciationGuide}</p>
                )}
                <div className="text-base text-slate-300 font-medium mb-3">
                    {hebrew}
                </div>
                <button
                    type="button"
                    onClick={handlePlay}
                    title={t('playPronunciation')}
                    aria-label={t('playPronunciation')}
                    className={`p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors ${isPlaying ? 'animate-pulse' : ''}`}
                >
                    <Volume2 size={20} />
                </button>
            </div>

            {/* Footer */}
            <div
                className="px-5 py-3 bg-white/[0.03] border-t border-white/[0.05] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5"
            >
                {t('fullCard')}
                <ArrowLeft size={14} />
            </div>
        </div>
    );
};

export default WordOfTheDay;
