'use client';

import React from 'react';
import { Link } from '@/src/i18n/navigation';
import {
  BookOpen, GraduationCap, ChefHat, Store, TreeDeciduous, Music
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FeatureFlag } from '../../services/featureFlagService';

interface FeaturesSectionProps {
  featureFlags: Record<string, string>;
  orderedFeatures?: FeatureFlag[];
  isAdmin: boolean;
}

// Static card content — icons and gradients stay in code, text comes from translations
const cardContent: Record<string, { icon: React.ElementType; gradient: string }> = {
  dictionary_module: {
    icon: BookOpen,
    gradient: 'from-amber-400 to-yellow-600',
  },
  tutor_module: {
    icon: GraduationCap,
    gradient: 'from-amber-300 to-amber-500',
  },
  recipes_module: {
    icon: ChefHat,
    gradient: 'from-yellow-400 to-amber-500',
  },
  marketplace_module: {
    icon: Store,
    gradient: 'from-amber-500 to-orange-500',
  },
  family_tree_module: {
    icon: TreeDeciduous,
    gradient: 'from-orange-400 to-amber-600',
  },
  music_module: {
    icon: Music,
    gradient: 'from-amber-400 to-orange-500',
  },
};

// Default order if DB features not loaded yet
const defaultOrder = ['dictionary_module', 'tutor_module', 'recipes_module', 'marketplace_module', 'family_tree_module'];

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ featureFlags, orderedFeatures, isAdmin }) => {
  const tf = useTranslations('features');
  const th = useTranslations('home');
  const tc = useTranslations('common');
  const getCardVisibility = (featureKey: string) => {
    // Dictionary is always visible if no flag
    if (featureKey === 'dictionary_module' && !featureFlags[featureKey]) return { visible: true, comingSoon: false };
    const status = featureFlags[featureKey];
    if (!status || status === 'disabled') return { visible: false, comingSoon: false };
    if (status === 'coming_soon') return { visible: true, comingSoon: true };
    if (status === 'admin_only') return { visible: isAdmin, comingSoon: false };
    return { visible: true, comingSoon: false };
  };

  // Use DB order if available, fallback to default
  const orderedKeys = orderedFeatures && orderedFeatures.length > 0
    ? orderedFeatures.map(f => f.feature_key)
    : defaultOrder;

  return (
    <section className="relative z-10 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-10 justify-center text-center">
          <div className="w-16 h-[1px] bg-gradient-to-l from-amber-500 to-transparent hidden sm:block"></div>
          <h2 className="text-3xl font-bold text-white">{th('sectionTitle')}</h2>
          <div className="w-16 h-[1px] bg-gradient-to-r from-amber-500 to-transparent hidden sm:block"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderedKeys.map((key) => {
            const card = cardContent[key];
            if (!card) return null;

            const { visible, comingSoon } = getCardVisibility(key);
            if (!visible) return null;

            const Icon = card.icon;
            const isClickable = !comingSoon;
            const dbFeature = orderedFeatures?.find(f => f.feature_key === key);
            const link = dbFeature?.link || '/' + key.replace('_module', '');
            const href = comingSoon ? `${link}?preview=teaser` : link;

            return (
              <Link key={key} href={href} className="block h-full">
                <div className={`relative h-full flex flex-col p-8 rounded-[2rem] border border-slate-800 bg-[#0d1424]/60 backdrop-blur-lg overflow-hidden group transition-all duration-500
                    ${isClickable ? 'hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer' : 'hover:-translate-y-1 hover:border-slate-700 cursor-pointer'}`}
                >
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />

                  <div className="mb-8 flex justify-between items-start">
                    <div className={`p-5 rounded-2xl bg-gradient-to-br ${card.gradient} shadow-[0_0_20px_rgba(245,158,11,0.3)] ${comingSoon ? 'opacity-60' : ''}`}>
                      <Icon size={28} className="text-[#050B14] stroke-[2.5]" />
                    </div>
                    {comingSoon && (
                      <span className="px-3 py-1 bg-slate-900/80 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full shadow-inner">
                        {tc('comingSoon')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-amber-400 transition-colors duration-300">{tf(`${key}.title`)}</h3>
                  <p className="text-slate-300 leading-relaxed font-light text-base">{tf(`${key}.description`)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
