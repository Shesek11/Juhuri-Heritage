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

export default function WordBank({ exercise, onAnswer, feedback, onPlayAudio, isPlaying }: Props) {
  const [selectedTiles, setSelectedTiles] = useState<number[]>([]);
  const tiles = exercise.tiles || [];

  const builtWord = selectedTiles.map(i => tiles[i]).join('');

  const handleTileClick = (idx: number) => {
    if (feedback || selectedTiles.includes(idx)) return;
    const newSelected = [...selectedTiles, idx];
    setSelectedTiles(newSelected);

    const word = newSelected.map(i => tiles[i]).join('');
    if (word.length >= exercise.correctAnswer.length) {
      onAnswer(word);
    }
  };

  const handleRemoveTile = (position: number) => {
    if (feedback) return;
    setSelectedTiles(prev => prev.filter((_, i) => i !== position));
  };

  const handleReset = () => {
    if (feedback) return;
    setSelectedTiles([]);
  };

  const isHeToJu = exercise.type === 'word_bank_he_to_ju';

  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-sm text-slate-400 uppercase tracking-wide mb-4 font-bold">
        {isHeToJu ? 'בנה את המילה בג\'והורי' : 'בנה את התרגום בעברית'}
      </p>

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

      {/* Built word display */}
      <div className="min-h-[56px] px-6 py-3 mb-6 border-b-2 border-amber-500/30 flex items-center gap-1 min-w-[200px] justify-center">
        {selectedTiles.length === 0 ? (
          <span className="text-slate-400 text-lg">...</span>
        ) : (
          selectedTiles.map((tileIdx, pos) => (
            <button
              key={pos}
              onClick={() => handleRemoveTile(pos)}
              className="px-3 py-2 bg-amber-500/20 text-amber-300 rounded-lg text-xl font-bold border border-amber-500/30 hover:bg-red-500/20 hover:border-red-500/30 transition-colors"
            >
              {tiles[tileIdx]}
            </button>
          ))
        )}
        {selectedTiles.length > 0 && !feedback && (
          <button onClick={handleReset} className="ms-2 p-1 text-slate-400 hover:text-slate-300">
            <RotateCcw size={16} />
          </button>
        )}
      </div>

      {/* Available tiles */}
      <div className="flex flex-wrap gap-2 justify-center max-w-md">
        {tiles.map((tile, idx) => (
          <button
            key={idx}
            onClick={() => handleTileClick(idx)}
            disabled={!!feedback || selectedTiles.includes(idx)}
            className={`px-4 py-3 rounded-xl text-xl font-bold border-2 transition-all ${
              selectedTiles.includes(idx)
                ? 'opacity-20 border-white/5 bg-white/5 text-slate-600'
                : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/40 hover:bg-white/10 hover:scale-105'
            }`}
          >
            {tile}
          </button>
        ))}
      </div>
    </div>
  );
}
