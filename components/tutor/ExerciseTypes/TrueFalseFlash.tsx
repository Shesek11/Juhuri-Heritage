import React from 'react';
import { Exercise } from '../../../types';
import { Check, X, Volume2 } from 'lucide-react';

interface Props {
  exercise: Exercise;
  onAnswer: (answer: string) => void;
  feedback: 'correct' | 'incorrect' | null;
  onPlayAudio?: (text: string) => void;
  isPlaying?: boolean;
}

export default function TrueFalseFlash({ exercise, onAnswer, feedback, onPlayAudio, isPlaying }: Props) {
  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-sm text-slate-400 uppercase tracking-wide mb-6 font-bold">נכון או לא?</p>

      {exercise.audioText && onPlayAudio && (
        <button
          onClick={() => onPlayAudio(exercise.audioText!)}
          className={`p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4 ${isPlaying ? 'animate-pulse' : ''}`}
        >
          <Volume2 size={20} />
        </button>
      )}

      <div className="text-3xl font-bold text-slate-100 text-center mb-12 px-6 py-8 bg-white/5 rounded-2xl border border-white/10 max-w-md w-full">
        {exercise.question}
      </div>

      <div className="flex gap-6">
        <button
          onClick={() => !feedback && onAnswer('true')}
          disabled={!!feedback}
          className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-4 transition-all hover:scale-110 ${
            feedback && exercise.correctAnswer === 'true'
              ? 'border-green-500 bg-green-900/30 text-green-400'
              : feedback && exercise.correctAnswer === 'false'
                ? 'border-white/10 opacity-30'
                : 'border-green-500/30 bg-green-900/10 text-green-400 hover:border-green-500'
          }`}
        >
          <Check size={40} />
        </button>

        <button
          onClick={() => !feedback && onAnswer('false')}
          disabled={!!feedback}
          className={`w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold border-4 transition-all hover:scale-110 ${
            feedback && exercise.correctAnswer === 'false'
              ? 'border-red-500 bg-red-900/30 text-red-400'
              : feedback && exercise.correctAnswer === 'true'
                ? 'border-white/10 opacity-30'
                : 'border-red-500/30 bg-red-900/10 text-red-400 hover:border-red-500'
          }`}
        >
          <X size={40} />
        </button>
      </div>
    </div>
  );
}
