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
    <div className="w-full bg-[#0d1424]/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 p-6 sm:p-8 lg:p-10 font-rubik">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-lg sm:text-xl font-bold text-slate-100">סיכום שבועי</h3>
        <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors" title="סגור" aria-label="סגור">
          <X size={20} />
        </button>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-2 sm:gap-3 lg:gap-4 h-32 sm:h-36 lg:h-44 mb-8 lg:mb-10">
        {Array.from({ length: 7 }).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          const dateStr = date.toISOString().slice(0, 10);
          const stat = stats.find(s => s.date === dateStr);
          const xp = stat?.xp_earned || 0;
          const height = maxXp > 0 ? (xp / maxXp) * 100 : 0;
          const isToday = i === 6;

          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center h-28 sm:h-32 lg:h-40">
                <div
                  className={`w-full max-w-[36px] lg:max-w-[44px] rounded-t-lg transition-all ${isToday ? 'bg-amber-500' : xp > 0 ? 'bg-amber-500/40' : 'bg-white/[0.04]'}`}
                  style={{ height: `${Math.max(height, 6)}%` }}
                />
              </div>
              <span className={`text-xs sm:text-sm ${isToday ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>
                {DAY_NAMES[date.getDay()]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Stats grid — always 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard icon={<TrendingUp size={20} className="text-amber-400" />} value={totals.xpEarned} label="XP השבוע" />
        <StatCard icon={<BookOpen size={20} className="text-green-400" />} value={totals.wordsLearned} label="מילים חדשות" />
        <StatCard icon={<RotateCcw size={20} className="text-blue-400" />} value={totals.wordsReviewed} label="מילים חזרו" />
        <StatCard icon={<GraduationCap size={20} className="text-purple-400" />} value={totals.lessonsCompleted} label="שיעורים" />
      </div>

      {/* Total words + streak */}
      <div className="mt-6 pt-5 border-t border-white/[0.06] flex justify-between items-center">
        <div className="text-sm text-slate-400">
          סה&quot;כ: <span className="font-bold text-slate-200">{totalWordsLearned} מילים</span>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-orange-400">
            <Flame size={16} fill="currentColor" />
            <span className="text-sm font-bold">{streak} ימים</span>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="bg-white/[0.04] rounded-xl p-4 lg:p-5 flex items-center gap-3">
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-lg lg:text-xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}
