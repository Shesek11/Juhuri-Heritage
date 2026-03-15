import React from 'react';
import { Exercise } from '../../../types';
import { Volume2 } from 'lucide-react';

interface Props {
  exercise: Exercise;
  onAnswer: (answer: string) => void;
  feedback: 'correct' | 'incorrect' | null;
  selectedOption: string | null;
  onPlayAudio?: (text: string) => void;
  isPlaying?: boolean;
}

export default function MultipleChoice({ exercise, onAnswer, feedback, selectedOption, onPlayAudio, isPlaying }: Props) {
  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-sm text-slate-400 uppercase tracking-wide mb-6 font-bold">בחר את התרגום הנכון</p>

      <div className="flex items-center gap-3 mb-6">
        {exercise.audioText && onPlayAudio && (
          <button
            onClick={() => onPlayAudio(exercise.audioText!)}
            className={`p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:scale-105 transition-transform ${isPlaying ? 'animate-pulse' : ''}`}
          >
            <Volume2 size={28} />
          </button>
        )}
      </div>

      <h2 className="text-3xl font-bold text-slate-100 text-center mb-8">{exercise.question}</h2>

      <div className="w-full space-y-3 max-w-md">
        {exercise.options?.map((opt, idx) => {
          let cls = 'w-full p-4 rounded-xl border-2 text-lg font-medium transition-all text-right';
          if (feedback && opt === exercise.correctAnswer) {
            cls += ' border-green-500 bg-green-900/20 text-green-300';
          } else if (feedback && opt === selectedOption && opt !== exercise.correctAnswer) {
            cls += ' border-red-500 bg-red-900/20 text-red-300';
          } else {
            cls += ' border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/40 hover:bg-white/10';
          }

          return (
            <button
              key={idx}
              onClick={() => !feedback && onAnswer(opt)}
              disabled={!!feedback}
              className={cls}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
