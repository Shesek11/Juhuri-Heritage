import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { LessonUnit, UnitMasteryInfo } from '../../types';
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

const MASTERY_RING: Record<number, string> = {
  0: 'ring-slate-600/50',
  1: 'ring-amber-500/60',
  2: 'ring-slate-300/60',
  3: 'ring-yellow-400/60',
  4: 'ring-cyan-400/60',
  5: 'ring-purple-400/60',
};

const MASTERY_BG: Record<number, string> = {
  0: 'from-slate-600 to-slate-700',
  1: 'from-amber-600 to-amber-700',
  2: 'from-slate-300 to-slate-400',
  3: 'from-yellow-400 to-amber-500',
  4: 'from-cyan-300 to-blue-400',
  5: 'from-purple-400 to-pink-500',
};

export default function LearningPath({ unitMastery, completedUnits, onUnitClick, onReviewClick, wordsDueForReview }: Props) {
  const t = useTranslations('tutor');
  const activeRef = useRef<HTMLDivElement>(null);

  // Scroll to active unit on mount
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">

        {/* ===== Review Button ===== */}
        {wordsDueForReview > 0 && (
          <div className="flex justify-center mb-12 lg:mb-16">
            <button
              type="button"
              onClick={onReviewClick}
              className="px-6 py-4 sm:px-8 sm:py-5 bg-blue-500/8 border border-blue-500/20 rounded-2xl flex items-center gap-4 hover:bg-blue-500/15 hover:border-blue-500/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap size={24} className="text-blue-400" />
              </div>
              <div className="text-start">
                <p className="font-bold text-blue-300 text-sm sm:text-base">חזרה על מילים</p>
                <p className="text-xs sm:text-sm text-blue-400/60">{wordsDueForReview} מילים ממתינות לחזרה</p>
              </div>
            </button>
          </div>
        )}

        {/* ===== Sections ===== */}
        {CURRICULUM_SECTIONS.map((section) => {
          const sectionUnlocked = isCheckpointPassed(section.order, unitMastery);

          return (
            <div key={section.id} className="mb-16 lg:mb-20 last:mb-8">

              {/* Section Header — full width with gradient lines */}
              <div className="flex items-center gap-5 mb-10 lg:mb-14">
                <div className={`h-px flex-1 ${sectionUnlocked ? 'bg-gradient-to-l from-amber-500/30 to-transparent' : 'bg-white/5'}`} />
                <div className="text-center px-4">
                  <h3 className={`text-xl sm:text-2xl font-bold ${sectionUnlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                    {section.title}
                  </h3>
                  <p className={`text-sm mt-1.5 ${sectionUnlocked ? 'text-slate-400' : 'text-slate-700'}`}>
                    {section.description}
                  </p>
                </div>
                <div className={`h-px flex-1 ${sectionUnlocked ? 'bg-gradient-to-r from-amber-500/30 to-transparent' : 'bg-white/5'}`} />
              </div>

              {/* Checkpoint Gate */}
              {section.order > 1 && !sectionUnlocked && (
                <div className="flex justify-center mb-10">
                  <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-full flex items-center gap-2.5 text-slate-400 text-sm">
                    <ShieldCheck size={18} />
                    <span>השלם את כל היחידות הקודמות</span>
                  </div>
                </div>
              )}

              {/* Units — S-curve path */}
              <div className="flex flex-col items-center gap-0">
                {section.units.map((unit, idx) => {
                  const mastery = unitMastery[unit.id];
                  const level = mastery?.masteryLevel || 0;
                  const locked = !sectionUnlocked || !isUnitUnlocked(unit, unitMastery);
                  const completed = level >= 1;
                  const isActive = !locked && !completed;
                  const showCulturalNote = isActive && unit.culturalNote && unit.id === activeUnitId;

                  return (
                    <React.Fragment key={unit.id}>
                      {/* Connector line between units */}
                      {idx > 0 && (
                        <div className="flex flex-col items-center py-2 sm:py-3 lg:py-4">
                          <div className={`w-0.5 h-4 sm:h-5 lg:h-7 rounded-full ${completed || isActive ? 'bg-gradient-to-b from-amber-500/40 to-amber-500/10' : 'bg-white/[0.06]'}`} />
                        </div>
                      )}

                      <div
                        ref={isActive ? activeRef : undefined}
                        className="relative flex flex-col items-center"
                      >
                        {/* Glow ring for active unit */}
                        {isActive && (
                          <div className="absolute inset-0 rounded-full bg-amber-500/15 animate-ping-slow" />
                        )}

                        {/* Unit Circle */}
                        <button
                          type="button"
                          onClick={() => !locked && onUnitClick(unit)}
                          disabled={locked}
                          aria-label={`${unit.title}${locked ? ` - ${t('locked')}` : completed ? ` - ${t('levelN', { level })}` : ` - ${t('start')}`}`}
                          className={`
                            relative z-10 rounded-full flex items-center justify-center transition-all duration-300
                            w-[72px] h-[72px] sm:w-20 sm:h-20 lg:w-24 lg:h-24
                            ${locked
                              ? 'bg-white/[0.03] border-2 border-dashed border-white/10 text-white/20 cursor-not-allowed'
                              : completed
                                ? `bg-gradient-to-br ${MASTERY_BG[level]} ring-4 ${MASTERY_RING[level]} text-white shadow-lg hover:scale-110 active:scale-95`
                                : 'bg-gradient-to-br from-amber-400 to-orange-500 ring-4 ring-amber-500/30 text-[#050B14] shadow-xl shadow-amber-500/25 hover:scale-110 active:scale-95 hover:shadow-amber-500/40'
                            }
                          `}
                        >
                          {locked ? (
                            <Lock size={20} className="opacity-40" />
                          ) : completed ? (
                            <CheckCircle size={30} strokeWidth={2.5} className="lg:w-9 lg:h-9" />
                          ) : (
                            <span className="lg:scale-125">{getIcon(unit.icon, 28)}</span>
                          )}

                          {/* Mastery stars */}
                          {level > 0 && (
                            <div className="absolute -bottom-2.5 flex gap-0.5 bg-[#050B14] px-2 py-0.5 rounded-full border border-white/10 shadow-sm">
                              {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
                                <Star key={i} size={10} className="text-yellow-300" fill="currentColor" />
                              ))}
                            </div>
                          )}
                        </button>

                        {/* Label */}
                        <p className={`
                          mt-4 lg:mt-5 text-sm lg:text-base font-bold text-center leading-snug
                          max-w-[140px] lg:max-w-[180px]
                          ${locked ? 'text-slate-700' : completed ? 'text-slate-400' : 'text-slate-100'}
                        `}>
                          {unit.title}
                        </p>
                      </div>

                      {/* Cultural Note */}
                      {showCulturalNote && (
                        <div className="mt-5 mb-3 w-full max-w-xs sm:max-w-sm mx-auto">
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

    </div>
  );
}
