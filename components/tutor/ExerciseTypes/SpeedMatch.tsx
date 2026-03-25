import React, { useState, useEffect, useCallback } from 'react';
import { Exercise } from '../../../types';
import { Timer } from 'lucide-react';

interface Props {
  exercise: Exercise;
  onAnswer: (answer: string) => void;
  feedback: 'correct' | 'incorrect' | null;
}

export default function SpeedMatch({ exercise, onAnswer, feedback }: Props) {
  const pairs = exercise.pairs || [];
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(30);
  const [shuffledTerms, setShuffledTerms] = useState<string[]>([]);
  const [shuffledTranslations, setShuffledTranslations] = useState<string[]>([]);

  useEffect(() => {
    setShuffledTerms([...pairs.map(p => p.term)].sort(() => Math.random() - 0.5));
    setShuffledTranslations([...pairs.map(p => p.translation)].sort(() => Math.random() - 0.5));
  }, [exercise.id]);

  useEffect(() => {
    if (feedback) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onAnswer('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [feedback]);

  const handleTermClick = (term: string) => {
    if (feedback || matched.has(term)) return;
    setSelectedTerm(term);
  };

  const handleTranslationClick = (translation: string) => {
    if (feedback || !selectedTerm || matched.has(translation)) return;

    const pair = pairs.find(p => p.term === selectedTerm);
    if (pair && pair.translation === translation) {
      const newMatched = new Set(matched);
      newMatched.add(selectedTerm);
      newMatched.add(translation);
      setMatched(newMatched);
      setSelectedTerm(null);

      if (newMatched.size === pairs.length * 2) {
        onAnswer('correct');
      }
    } else {
      setSelectedTerm(null);
    }
  };

  const timerColor = timeLeft > 15 ? 'text-green-400' : timeLeft > 5 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex items-center gap-2 mb-6">
        <Timer size={20} className={timerColor} />
        <span className={`text-2xl font-bold ${timerColor}`}>{timeLeft}s</span>
      </div>

      <p className="text-sm text-slate-400 uppercase tracking-wide mb-4 font-bold">חבר במהירות!</p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
        <div className="space-y-2">
          {shuffledTerms.map((term, i) => (
            <button
              key={`t-${i}`}
              onClick={() => handleTermClick(term)}
              disabled={matched.has(term)}
              className={`w-full p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                matched.has(term)
                  ? 'border-green-500/20 bg-green-900/10 text-green-400/40 scale-95'
                  : selectedTerm === term
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/30'
              }`}
            >
              {term}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {shuffledTranslations.map((tr, i) => (
            <button
              key={`tr-${i}`}
              onClick={() => handleTranslationClick(tr)}
              disabled={matched.has(tr)}
              className={`w-full p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                matched.has(tr)
                  ? 'border-green-500/20 bg-green-900/10 text-green-400/40 scale-95'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/30'
              }`}
            >
              {tr}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4">{matched.size / 2} / {pairs.length}</p>
    </div>
  );
}
