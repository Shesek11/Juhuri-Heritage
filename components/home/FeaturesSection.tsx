'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen, GraduationCap, ChefHat, Store, TreeDeciduous, Compass
} from 'lucide-react';

interface FeaturesSectionProps {
  featureFlags: Record<string, string>;
  isAdmin: boolean;
}

const featureCards = [
  {
    key: null,
    icon: BookOpen,
    title: 'מילון ג׳והורי',
    description: 'חקרו את אוצר המילים העשיר עם תרגומים והקלטות קוליות.',
    link: '/dictionary',
    gradient: 'from-amber-400 to-yellow-600',
  },
  {
    key: null,
    icon: GraduationCap,
    title: 'מורה פרטי',
    description: 'למדו בקצב שלכם עם שיעורים מונחי בינה מלאכותית.',
    link: '/tutor',
    gradient: 'from-amber-300 to-amber-500',
  },
  {
    key: 'recipes_module',
    icon: ChefHat,
    title: 'מתכוני העדה',
    description: 'גלו את המטבח הקווקזי המסורתי דרך מתכונים אותנטיים.',
    link: '/recipes',
    gradient: 'from-yellow-400 to-amber-500',
  },
  {
    key: 'marketplace_module',
    icon: Store,
    title: 'שוק מקומי',
    description: 'מוצרים ייחודיים ומאכלים ביתיים של בני העדה.',
    link: '/marketplace',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    key: 'family_tree_module',
    icon: TreeDeciduous,
    title: 'אילן יוחסין',
    description: 'התחברו לשורשים וגלו קרובי משפחה ברחבי העולם.',
    link: '/family',
    gradient: 'from-orange-400 to-amber-600',
  },
];

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ featureFlags, isAdmin }) => {
  const getCardVisibility = (featureKey: string | null) => {
    if (featureKey === null) return { visible: true, comingSoon: false, clickable: true };
    const status = featureFlags[featureKey];
    if (!status || status === 'disabled') return { visible: false, comingSoon: false, clickable: false };
    if (status === 'coming_soon') return { visible: true, comingSoon: true, clickable: false };
    if (status === 'admin_only') return { visible: isAdmin, comingSoon: false, clickable: isAdmin };
    return { visible: true, comingSoon: false, clickable: true };
  };

  return (
    <section className="relative z-10 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-10 justify-center text-center">
          <Compass className="text-amber-500" size={28} />
          <h2 className="text-3xl font-bold text-white">מחקר ולמידה</h2>
          <div className="w-16 h-[1px] bg-gradient-to-l from-amber-500 to-transparent mr-4 hidden sm:block"></div>
          <div className="w-16 h-[1px] bg-gradient-to-r from-amber-500 to-transparent ml-4 hidden sm:block"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureCards.map((card) => {
            const { visible, comingSoon, clickable } = getCardVisibility(card.key);
            if (!visible) return null;

            const Icon = card.icon;
            const cardContent = (
              <div className={`relative h-full flex flex-col p-8 rounded-[2rem] border border-slate-800 bg-[#0d1424]/60 backdrop-blur-lg overflow-hidden group transition-all duration-500
                  ${clickable ? 'hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer' : 'cursor-default'}`}
              >
                {/* Subtle top gradient line */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />

                <div className="mb-8 flex justify-between items-start">
                  <div className={`p-5 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-[0_0_20px_rgba(245,158,11,0.3)]`}>
                    <Icon size={28} className="text-[#050B14] stroke-[2.5]" />
                  </div>
                  {comingSoon && (
                    <span className="px-3 py-1 bg-slate-900/80 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full shadow-inner">
                      בקרוב
                    </span>
                  )}
                </div>

                <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-amber-400 transition-colors duration-300">{card.title}</h3>
                <p className="text-slate-400 leading-relaxed font-light text-base">{card.description}</p>
              </div>
            );

            return clickable ? (
              <Link key={card.title} href={card.link} className="block h-full">
                {cardContent}
              </Link>
            ) : (
              <div key={card.title} className="h-full">{cardContent}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
