import React, { useState, useEffect } from 'react';
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

const masteryBg: Record<number, string> = {
  0: 'from-slate-600 to-slate-700',
  1: 'from-amber-600 to-amber-700',
  2: 'from-slate-300 to-slate-400',
  3: 'from-yellow-400 to-amber-500',
  4: 'from-cyan-300 to-blue-400',
  5: 'from-purple-400 to-pink-500',
};

export default function LearningPath({ unitMastery, completedUnits, onUnitClick, onReviewClick, wordsDueForReview }: Props) {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Find the first active (unlocked + not completed) unit for cultural note
  const allUnits = CURRICULUM_SECTIONS.flatMap(s => s.units);
  const activeUnitId = allUnits.find(u => {
    const sectionUnlocked = isCheckpointPassed(
      CURRICULUM_SECTIONS.find(s => s.units.some(su => su.id === u.id))?.order || 1,
      unitMastery
    );
    const unlocked = sectionUnlocked && isUnitUnlocked(u, unitMastery);
    const completed = (unitMastery[u.id]?.masteryLevel || 0) >= 1;
    return unlocked && !completed;
  })?.id;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
      {/* Review button */}
      {wordsDueForReview > 0 && (
        <button
          type="button"
          onClick={onReviewClick}
          className="w-full max-w-sm lg:max-w-md mx-auto mb-10 p-4 lg:p-5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-between hover:bg-blue-500/20 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <GraduationCap size={22} className="text-blue-400" />
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-300 text-sm">חזרה על מילים</p>
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
          <div key={section.id} className="mb-12 last:mb-4">
            {/* Section Header */}
            <div className="flex items-center gap-4 mb-8 lg:mb-10 max-w-sm lg:max-w-md mx-auto">
              <div className={`h-px flex-1 ${sectionUnlocked ? 'bg-gradient-to-l from-amber-500/40 to-transparent' : 'bg-white/5'}`} />
              <div className="text-center px-2">
                <h3 className={`text-lg font-bold ${sectionUnlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                  {section.title}
                </h3>
                <p className={`text-xs mt-1 ${sectionUnlocked ? 'text-slate-500' : 'text-slate-700'}`}>
                  {section.description}
                </p>
              </div>
              <div className={`h-px flex-1 ${sectionUnlocked ? 'bg-gradient-to-r from-amber-500/40 to-transparent' : 'bg-white/5'}`} />
            </div>

            {/* Checkpoint Gate */}
            {section.order > 1 && !sectionUnlocked && (
              <div className="flex justify-center mb-8">
                <div className="px-5 py-2.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 text-slate-500 text-xs sm:text-sm">
                  <ShieldCheck size={16} />
                  <span>השלם את כל היחידות הקודמות</span>
                </div>
              </div>
            )}

            {/* Units — Duolingo-style snaking path */}
            <div className="flex flex-col items-center">
              {section.units.map((unit, idx) => {
                const mastery = unitMastery[unit.id];
                const level = mastery?.masteryLevel || 0;
                const locked = !sectionUnlocked || !isUnitUnlocked(unit, unitMastery);
                const completed = level >= 1;
                const isActive = !locked && !completed;
                const showCulturalNote = isActive && unit.culturalNote && unit.id === activeUnitId;

                // Duolingo S-curve offset — wider on desktop
                const mobileOffsets = [0, -70, -90, -50, 0, 50, 90, 70];
                const desktopOffsets = [0, -110, -150, -80, 0, 80, 150, 110];
                const offset = (isDesktop ? desktopOffsets : mobileOffsets)[idx % mobileOffsets.length];

                return (
                  <React.Fragment key={unit.id}>
                    {/* Connector dots between units */}
                    {idx > 0 && (
                      <div className="flex flex-col items-center gap-1.5 lg:gap-2 py-1 lg:py-2">
                        <div className={`w-1 h-1 rounded-full ${completed || isActive ? 'bg-amber-500/40' : 'bg-white/10'}`} />
                        <div className={`w-1 h-1 rounded-full ${completed || isActive ? 'bg-amber-500/30' : 'bg-white/[0.06]'}`} />
                        <div className={`w-1 h-1 rounded-full ${completed || isActive ? 'bg-amber-500/20' : 'bg-white/[0.04]'}`} />
                      </div>
                    )}

                    <div
                      className="relative flex flex-col items-center"
                      style={{ transform: `translateX(${offset}px)` }}
                    >
                      {/* Unit Circle */}
                      <button
                        type="button"
                        onClick={() => !locked && onUnitClick(unit)}
                        disabled={locked}
                        className={`relative w-[72px] h-[72px] sm:w-20 sm:h-20 lg:w-24 lg:h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                          locked
                            ? 'bg-white/[0.03] border-2 border-dashed border-white/10 text-white/15 cursor-not-allowed'
                            : completed
                              ? `bg-gradient-to-br ${masteryBg[level]} border-[3px] border-black/10 text-white hover:scale-110 shadow-lg`
                              : 'bg-gradient-to-br from-amber-400 to-orange-500 border-[3px] border-orange-600/40 text-[#050B14] hover:scale-110 shadow-lg shadow-amber-500/40 animate-pulse'
                        }`}
                      >
                        {locked ? (
                          <Lock size={18} className="opacity-30" />
                        ) : completed ? (
                          <CheckCircle size={28} strokeWidth={2.5} />
                        ) : (
                          getIcon(unit.icon, 28)
                        )}

                        {/* Mastery stars */}
                        {level > 0 && (
                          <div className="absolute -bottom-2 flex gap-0.5 bg-[#0d1424] px-1.5 py-0.5 rounded-full border border-white/5">
                            {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
                              <Star key={i} size={10} className="text-yellow-300" fill="currentColor" />
                            ))}
                          </div>
                        )}
                      </button>

                      {/* Label */}
                      <p className={`mt-3 lg:mt-4 text-sm lg:text-base font-bold text-center max-w-[140px] lg:max-w-[180px] leading-snug ${
                        locked ? 'text-slate-700' : completed ? 'text-slate-400' : 'text-slate-200'
                      }`}>
                        {unit.title}
                      </p>
                    </div>

                    {/* Cultural Note — shown BELOW the unit, centered, only for the first active unit */}
                    {showCulturalNote && (
                      <div className="mt-4 mb-2 w-full max-w-[280px] sm:max-w-xs mx-auto">
                        <CulturalNote note={unit.culturalNote!} link={unit.culturalLink} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
