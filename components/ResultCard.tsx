import React, { useState } from 'react';
import { DictionaryEntry } from '../types';
import { Volume2, Copy, Check, Settings2 } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioUtils';

interface ResultCardProps {
  entry: DictionaryEntry;
}

const ResultCard: React.FC<ResultCardProps> = ({ entry }) => {
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [voice, setVoice] = useState<'Zephyr' | 'Fenrir'>('Zephyr'); // Zephyr (Female-like), Fenrir (Male-like)

  const handlePlay = async (text: string, id: string) => {
    if (isPlaying) return;
    setIsPlaying(id);
    
    try {
      // First try Gemini TTS with selected voice
      const audioData = await generateSpeech(text, voice);
      await playBase64Audio(audioData);
    } catch (error) {
      console.warn("Gemini TTS failed, falling back to browser TTS", error);
      
      // Fallback to browser TTS
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Accurate language detection for fallback
        // If it contains Hebrew letters, force Hebrew voice to get correct guttural sounds (Kh/Ayin)
        const hasHebrew = /[\u0590-\u05FF]/.test(text);
        utterance.lang = hasHebrew ? 'he-IL' : 'en-US'; 
        
        // Wait for end of speech to reset state
        utterance.onend = () => {
             setIsPlaying(null);
        };
        utterance.onerror = () => {
             setIsPlaying(null);
             alert("לא ניתן להשמיע את הטקסט.");
        };
        
        window.speechSynthesis.speak(utterance);
        // Return early to rely on onend for cleanup
        return; 

      } catch (browserError) {
        console.error("Browser TTS failed", browserError);
        alert("לא ניתן להשמיע את הטקסט.");
      }
    }
    
    // Cleanup if Gemini success or sync error
    setIsPlaying(null);
  };

  const copyToClipboard = () => {
    const allText = `${entry.term}\n${entry.translations.map(t => `${t.hebrew} | ${t.latin} | ${t.cyrillic}`).join('\n')}`;
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-all font-rubik">
      {/* Header */}
      <div className="p-6 bg-gradient-to-l from-indigo-500 to-purple-600 text-white relative">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <span className="inline-block self-start px-2 py-1 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">
              {entry.detectedLanguage === 'Hebrew' ? 'עברית' : 'ג\'והורי'}
            </span>
            <h2 className="text-4xl font-bold tracking-tight">{entry.term}</h2>
            {entry.pronunciationGuide && (
              <p className="text-indigo-100 font-mono text-sm opacity-90 dir-ltr text-right">{entry.pronunciationGuide}</p>
            )}
          </div>
          
          <div className="flex flex-col gap-2 items-end">
             {/* Controls */}
             <div className="flex gap-2">
                <div className="relative group">
                    <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors" title="בחר קול">
                        <Settings2 size={20} />
                    </button>
                    {/* Voice Selector Dropdown */}
                    <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-1 hidden group-hover:block z-20 text-slate-800 dark:text-slate-200 text-sm">
                        <button 
                            onClick={() => setVoice('Zephyr')}
                            className={`w-full text-right px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${voice === 'Zephyr' ? 'font-bold text-indigo-600' : ''}`}
                        >
                            קול אישה
                        </button>
                        <button 
                            onClick={() => setVoice('Fenrir')}
                            className={`w-full text-right px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${voice === 'Fenrir' ? 'font-bold text-indigo-600' : ''}`}
                        >
                            קול גבר
                        </button>
                    </div>
                </div>

                <button
                    onClick={() => handlePlay(entry.term, 'main')}
                    className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors ${isPlaying === 'main' ? 'animate-pulse' : ''}`}
                    title="השמע מקור"
                >
                    <Volume2 size={20} />
                </button>
                <button
                    onClick={copyToClipboard}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                    title="העתק"
                >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
             </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Definitions (Hebrew) */}
        {entry.definitions.length > 0 && (
          <div className="text-slate-700 dark:text-slate-200 text-lg leading-relaxed border-b border-slate-100 dark:border-slate-700 pb-4 font-medium">
            {entry.definitions.join('; ')}
          </div>
        )}

        {/* Translations (3 Lines) */}
        <div>
          <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3">תרגומים</h3>
          <div className="grid gap-4">
            {entry.translations.map((t, idx) => (
              <div key={idx} className="relative p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors group border border-slate-100 dark:border-slate-700/50">
                <div className="absolute top-3 left-3">
                   <button
                    onClick={() => handlePlay(t.hebrew, `trans-${idx}`)} // Using Hebrew script to force correct Middle-Eastern pronunciation (Khet/Ayin)
                    className={`p-2 rounded-full text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all ${isPlaying === `trans-${idx}` ? 'text-indigo-600 opacity-100 animate-pulse' : ''}`}
                    title="השמע (הגייה מדויקת)"
                  >
                    <Volume2 size={20} />
                  </button>
                </div>
                
                <div className="flex flex-col gap-1 pr-2">
                    {/* Line 1: Hebrew Script */}
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-rubik">
                        {t.hebrew}
                    </div>
                    
                    {/* Line 2: Dialect + Latin Script */}
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-xs">
                            {t.dialect}
                        </span>
                        <span className="text-slate-600 dark:text-slate-300 font-mono tracking-wide">
                            {t.latin}
                        </span>
                    </div>

                    {/* Line 3: Cyrillic Script */}
                    <div className="text-lg text-slate-500 dark:text-slate-400 font-serif">
                        {t.cyrillic}
                    </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Examples */}
        {entry.examples.length > 0 && (
          <div>
            <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3">שימוש, פתגמים וברכות</h3>
            <div className="space-y-3">
              {entry.examples.map((ex, idx) => (
                <div key={idx} className="border-r-4 border-indigo-200 dark:border-indigo-900 pr-4 py-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{ex.origin}</p>
                     <button
                        onClick={() => handlePlay(ex.origin, `ex-orig-${idx}`)}
                        className={`text-slate-300 hover:text-indigo-500 transition-colors ${isPlaying === `ex-orig-${idx}` ? 'text-indigo-500 animate-pulse' : ''}`}
                        title="השמע"
                      >
                        <Volume2 size={16} />
                    </button>
                  </div>
                  {ex.transliteration && (
                    <p className="text-sm text-slate-500 font-mono mb-1 dir-ltr text-right">{ex.transliteration}</p>
                  )}
                  <p className="text-slate-600 dark:text-slate-400">{ex.translated}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultCard;