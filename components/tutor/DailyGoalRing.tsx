import React from 'react';
import { Flame } from 'lucide-react';

interface Props {
  earned: number;
  goal: number;
  streak: number;
}

export default function DailyGoalRing({ earned, goal, streak }: Props) {
  const percentage = Math.min((earned / goal) * 100, 100);
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage >= 100;

  return (
    <div className="flex items-center gap-2.5">
      {/* Ring — compact for header use */}
      <div className="relative w-12 h-12 sm:w-14 sm:h-14">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="24" cy="24" r={radius} fill="none"
            stroke={isComplete ? '#10b981' : '#f59e0b'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xs sm:text-sm font-bold leading-none ${isComplete ? 'text-green-400' : 'text-amber-400'}`}>{earned}</span>
          <span className="text-[8px] sm:text-[9px] text-slate-500 leading-none">/{goal}</span>
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-0.5">
          <Flame size={14} className="text-orange-400" fill="currentColor" />
          <span className="text-xs font-bold text-orange-400">{streak}</span>
        </div>
      )}
    </div>
  );
}
