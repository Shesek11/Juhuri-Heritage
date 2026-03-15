import React from 'react';
import { TrendingUp, BookOpen, RotateCcw, GraduationCap, Flame, X } from 'lucide-react';

interface DayStat {
  date: string;
  xp_earned: number;
  words_learned: number;
  words_reviewed: number;
  lessons_completed: number;
}

interface Props {
  stats: DayStat[];
  totals: { xpEarned: number; wordsLearned: number; wordsReviewed: number; lessonsCompleted: number };
  streak: number;
  totalWordsLearned: number;
  onClose: () => void;
}

const DAY_NAMES = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export default function WeeklySummary({ stats, totals, streak, totalWordsLearned, onClose }: Props) {
  const maxXp = Math.max(...stats.map(s => s.xp_earned), 1);

  return (
    <div className="w-full bg-[#0d1424]/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/10 p-5 sm:p-7 lg:p-10 font-rubik">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base sm:text-lg font-bold text-slate-100">סיכום שבועי</h3>
        <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors" title="סגור">
          <X size={18} />
        </button>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-1.5 sm:gap-2 lg:gap-3 h-28 sm:h-32 lg:h-40 mb-6 lg:mb-8">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dateStr = date.toISOString().slice(0, 10);
          const stat = stats.find(s => s.date === dateStr);
          const xp = stat?.xp_earned || 0;
          const height = maxXp > 0 ? (xp / maxXp) * 100 : 0;
          const isToday = i === 6;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className="w-full flex items-end justify-center h-24 sm:h-28">
                <div
                  className={`w-5 sm:w-7 rounded-t-md transition-all ${isToday ? 'bg-amber-500' : xp > 0 ? 'bg-amber-500/40' : 'bg-white/[0.06]'}`}
                  style={{ height: `${Math.max(height, 6)}%` }}
                />
              </div>
              <span className={`text-[10px] sm:text-xs ${isToday ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>
                {DAY_NAMES[date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
        <div className="bg-white/[0.04] rounded-xl p-3 sm:p-4 flex items-center gap-3">
          <TrendingUp size={18} className="text-amber-400 shrink-0" />
          <div>
            <p className="text-base sm:text-lg font-bold text-slate-100">{totals.xpEarned}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">XP השבוע</p>
          </div>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3 sm:p-4 flex items-center gap-3">
          <BookOpen size={18} className="text-green-400 shrink-0" />
          <div>
            <p className="text-base sm:text-lg font-bold text-slate-100">{totals.wordsLearned}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">מילים חדשות</p>
          </div>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3 sm:p-4 flex items-center gap-3">
          <RotateCcw size={18} className="text-blue-400 shrink-0" />
          <div>
            <p className="text-base sm:text-lg font-bold text-slate-100">{totals.wordsReviewed}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">מילים חזרו</p>
          </div>
        </div>
        <div className="bg-white/[0.04] rounded-xl p-3 sm:p-4 flex items-center gap-3">
          <GraduationCap size={18} className="text-purple-400 shrink-0" />
          <div>
            <p className="text-base sm:text-lg font-bold text-slate-100">{totals.lessonsCompleted}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">שיעורים</p>
          </div>
        </div>
      </div>

      {/* Total words + streak */}
      <div className="mt-4 pt-4 border-t border-white/[0.06] flex justify-between items-center">
        <div className="text-xs sm:text-sm text-slate-400">
          סה&quot;כ: <span className="font-bold text-slate-200">{totalWordsLearned} מילים</span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 text-orange-400">
            <Flame size={14} fill="currentColor" />
            <span className="text-xs sm:text-sm font-bold">{streak} ימים</span>
          </div>
        )}
      </div>
    </div>
  );
}
