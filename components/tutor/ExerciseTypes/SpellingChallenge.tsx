import React, { useState } from 'react';
import { Exercise } from '../../../types';
import { Volume2, RotateCcw } from 'lucide-react';

interface Props {
  exercise: Exercise;
  onAnswer: (answer: string) => void;
  feedback: 'correct' | 'incorrect' | null;
  onPlayAudio?: (text: string) => void;
  isPlaying?: boolean;
}

export default function SpellingChallenge({ exercise, onAnswer, feedback, onPlayAudio, isPlaying }: Props) {
  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const tiles = exercise.tiles || [];

  const builtWord = selectedOrder.map(i => tiles[i]).join('');

  const handleTileClick = (idx: number) => {
    if (feedback || selectedOrder.includes(idx)) return;
    const newOrder = [...selectedOrder, idx];
    setSelectedOrder(newOrder);

    const word = newOrder.map(i => tiles[i]).join('');
    if (word.length >= exercise.correctAnswer.length) {
      onAnswer(word);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-sm text-slate-400 uppercase tracking-wide mb-4 font-bold">סדר את האותיות</p>

      <div className="flex items-center gap-3 mb-4">
        {exercise.audioText && onPlayAudio && (
          <button
            onClick={() => onPlayAudio(exercise.audioText!)}
            className={`p-2 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 ${isPlaying ? 'animate-pulse' : ''}`}
          >
            <Volume2 size={20} />
          </button>
        )}
      </div>

      <h2 className="text-2xl font-bold text-slate-100 text-center mb-6">{exercise.question}</h2>

      {/* Built word */}
      <div className="min-h-[56px] px-6 py-3 mb-6 border-b-2 border-amber-500/30 flex items-center gap-1 min-w-[200px] justify-center">
        {selectedOrder.length === 0 ? (
          <span className="text-slate-400 text-lg">...</span>
        ) : (
          selectedOrder.map((tileIdx, pos) => (
            <span key={pos} className="px-3 py-2 bg-amber-500/20 text-amber-300 rounded-lg text-xl font-bold border border-amber-500/30">
              {tiles[tileIdx]}
            </span>
          ))
        )}
      </div>

      {/* Available letters */}
      <div className="flex flex-wrap gap-2 justify-center">
        {tiles.map((letter, idx) => (
          <button
            key={idx}
            onClick={() => handleTileClick(idx)}
            disabled={!!feedback || selectedOrder.includes(idx)}
            className={`w-12 h-12 rounded-xl text-xl font-bold border-2 transition-all flex items-center justify-center ${
              selectedOrder.includes(idx)
                ? 'opacity-20 border-white/5'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/40 hover:scale-110'
            }`}
          >
            {letter}
          </button>
        ))}
      </div>

      {selectedOrder.length > 0 && !feedback && (
        <button
          onClick={() => setSelectedOrder([])}
          className="mt-4 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200"
        >
          <RotateCcw size={14} /> נקה
        </button>
      )}
    </div>
  );
}
