import React from 'react';
import { Flame } from 'lucide-react';

interface Props {
  earned: number;
  goal: number;
  streak: number;
}

export default function DailyGoalRing({ earned, goal, streak }: Props) {
  const percentage = Math.min((earned / goal) * 100, 100);
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage >= 100;

  return (
    <div className="flex items-center gap-3">
      {/* Ring */}
      <div className="relative w-14 h-14 sm:w-16 sm:h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 52 52">
          {/* Background track */}
          <circle cx="26" cy="26" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4.5" />
          {/* Progress arc */}
          <circle
            cx="26" cy="26" r={radius} fill="none"
            stroke={isComplete ? '#10b981' : '#f59e0b'}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-sm sm:text-base font-bold leading-none ${isComplete ? 'text-green-400' : 'text-amber-400'}`}>{earned}</span>
          <span className="text-[9px] sm:text-[10px] text-slate-500 leading-none">/{goal}</span>
        </div>
      </div>

      {/* Streak */}
      {streak > 0 && (
        <div className="flex items-center gap-1">
          <Flame size={16} className="text-orange-400" fill="currentColor" />
          <span className="text-sm font-bold text-orange-400">{streak}</span>
        </div>
      )}
    </div>
  );
}
