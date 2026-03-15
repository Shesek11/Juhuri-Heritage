import React from 'react';
import { CurriculumSection, LessonUnit, UnitMasteryInfo } from '../../types';
import { CURRICULUM_SECTIONS } from '../../services/curriculumService';
import { Lock, CheckCircle, Star, ShieldCheck, Hand, Hash, Palette, Users, Apple, Home, HeartPulse, Shirt, Flame, Coffee, TreePine, MessageSquare, Scroll, Music, GraduationCap, Sparkles } from 'lucide-react';
import CulturalNote from './CulturalNote';

interface Props {
  unitMastery: Record<string, UnitMasteryInfo>;
  completedUnits: string[];
  onUnitClick: (unit: LessonUnit) => void;
  onReviewClick: () => void;
  wordsDueForReview: number;
}

const ICON_MAP: Record<string, React.FC<any>> = {
  Hand, Hash, Palette, Users, Apple, Home, HeartPulse, Shirt,
  Flame, Star: Sparkles, Coffee, TreePine, MessageSquare, Scroll, Music,
};

function getIcon(name: string, size: number) {
  const Icon = ICON_MAP[name] || Sparkles;
  return <Icon size={size} />;
}

function isUnitUnlocked(unit: LessonUnit, unitMastery: Record<string, UnitMasteryInfo>): boolean {
  if (unit.order === 1) return true;
  const allUnits = CURRICULUM_SECTIONS.flatMap(s => s.units);
  const prevUnit = allUnits.find(u => u.order === unit.order - 1);
  if (!prevUnit) return true;
  const prevMastery = unitMastery[prevUnit.id];
  return (prevMastery?.masteryLevel || 0) >= 1;
}

function isCheckpointPassed(sectionOrder: number, unitMastery: Record<string, UnitMasteryInfo>): boolean {
  if (sectionOrder <= 1) return true;
  const prevSection = CURRICULUM_SECTIONS.find(s => s.order === sectionOrder - 1);
  if (!prevSection) return true;
  return prevSection.units.every(u => (unitMastery[u.id]?.masteryLevel || 0) >= 1);
}

const masteryColors: Record<number, string> = {
  0: 'from-slate-600 to-slate-700',
  1: 'from-amber-600 to-amber-700',
  2: 'from-slate-300 to-slate-400',
  3: 'from-yellow-400 to-amber-500',
  4: 'from-cyan-300 to-blue-400',
  5: 'from-purple-400 to-pink-500',
};

const masteryGlow: Record<number, string> = {
  0: '',
  1: 'shadow-amber-500/20',
  2: 'shadow-slate-300/20',
  3: 'shadow-yellow-400/30',
  4: 'shadow-cyan-300/30',
  5: 'shadow-purple-400/30',
};

export default function LearningPath({ unitMastery, completedUnits, onUnitClick, onReviewClick, wordsDueForReview }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
      {/* Review button */}
      {wordsDueForReview > 0 && (
        <button
          type="button"
          onClick={onReviewClick}
          className="w-full max-w-md mx-auto mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between hover:bg-blue-500/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap size={22} className="text-blue-400" />
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-300 text-sm sm:text-base">חזרה על מילים</p>
              <p className="text-xs text-blue-400/70">{wordsDueForReview} מילים ממתינות</p>
            </div>
          </div>
          <span className="text-xl opacity-60 group-hover:opacity-100 transition-opacity">🔄</span>
        </button>
      )}

      {/* Sections */}
      {CURRICULUM_SECTIONS.map((section) => {
        const sectionUnlocked = isCheckpointPassed(section.order, unitMastery);

        return (
          <div key={section.id} className="mb-10 last:mb-4">
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-6 max-w-md mx-auto">
              <div className={`h-px flex-1 ${sectionUnlocked ? 'bg-gradient-to-l from-amber-500/40 to-transparent' : 'bg-white/5'}`} />
              <div className="text-center">
                <h3 className={`text-base sm:text-lg font-bold ${sectionUnlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                  {section.title}
                </h3>
                <p className={`text-[11px] sm:text-xs mt-0.5 ${sectionUnlocked ? 'text-slate-500' : 'text-slate-700'}`}>
                  {section.description}
                </p>
              </div>
              <div className={`h-px flex-1 ${sectionUnlocked ? 'bg-gradient-to-r from-amber-500/40 to-transparent' : 'bg-white/5'}`} />
            </div>

            {/* Checkpoint Gate */}
            {section.order > 1 && !sectionUnlocked && (
              <div className="flex justify-center mb-6">
                <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 text-slate-500 text-xs sm:text-sm">
                  <ShieldCheck size={16} />
                  <span>השלם את כל היחידות הקודמות</span>
                </div>
              </div>
            )}

            {/* Units — Duolingo-style path */}
            <div className="flex flex-col items-center gap-1">
              {section.units.map((unit, idx) => {
                const mastery = unitMastery[unit.id];
                const level = mastery?.masteryLevel || 0;
                const locked = !sectionUnlocked || !isUnitUnlocked(unit, unitMastery);
                const completed = level >= 1;
                const isActive = !locked && !completed;

                // Duolingo zigzag — wider on larger screens
                const offsets = [0, -40, -55, -40, 0, 40, 55, 40];
                const offset = offsets[idx % offsets.length];

                return (
                  <div key={unit.id} className="relative flex flex-col items-center py-2" style={{ transform: `translateX(${offset}px)` }}>
                    {/* Connector line */}
                    {idx > 0 && (
                      <div
                        className={`absolute w-0.5 h-5 -top-3 ${completed ? 'bg-amber-500/30' : locked ? 'bg-white/5' : 'bg-amber-500/20'}`}
                        style={{ left: '50%', transform: 'translateX(-50%)' }}
                      />
                    )}

                    {/* Unit Circle */}
                    <button
                      type="button"
                      onClick={() => !locked && onUnitClick(unit)}
                      disabled={locked}
                      className={`relative w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                        locked
                          ? 'bg-white/[0.04] border-2 border-white/[0.08] text-white/20 cursor-not-allowed'
                          : completed
                            ? `bg-gradient-to-br ${masteryColors[level]} border-2 border-black/10 text-white hover:scale-110 shadow-xl ${masteryGlow[level]}`
                            : 'bg-gradient-to-br from-amber-400 to-orange-500 border-2 border-orange-600/50 text-[#050B14] hover:scale-110 shadow-xl shadow-amber-500/30 animate-pulse'
                      }`}
                    >
                      {locked ? (
                        <Lock size={20} className="opacity-40" />
                      ) : completed ? (
                        <CheckCircle size={26} strokeWidth={2.5} />
                      ) : (
                        getIcon(unit.icon, 26)
                      )}

                      {/* Mastery stars — below the circle */}
                      {level > 0 && (
                        <div className="absolute -bottom-1.5 flex gap-px bg-[#0d1424] px-1.5 py-0.5 rounded-full">
                          {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
                            <Star key={i} size={9} className="text-yellow-300" fill="currentColor" />
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Label */}
                    <p className={`mt-3 text-xs sm:text-sm font-bold text-center max-w-[130px] leading-tight ${
                      locked ? 'text-slate-700' : completed ? 'text-slate-400' : 'text-slate-200'
                    }`}>
                      {unit.title}
                    </p>

                    {/* Cultural Note — only for the active unit */}
                    {isActive && unit.culturalNote && (
                      <div className="mt-3 max-w-xs">
                        <CulturalNote note={unit.culturalNote} link={unit.culturalLink} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
