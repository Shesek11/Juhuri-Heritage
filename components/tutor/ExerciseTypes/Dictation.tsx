import React, { useState } from 'react';
import { Exercise } from '../../../types';
import { Volume2, Send } from 'lucide-react';

interface Props {
  exercise: Exercise;
  onAnswer: (answer: string) => void;
  feedback: 'correct' | 'incorrect' | null;
  onPlayAudio?: (text: string) => void;
  isPlaying?: boolean;
}

export default function Dictation({ exercise, onAnswer, feedback, onPlayAudio, isPlaying }: Props) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback && input.trim()) {
      onAnswer(input.trim());
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-sm text-slate-400 uppercase tracking-wide mb-6 font-bold">הקשב וכתוב</p>

      <button
        onClick={() => onPlayAudio?.(exercise.audioText!)}
        className={`p-6 rounded-full bg-amber-500/10 text-amber-500 border-2 border-amber-500/20 hover:scale-105 transition-transform mb-8 ${isPlaying ? 'animate-pulse' : ''}`}
      >
        <Volume2 size={48} />
      </button>

      <p className="text-slate-400 text-sm mb-6">לחץ על הרמקול כדי לשמוע, ואז כתוב את המילה</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="כתוב כאן..."
            disabled={!!feedback}
            autoFocus
            className="flex-1 px-4 py-3 bg-white/5 border-2 border-white/10 rounded-xl text-white text-lg text-center outline-none focus:border-amber-500/50"
            dir="rtl"
          />
          <button
            type="submit"
            disabled={!!feedback || !input.trim()}
            className="p-3 bg-amber-500 text-black rounded-xl hover:bg-amber-400 disabled:opacity-30"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}
