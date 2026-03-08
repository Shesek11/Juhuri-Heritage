
import React, { useState, useEffect } from 'react';
import { Exercise, LessonUnit } from '../types';
import { generateLessonExercises, generateSpeech } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioUtils';
import { ArrowLeft, Volume2, CheckCircle, XCircle, Sparkles, Trophy, RotateCcw, HelpCircle } from 'lucide-react';

interface LessonViewProps {
  unit: LessonUnit;
  dialect: string;
  level: string;
  onComplete: (score: number) => void;
  onBack: () => void;
}

const LessonView: React.FC<LessonViewProps> = ({ unit, dialect, level, onComplete, onBack }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [isFinished, setIsFinished] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadExercises();
  }, [unit]);

  const loadExercises = async () => {
    setLoading(true);
    try {
      const data = await generateLessonExercises(unit.title, dialect, level);
      setExercises(data);
    } catch (e) {
      console.error(e);
      alert("אירעה שגיאה בטעינת השיעור");
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (text: string) => {
    if (isPlaying || !text) return;
    setIsPlaying(true);
    try {
      const audio = await generateSpeech(text, 'Fenrir');
      await playBase64Audio(audio);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlaying(false);
    }
  };

  const checkAnswer = (answer: string) => {
    const currentEx = exercises[currentIndex];
    const isCorrect = answer.trim().toLowerCase() === currentEx.correctAnswer.trim().toLowerCase();
    
    setSelectedOption(answer);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
        setScore(prev => prev + 10);
        const successAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); // Simple ping
        successAudio.volume = 0.2;
        successAudio.play().catch(() => {});
    } else {
        setLives(prev => prev - 1);
        const failAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3'); // Simple thud
        failAudio.volume = 0.2;
        failAudio.play().catch(() => {});
    }
  };

  const nextExercise = () => {
    if (lives === 0) {
        setIsFinished(true);
        return;
    }
    if (currentIndex < exercises.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
        setFeedback(null);
    } else {
        setIsFinished(true);
        setTimeout(() => onComplete(score), 2000);
    }
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
            <Sparkles className="text-indigo-500 animate-pulse mb-4" size={48} />
            <h3 className="text-xl font-bold mb-2">סבא מרדכי מכין את השיעור...</h3>
            <p className="text-slate-500">מכין תרגילים בנושא: {unit.title}</p>
        </div>
    );
  }

  if (isFinished) {
      const passed = lives > 0;
      return (
        <div className="flex flex-col items-center justify-center h-[500px] text-center p-8 bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl animate-in zoom-in">
             <div className={`p-6 rounded-full mb-6 ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                 {passed ? <Trophy size={64} /> : <XCircle size={64} />}
             </div>
             <h2 className="text-3xl font-bold mb-2">{passed ? 'כל הכבוד!' : 'לא נורא, נסה שוב!'}</h2>
             <p className="text-slate-500 mb-6 text-lg">
                 {passed ? `סיימת את היחידה עם ${score} נקודות.` : 'נגמרו לך הלבבות. נסה שוב כדי להתקדם.'}
             </p>
             <button onClick={onBack} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform">
                 {passed ? 'חזרה למפה' : 'נסה שוב'}
             </button>
        </div>
      )
  }

  const currentEx = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;

  return (
    <div className="flex flex-col h-[600px] bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden font-rubik relative">
        {/* Header */}
        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <button onClick={onBack} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><ArrowLeft size={20} /></button>
            <div className="flex-1 mx-4">
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
            <div className="flex items-center gap-1 text-red-500 font-bold">
                <div className="w-24 flex justify-end gap-1">
                    {[...Array(3)].map((_, i) => (
                        <span key={i} className={i < lives ? "opacity-100" : "opacity-20 text-slate-400"}>❤️</span>
                    ))}
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center max-w-lg mx-auto w-full">
            <h3 className="text-sm text-slate-500 uppercase tracking-wide mb-8 font-bold text-center">
                {currentEx.type === 'multiple_choice' ? 'בחר את התשובה הנכונה' : 
                 currentEx.type === 'translate_he_to_ju' ? 'תרגם לג\'והורי' : 
                 currentEx.type === 'flashcard' ? 'זכור את המילה' : 'תרגם לעברית'}
            </h3>

            {/* Question Card */}
            <div className="w-full flex flex-col items-center mb-8">
                 <div className="flex items-center gap-3 mb-4">
                    {currentEx.audioText && (
                        <button 
                            onClick={() => handlePlayAudio(currentEx.audioText!)}
                            className={`p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-transform ${isPlaying ? 'animate-pulse' : ''}`}
                        >
                            <Volume2 size={32} />
                        </button>
                    )}
                 </div>
                 <h2 className="text-3xl font-bold text-slate-100 text-center leading-tight">
                     {currentEx.question}
                 </h2>
            </div>

            {/* Options / Input */}
            <div className="w-full space-y-3">
                {currentEx.options ? (
                    currentEx.options.map((opt, idx) => {
                        let btnClass = "w-full p-4 rounded-xl border-2 text-lg font-medium transition-all hover:bg-slate-50 dark:hover:bg-slate-700";
                        
                        if (feedback && opt === currentEx.correctAnswer) {
                            btnClass = "w-full p-4 rounded-xl border-2 border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300";
                        } else if (feedback && opt === selectedOption && opt !== currentEx.correctAnswer) {
                            btnClass = "w-full p-4 rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300";
                        } else {
                            btnClass = "w-full p-4 rounded-xl border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-slate-700 dark:text-slate-200 hover:border-indigo-400";
                        }

                        return (
                            <button 
                                key={idx}
                                onClick={() => !feedback && checkAnswer(opt)}
                                disabled={!!feedback}
                                className={btnClass}
                            >
                                {opt}
                            </button>
                        );
                    })
                ) : (
                    /* For simplicity in this iteration, treating non-multiple choice as "Reveal" style for Flashcards or self-check */
                    <div className="text-center">
                        {!feedback ? (
                            <button 
                                onClick={() => checkAnswer(currentEx.correctAnswer)} // Auto-correct for flashcards
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30"
                            >
                                הצג תשובה
                            </button>
                        ) : (
                            <div className="animate-in fade-in zoom-in">
                                <p className="text-xl font-bold text-green-600 mb-2">{currentEx.correctAnswer}</p>
                                <p className="text-sm text-slate-500">{currentEx.explanation}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* Footer Feedback */}
        {feedback && (
            <div className={`p-4 ${feedback === 'correct' ? 'bg-green-100 dark:bg-green-900/30 border-t-green-500' : 'bg-red-100 dark:bg-red-900/30 border-t-red-500'} border-t-4 animate-in slide-in-from-bottom duration-300 absolute bottom-0 w-full`}>
                <div className="flex justify-between items-center max-w-lg mx-auto">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${feedback === 'correct' ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'}`}>
                            {feedback === 'correct' ? <CheckCircle size={24} /> : <XCircle size={24} />}
                        </div>
                        <div>
                            <p className={`font-bold text-lg ${feedback === 'correct' ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                                {feedback === 'correct' ? 'מצוין!' : 'לא נורא...'}
                            </p>
                            {feedback === 'incorrect' && (
                                <p className="text-sm text-red-700 dark:text-red-300">התשובה הנכונה: {currentEx.correctAnswer}</p>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={nextExercise}
                        className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-md transition-transform hover:scale-105 ${feedback === 'correct' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                    >
                        המשך
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};

export default LessonView;
