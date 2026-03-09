import React, { useState, useEffect } from 'react';
import { Volume2, ArrowLeft } from 'lucide-react';
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
                // Fetch word of the day from dedicated endpoint (deterministic per date)
                const res = await apiService.get<{ word: DictionaryEntry | null }>('/dictionary/word-of-day');

                if (res.word) {
                    setWord(res.word);
                }
            } catch (err) {
                console.error("Failed to fetch word of the day", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWord();
    }, []);

    // Fallback if fetch failed or no word
    const displayWord = word || {
        term: 'ג׳והורי',
        phonetic: 'Juhuri',
        pronunciationGuide: 'Joo-hoo-ree',
        translations: [{ hebrew: 'שפת יהודי ההרים', english: 'Mountain Jewish Language' }],
        category: 'General',
        variations: [],
        relatedTerms: [],
        examples: []
    };

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click
        if (isPlaying) return;

        setIsPlaying(true);
        try {
            const audioData = await generateSpeech(displayWord.term, 'Zephyr');
            await playBase64Audio(audioData);
        } catch (err) {
            console.error("TTS Failed", err);
        } finally {
            setIsPlaying(false);
        }
    };

    if (isLoading) return <div className="h-full bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl animate-pulse min-h-[16rem]" />;



    return (
        <div
            className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer"
            onClick={() => onSelectWord(displayWord.term)}
        >
            <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="absolute top-4 left-4 text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/80">
                    {new Date().toLocaleDateString('he-IL')}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-white">
                    <span className="text-2xl drop-shadow-md">☀️</span>
                </div>
                <h3 className="font-bold text-lg text-white">המילה היומית</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">למד מילה ביום</p>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-4">
                <div className="space-y-1">
                    <h4 className="text-4xl font-bold text-slate-100 group-hover:text-amber-600 transition-colors">
                        {displayWord.term}
                    </h4>
                    <p className="text-sm text-slate-400 font-mono">{displayWord.pronunciationGuide}</p>
                </div>

                <div className="text-lg text-slate-600 dark:text-slate-300 font-medium">
                    {displayWord.translations[0]?.hebrew}
                </div>

                <div className="pt-2">
                    <button
                        onClick={handlePlay}
                        className={`p-3 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors ${isPlaying ? 'animate-pulse' : ''}`}
                    >
                        <Volume2 size={24} />
                    </button>
                </div>
            </div>

            <button
                // onClick removed from here because the parent div handles it, preventing double trigger or bubbling issues
                className="w-full pt-3 pb-8 bg-white/5 text-slate-500 dark:text-slate-400 text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 border-t border-white/10 mt-auto"
            >
                לכרטיס המלא
                <ArrowLeft size={16} />
            </button>
        </div>
    );
};

export default WordOfTheDay;
