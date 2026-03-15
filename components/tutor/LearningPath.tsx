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

  // Find the unit before this one
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
  1: 'from-amber-700 to-amber-800',
  2: 'from-slate-300 to-slate-400',
  3: 'from-yellow-400 to-amber-500',
  4: 'from-cyan-300 to-blue-400',
  5: 'from-purple-400 to-pink-500',
};

export default function LearningPath({ unitMastery, completedUnits, onUnitClick, onReviewClick, wordsDueForReview }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Review button */}
      {wordsDueForReview > 0 && (
        <button
          onClick={onReviewClick}
          className="w-full mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-between hover:bg-blue-500/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <GraduationCap size={20} className="text-blue-400" />
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-300">חזרה על מילים</p>
              <p className="text-xs text-blue-400/70">{wordsDueForReview} מילים ממתינות לחזרה</p>
            </div>
          </div>
          <span className="text-2xl">🔄</span>
        </button>
      )}

      {/* Sections */}
      {CURRICULUM_SECTIONS.map((section) => {
        const sectionUnlocked = isCheckpointPassed(section.order, unitMastery);

        return (
          <div key={section.id} className="mb-8">
            {/* Section Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-px flex-1 ${sectionUnlocked ? 'bg-amber-500/30' : 'bg-white/10'}`} />
              <h3 className={`text-sm font-bold uppercase tracking-wider ${sectionUnlocked ? 'text-amber-400' : 'text-slate-600'}`}>
                {section.title}
              </h3>
              <div className={`h-px flex-1 ${sectionUnlocked ? 'bg-amber-500/30' : 'bg-white/10'}`} />
            </div>

            {/* Checkpoint Gate (for sections after the first) */}
            {section.order > 1 && !sectionUnlocked && (
              <div className="flex justify-center mb-4">
                <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2 text-slate-500 text-sm">
                  <ShieldCheck size={16} />
                  <span>השלם את כל היחידות הקודמות</span>
                </div>
              </div>
            )}

            {/* Units */}
            <div className="flex flex-col items-center gap-6">
              {section.units.map((unit, idx) => {
                const mastery = unitMastery[unit.id];
                const level = mastery?.masteryLevel || 0;
                const locked = !sectionUnlocked || !isUnitUnlocked(unit, unitMastery);
                const completed = level >= 1;

                // Alternating left/right for visual interest
                const offset = idx % 2 === 0 ? '-20px' : '20px';

                return (
                  <div key={unit.id} className="relative flex flex-col items-center" style={{ marginLeft: offset }}>
                    {/* Connector line */}
                    {idx > 0 && (
                      <div className={`absolute -top-6 w-0.5 h-6 ${completed ? 'bg-amber-500/30' : 'bg-white/10'}`} />
                    )}

                    {/* Unit Circle */}
                    <button
                      onClick={() => !locked && onUnitClick(unit)}
                      disabled={locked}
                      className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center shadow-lg border-b-4 transition-all transform ${
                        locked
                          ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                          : completed
                            ? `bg-gradient-to-br ${masteryColors[level]} border-black/20 text-white hover:scale-110 shadow-[0_0_20px_rgba(245,158,11,0.3)]`
                            : 'bg-gradient-to-br from-amber-400 to-orange-600 border-orange-700 text-[#050B14] hover:scale-110 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                      }`}
                    >
                      {locked ? <Lock size={22} /> : completed ? <CheckCircle size={28} /> : getIcon(unit.icon, 28)}

                      {/* Mastery stars */}
                      {level > 0 && (
                        <div className="absolute -bottom-2 flex gap-0.5">
                          {Array.from({ length: Math.min(level, 5) }).map((_, i) => (
                            <Star key={i} size={10} className="text-yellow-300" fill="currentColor" />
                          ))}
                        </div>
                      )}
                    </button>

                    {/* Label */}
                    <p className={`mt-3 text-sm font-bold text-center max-w-[120px] ${locked ? 'text-slate-600' : 'text-slate-300'}`}>
                      {unit.title}
                    </p>

                    {/* Cultural Note (show for first unlocked incomplete unit with a note) */}
                    {!locked && !completed && unit.culturalNote && idx === section.units.findIndex(u => !isUnitUnlocked(u, unitMastery) === false && (unitMastery[u.id]?.masteryLevel || 0) === 0) && (
                      <div className="mt-3">
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
