import React, { useState, useEffect } from 'react';
import { Volume2, ArrowLeft, Sun } from 'lucide-react';
import { DictionaryEntry } from '../../types';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import apiService from '../../services/apiService';

interface WordOfTheDayProps {
    onSelectWord: (term: string) => void;
}

const WordOfTheDay: React.FC<WordOfTheDayProps> = ({ onSelectWord }) => {
    const [word, setWord] = useState<DictionaryEntry | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        const fetchWord = async () => {
            try {
                const res = await apiService.get<{ word: DictionaryEntry | null }>('/dictionary/word-of-day');
                if (res.word) setWord(res.word);
            } catch (err) {
                console.error("Failed to fetch word of the day", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchWord();
    }, []);

    const displayWord = word || {
        term: 'ג׳והורי',
        phonetic: 'Juhuri',
        pronunciationGuide: 'Joo-hoo-ree',
        translations: [{ hebrew: 'שפת יהודי ההרים', latin: 'Juhuri' }],
        category: 'General',
        variations: [],
        relatedTerms: [],
        examples: []
    };

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) return;
        // Use term, or fall back to latin transliteration, or hebrew translation
        const ttsText = displayWord.term || displayWord.translations[0]?.latin || displayWord.translations[0]?.hebrew;
        if (!ttsText) return;
        setIsPlaying(true);
        try {
            const audioData = await generateSpeech(ttsText, 'Zephyr');
            await playBase64Audio(audioData);
        } catch (err) {
            console.error("TTS Failed", err);
        } finally {
            setIsPlaying(false);
        }
    };

    if (isLoading) return <div className="h-full bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl animate-pulse min-h-[16rem]" />;

    const latin = displayWord.translations[0]?.latin;
    const hebrew = displayWord.translations[0]?.hebrew;

    return (
        <div
            className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/[0.06] overflow-hidden font-rubik h-full flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 cursor-pointer"
            onClick={() => onSelectWord(displayWord.term)}
        >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <Sun size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-white">המילה היומית</h3>
                    <span className="text-[0.6rem] text-slate-500">{new Date().toLocaleDateString('he-IL')}</span>
                </div>
            </div>

            {/* Word content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-5 pb-4">
                <h4 className="text-3xl font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
                    {displayWord.term}
                </h4>
                {latin && (
                    <p className="text-sm text-slate-400 font-mono mb-1" dir="ltr">{latin}</p>
                )}
                {displayWord.pronunciationGuide && (
                    <p className="text-xs text-slate-500 font-mono mb-2" dir="ltr">{displayWord.pronunciationGuide}</p>
                )}
                <div className="text-base text-slate-300 font-medium mb-3">
                    {hebrew}
                </div>
                <button
                    type="button"
                    onClick={handlePlay}
                    title="השמע הגייה"
                    className={`p-2.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-colors ${isPlaying ? 'animate-pulse' : ''}`}
                >
                    <Volume2 size={20} />
                </button>
            </div>

            {/* Footer */}
            <div
                className="px-5 py-3 bg-white/[0.03] border-t border-white/[0.05] text-slate-500 text-xs font-medium flex items-center justify-center gap-1.5"
            >
                לכרטיס המלא
                <ArrowLeft size={14} />
            </div>
        </div>
    );
};

export default WordOfTheDay;
