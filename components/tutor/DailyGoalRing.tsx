import React from 'react';
import { Flame } from 'lucide-react';

interface Props {
  earned: number;
  goal: number;
  streak: number;
}

export default function DailyGoalRing({ earned, goal, streak }: Props) {
  const percentage = Math.min((earned / goal) * 100, 100);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage >= 100;

  return (
    <div className="flex items-center gap-4">
      {/* Ring */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r={radius} fill="none"
            stroke={isComplete ? '#10b981' : '#f59e0b'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold ${isComplete ? 'text-green-400' : 'text-amber-400'}`}>{earned}</span>
          <span className="text-[10px] text-slate-500">/{goal} XP</span>
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-1">
          <Flame size={18} className="text-orange-400" fill="currentColor" />
          <span className="text-sm font-bold text-orange-400">{streak}</span>
        </div>
      )}
    </div>
  );
}
