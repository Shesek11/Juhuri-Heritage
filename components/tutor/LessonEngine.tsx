import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Exercise } from '../../types';
import { generateSpeech } from '../../services/geminiService';
import { playBase64Audio } from '../../utils/audioUtils';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

// Exercise Components
import MultipleChoice from './ExerciseTypes/MultipleChoice';
import MatchingPairs from './ExerciseTypes/MatchingPairs';
import WordBank from './ExerciseTypes/WordBank';
import FillBlank from './ExerciseTypes/FillBlank';
import SpellingChallenge from './ExerciseTypes/SpellingChallenge';
import Dictation from './ExerciseTypes/Dictation';
import TrueFalseFlash from './ExerciseTypes/TrueFalseFlash';
import SpeedMatch from './ExerciseTypes/SpeedMatch';

interface LessonEngineProps {
  exercises: Exercise[];
  unitTitle: string;
  onComplete: (score: number, accuracy: number, wordsLearned: number) => void;
  onBack: () => void;
  onSrsUpdate?: (entryId: number, isCorrect: boolean) => void;
}

const LessonEngine: React.FC<LessonEngineProps> = ({ exercises, unitTitle, onComplete, onBack, onSrsUpdate }) => {
  const t = useTranslations('tutor');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const currentExercise = exercises[currentIndex];
  const progress = exercises.length > 0 ? ((currentIndex + 1) / exercises.length) * 100 : 0;

  const handlePlayAudio = useCallback(async (text: string) => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const audio = await generateSpeech(text, 'Fenrir');
      await playBase64Audio(audio);
    } catch (e) {
      console.error('Audio error:', e);
    } finally {
      setIsPlaying(false);
    }
  }, [isPlaying]);

  const handleAnswer = useCallback((answer: string) => {
    if (feedback) return;

    const ex = exercises[currentIndex];
    let isCorrect = false;

    if (ex.type === 'matching_pairs' || ex.type === 'speed_match') {
      isCorrect = answer === 'correct';
    } else if (ex.type === 'true_false_flash') {
      isCorrect = answer === ex.correctAnswer;
    } else {
      isCorrect = answer.trim().toLowerCase() === ex.correctAnswer.trim().toLowerCase();
    }

    setSelectedOption(answer);
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
      setScore(prev => prev + 10);
      setCorrectCount(prev => prev + 1);
    }

    try {
      const sfx = new Audio(isCorrect
        ? 'data:audio/wav;base64,UklGRl9vT19teleXRlbXQBAAAAABAAEARKwAAESsAAABAAgAZGF0YQ=='
        : 'data:audio/wav;base64,UklGRl9vT19teleXRlbXQBAAAAABAAEARKwAAESsAAABAAgAZGF0YQ=='
      );
      sfx.volume = 0.15;
      sfx.play().catch(() => {});
    } catch {}
  }, [feedback, currentIndex, exercises]);

  const handleNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setFeedback(null);
    } else {
      setIsFinished(true);
      const accuracy = exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 0;
      setTimeout(() => onComplete(score, accuracy, exercises.length), 100);
    }
  }, [currentIndex, exercises.length, correctCount, score, onComplete]);

  if (isFinished || !currentExercise) {
    return null;
  }

  const renderExercise = () => {
    const commonProps = {
      exercise: currentExercise,
      onAnswer: handleAnswer,
      feedback,
      selectedOption,
      onPlayAudio: handlePlayAudio,
      isPlaying,
    };

    switch (currentExercise.type) {
      case 'multiple_choice':
      case 'audio_recognition':
      case 'context_association':
      case 'listen_select':
        return <MultipleChoice {...commonProps} />;
      case 'matching_pairs':
        return <MatchingPairs exercise={currentExercise} onAnswer={handleAnswer} feedback={feedback} />;
      case 'word_bank_he_to_ju':
      case 'word_bank_ju_to_he':
        return <WordBank {...commonProps} />;
      case 'fill_blank':
        return <FillBlank {...commonProps} />;
      case 'spelling_challenge':
        return <SpellingChallenge {...commonProps} />;
      case 'dictation':
        return <Dictation {...commonProps} />;
      case 'true_false_flash':
        return <TrueFalseFlash {...commonProps} />;
      case 'speed_match':
        return <SpeedMatch exercise={currentExercise} onAnswer={handleAnswer} feedback={feedback} />;
      default:
        return <MultipleChoice {...commonProps} />;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-152px)] md:h-[calc(100dvh-104px)]">
      {/* ===== Top bar with progress (non-scrolling) ===== */}
      <div className="shrink-0 bg-[#050B14]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center gap-4">
          <button type="button" onClick={onBack} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors shrink-0" title="חזרה" aria-label="חזרה">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="h-3 sm:h-3.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <span className="text-sm text-slate-400 font-bold min-w-[44px] text-end tabular-nums">
            {currentIndex + 1}/{exercises.length}
          </span>
        </div>
      </div>

      {/* ===== Exercise Content — scrollable middle area ===== */}
      <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 lg:py-16">
        <div className="w-full max-w-xl lg:max-w-2xl">
          {renderExercise()}
        </div>
      </div>

      {/* ===== Feedback Bar — non-scrolling bottom ===== */}
      {feedback && (
        <div className={`shrink-0 ${feedback === 'correct' ? 'bg-green-900/70' : 'bg-red-900/70'} backdrop-blur-xl border-t-4 ${feedback === 'correct' ? 'border-t-green-500' : 'border-t-red-500'}`}>
          <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-full shrink-0 ${feedback === 'correct' ? 'bg-green-800 text-green-300' : 'bg-red-800 text-red-300'}`}>
                {feedback === 'correct' ? <CheckCircle size={24} /> : <XCircle size={24} />}
              </div>
              <div>
                <p className={`font-bold text-lg ${feedback === 'correct' ? 'text-green-200' : 'text-red-200'}`}>
                  {feedback === 'correct' ? t('excellent') : t('notBad')}
                </p>
                {feedback === 'incorrect' && currentExercise.correctAnswer && currentExercise.type !== 'matching_pairs' && currentExercise.type !== 'speed_match' && (
                  <p className="text-sm text-red-300/80">התשובה: {currentExercise.correctAnswer}</p>
                )}
                {currentExercise.explanation && (
                  <p className="text-xs text-slate-400 mt-0.5">{currentExercise.explanation}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleNext}
              className={`w-full sm:w-auto px-10 py-3 rounded-xl font-bold text-white shadow-md transition-transform hover:scale-105 text-base ${
                feedback === 'correct' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {t('continue')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonEngine;
