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

export default function FillBlank({ exercise, onAnswer, feedback, selectedOption, onPlayAudio, isPlaying }: Props) {
  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-sm text-slate-400 uppercase tracking-wide mb-6 font-bold">השלם את החסר</p>

      {exercise.audioText && onPlayAudio && (
        <button
          onClick={() => onPlayAudio(exercise.audioText!)}
          className={`p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4 ${isPlaying ? 'animate-pulse' : ''}`}
        >
          <Volume2 size={20} />
        </button>
      )}

      <div className="text-xl text-slate-200 mb-8 text-center px-4 py-4 bg-white/5 rounded-xl border border-white/10 max-w-md" dir="rtl">
        {exercise.sentence || exercise.question}
      </div>

      <div className="w-full space-y-3 max-w-md">
        {exercise.options?.map((opt, idx) => {
          let cls = 'w-full p-4 rounded-xl border-2 text-lg font-medium transition-all text-center';
          if (feedback && opt === exercise.correctAnswer) {
            cls += ' border-green-500 bg-green-900/20 text-green-300';
          } else if (feedback && opt === selectedOption && opt !== exercise.correctAnswer) {
            cls += ' border-red-500 bg-red-900/20 text-red-300';
          } else {
            cls += ' border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/40 hover:bg-white/10';
          }

          return (
            <button key={idx} onClick={() => !feedback && onAnswer(opt)} disabled={!!feedback} className={cls}>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
