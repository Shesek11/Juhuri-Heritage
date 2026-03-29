'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useAppContext } from '../shell/AppContext';
import { useTranslations } from 'next-intl';
import { Clock, ChefHat, Store, TreeDeciduous, GraduationCap } from 'lucide-react';

function RedirectHome() {
  const router = useRouter();
  useEffect(() => { router.replace('/'); }, [router]);
  return null;
}

interface FeatureRouteProps {
  feature: string;
  children: React.ReactNode;
}

const featureVisual: Record<string, { icon: React.ReactNode; gradient: string }> = {
  tutor_module: {
    icon: <GraduationCap className="w-12 h-12 text-white" />,
    gradient: 'from-amber-300 to-amber-500',
  },
  recipes_module: {
    icon: <ChefHat className="w-12 h-12 text-white" />,
    gradient: 'from-amber-400 to-orange-600',
  },
  marketplace_module: {
    icon: <Store className="w-12 h-12 text-white" />,
    gradient: 'from-orange-400 to-red-600',
  },
  family_tree_module: {
    icon: <TreeDeciduous className="w-12 h-12 text-white" />,
    gradient: 'from-emerald-400 to-teal-600',
  },
};

export const FeatureRoute: React.FC<FeatureRouteProps> = ({ feature, children }) => {
  const { user } = useAuth();
  const { featureFlags: flags, featureFlagsLoaded } = useAppContext();
  const t = useTranslations('teaser');
  const isAdmin = user?.role === 'admin' || user?.role === 'approver';

  const status = flags[feature];

  // Wait for flags to load before deciding — prevents redirect on refresh
  if (!featureFlagsLoaded) return null;

  if (!status || status === 'disabled') return <RedirectHome />;

  if (status === 'coming_soon' && !isAdmin) {
    const visual = featureVisual[feature];
    if (!visual) return <RedirectHome />;

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className={`w-24 h-24 bg-gradient-to-br ${visual.gradient} rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse`}>
          {visual.icon}
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
          {t(`${feature}.title`)}
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mb-4">
          {t(`${feature}.description`)}
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
          <Clock className="w-4 h-4" />
          <span>{t('inDevelopment')}</span>
        </div>
      </div>
    );
  }

  if (status === 'admin_only' && !isAdmin) return <RedirectHome />;

  return <>{children}</>;
};
