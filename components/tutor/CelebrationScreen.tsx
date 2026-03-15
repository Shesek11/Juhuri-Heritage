import React, { useEffect, useState } from 'react';
import { Trophy, Star, Sparkles, ArrowRight } from 'lucide-react';

interface Props {
  score: number;
  accuracy: number;
  xpEarned: number;
  masteryLevel: number;
  wordsLearned: number;
  onContinue: () => void;
  milestone?: { count: number; label: string } | null;
}

export default function CelebrationScreen({ score, accuracy, xpEarned, masteryLevel, wordsLearned, onContinue, milestone }: Props) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowConfetti(true);
    setTimeout(() => setShowContent(true), 300);
  }, []);

  const masteryNames = ['', 'ברונזה', 'כסף', 'זהב', 'פלטינום', 'יהלום'];
  const masteryColors = ['', 'text-amber-600', 'text-slate-300', 'text-yellow-400', 'text-cyan-300', 'text-purple-400'];

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-8 bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl relative overflow-hidden">
      {/* Confetti particles */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#3b82f6'][i % 5],
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${1.5 + Math.random() * 1.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {showContent && (
        <>
          {/* Trophy */}
          <div className="p-6 rounded-full bg-gradient-to-br from-amber-400/20 to-orange-500/20 border border-amber-500/30 mb-6 animate-bounce-in">
            <Trophy size={64} className="text-amber-400" />
          </div>

          <h2 className="text-3xl font-bold text-slate-100 mb-2">כל הכבוד!</h2>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 my-8 w-full max-w-sm">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-amber-400">+{xpEarned}</span>
              <span className="text-xs text-slate-500">XP</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-green-400">{accuracy}%</span>
              <span className="text-xs text-slate-500">דיוק</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-blue-400">{wordsLearned}</span>
              <span className="text-xs text-slate-500">מילים</span>
            </div>
          </div>

          {/* Mastery level */}
          {masteryLevel > 0 && (
            <div className="flex items-center gap-2 mb-4">
              {Array.from({ length: masteryLevel }).map((_, i) => (
                <Star key={i} size={20} className={masteryColors[masteryLevel]} fill="currentColor" />
              ))}
              <span className={`text-sm font-bold ${masteryColors[masteryLevel]}`}>
                {masteryNames[masteryLevel]}
              </span>
            </div>
          )}

          {/* Word milestone */}
          {milestone && (
            <div className="px-6 py-3 bg-purple-500/10 border border-purple-500/20 rounded-xl mb-6 animate-pulse">
              <div className="flex items-center gap-2 text-purple-400">
                <Sparkles size={20} />
                <span className="font-bold">{milestone.label}</span>
              </div>
            </div>
          )}

          <button
            onClick={onContinue}
            className="mt-4 flex items-center gap-2 bg-gradient-to-r from-amber-400 via-amber-500 to-orange-600 text-[#050B14] px-8 py-3 rounded-xl font-bold hover:scale-105 shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform"
          >
            המשך
            <ArrowRight size={20} />
          </button>
        </>
      )}
    </div>
  );
}
