import React, { useState, useEffect } from 'react';
import { Exercise } from '../../../types';

interface Props {
  exercise: Exercise;
  onAnswer: (answer: string) => void;
  feedback: 'correct' | 'incorrect' | null;
}

export default function MatchingPairs({ exercise, onAnswer, feedback }: Props) {
  const pairs = exercise.pairs || [];
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<string | null>(null);
  const [shuffledTranslations, setShuffledTranslations] = useState<string[]>([]);

  useEffect(() => {
    setShuffledTranslations(
      [...pairs.map(p => p.translation)].sort(() => Math.random() - 0.5)
    );
  }, [exercise.id]);

  const handleTermClick = (term: string) => {
    if (feedback || matched.has(term)) return;
    setSelectedTerm(term);
    setWrongPair(null);
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
        setTimeout(() => onAnswer('correct'), 400);
      }
    } else {
      setWrongPair(translation);
      setTimeout(() => {
        setWrongPair(null);
        setSelectedTerm(null);
      }, 600);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <p className="text-sm text-slate-400 uppercase tracking-wide mb-6 font-bold">חבר כל מילה לתרגום שלה</p>

      <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
        {/* Terms column */}
        <div className="space-y-2">
          {pairs.map((p, i) => (
            <button
              key={`t-${i}`}
              onClick={() => handleTermClick(p.term)}
              disabled={matched.has(p.term)}
              className={`w-full p-3 rounded-xl border-2 text-base font-medium transition-all ${
                matched.has(p.term)
                  ? 'border-green-500/30 bg-green-900/10 text-green-400/50'
                  : selectedTerm === p.term
                    ? 'border-amber-500 bg-amber-500/10 text-amber-400 scale-105'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/30'
              }`}
            >
              {p.term}
            </button>
          ))}
        </div>

        {/* Translations column */}
        <div className="space-y-2">
          {shuffledTranslations.map((tr, i) => (
            <button
              key={`tr-${i}`}
              onClick={() => handleTranslationClick(tr)}
              disabled={matched.has(tr)}
              className={`w-full p-3 rounded-xl border-2 text-base font-medium transition-all ${
                matched.has(tr)
                  ? 'border-green-500/30 bg-green-900/10 text-green-400/50'
                  : wrongPair === tr
                    ? 'border-red-500 bg-red-900/20 text-red-400 animate-shake'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:border-amber-500/30'
              }`}
            >
              {tr}
            </button>
          ))}
        </div>
      </div>

      {matched.size > 0 && matched.size < pairs.length * 2 && (
        <p className="text-sm text-green-400 mt-4">{matched.size / 2} / {pairs.length} זוגות</p>
      )}
    </div>
  );
}
