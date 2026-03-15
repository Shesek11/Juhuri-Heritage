import React, { useState, useCallback } from 'react';
import { Exercise, TutorWord } from '../../types';
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

    // Special handling for pair-based exercises
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

    // Play sound
    try {
      const sfx = new Audio(isCorrect
        ? 'data:audio/wav;base64,UklGRl9vT19teleXRlbXQBAAAAABAAEARKwAAESsAAABAAgAZGF0YQ=='
        : 'data:audio/wav;base64,UklGRl9vT19teleXRlbXQBAAAAABAAEARKwAAESsAAABAAgAZGF0YQ=='
      );
      sfx.volume = 0.15;
      sfx.play().catch(() => {});
    } catch {}

    // SRS update if applicable
    if (onSrsUpdate && ex.audioText) {
      // We'll pass the correct/incorrect status - the parent handles the API call
    }
  }, [feedback, currentIndex, exercises, onSrsUpdate]);

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
    const accuracy = exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 0;
    return null; // Parent handles the celebration screen
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
    <div className="flex flex-col h-[650px] bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden font-rubik relative">
      {/* Header */}
      <div className="p-4 bg-white/5 border-b border-white/10 flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-sm text-slate-400 font-medium min-w-[40px] text-left">
          {currentIndex + 1}/{exercises.length}
        </span>
      </div>

      {/* Exercise Content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center max-w-lg mx-auto w-full">
        {renderExercise()}
      </div>

      {/* Feedback Bar */}
      {feedback && (
        <div className={`p-4 ${feedback === 'correct' ? 'bg-green-900/40 border-t-green-500' : 'bg-red-900/40 border-t-red-500'} border-t-4 animate-in slide-in-from-bottom duration-300`}>
          <div className="flex justify-between items-center max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${feedback === 'correct' ? 'bg-green-800 text-green-300' : 'bg-red-800 text-red-300'}`}>
                {feedback === 'correct' ? <CheckCircle size={24} /> : <XCircle size={24} />}
              </div>
              <div>
                <p className={`font-bold text-lg ${feedback === 'correct' ? 'text-green-200' : 'text-red-200'}`}>
                  {feedback === 'correct' ? 'מצוין!' : 'לא נורא...'}
                </p>
                {feedback === 'incorrect' && currentExercise.correctAnswer && currentExercise.type !== 'matching_pairs' && currentExercise.type !== 'speed_match' && (
                  <p className="text-sm text-red-300">התשובה: {currentExercise.correctAnswer}</p>
                )}
                {currentExercise.explanation && (
                  <p className="text-xs text-slate-400 mt-1">{currentExercise.explanation}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleNext}
              className={`px-6 py-2.5 rounded-lg font-bold text-white shadow-md transition-transform hover:scale-105 ${
                feedback === 'correct' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              המשך
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonEngine;
