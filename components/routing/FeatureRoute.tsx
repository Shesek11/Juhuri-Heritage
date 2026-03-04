import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, ChefHat, Store, TreeDeciduous } from 'lucide-react';

interface FeatureRouteProps {
  feature: string;
  children: React.ReactNode;
  comingSoonIcon?: React.ReactNode;
  comingSoonTitle?: string;
  comingSoonDescription?: string;
}

const featureFlags: Record<string, { icon: React.ReactNode; title: string; description: string; gradient: string }> = {
  recipes_module: {
    icon: <ChefHat className="w-12 h-12 text-white" />,
    title: 'מתכונים - בקרוב! \u{1F372}',
    description: 'אוסף המתכונים הקווקזיים שלנו בפיתוח. בקרוב תוכלו לגלות מתכונים מסורתיים!',
    gradient: 'from-amber-400 to-orange-600',
  },
  marketplace_module: {
    icon: <Store className="w-12 h-12 text-white" />,
    title: 'שוק - בקרוב! \u{1F6D2}',
    description: 'השוק הקהילתי שלנו בפיתוח. בקרוב תוכלו למצוא עסקים ומוכרים מהקהילה!',
    gradient: 'from-orange-400 to-red-600',
  },
  family_tree_module: {
    icon: <TreeDeciduous className="w-12 h-12 text-white" />,
    title: 'שורשים - בקרוב! \u{1F333}',
    description: 'עץ המשפחה שלנו בפיתוח. בקרוב תוכלו לחקור ולבנות את עץ השורשים של משפחתכם!',
    gradient: 'from-emerald-400 to-teal-600',
  },
};

export const FeatureRoute: React.FC<FeatureRouteProps> = ({ feature, children }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'approver';

  // We read feature flags from a global state that's loaded in App.tsx
  // and passed via context. For now, we use a simpler approach:
  // the FeatureRoute checks window.__featureFlags which App.tsx sets.
  const flags = (window as any).__featureFlags || {};
  const status = flags[feature];

  if (!status || status === 'disabled') return <Navigate to="/" replace />;

  if (status === 'coming_soon' && !isAdmin) {
    const meta = featureFlags[feature];
    if (!meta) return <Navigate to="/" replace />;

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
        <div className={`w-24 h-24 bg-gradient-to-br ${meta.gradient} rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse`}>
          {meta.icon}
        </div>
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
          {meta.title}
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-300 max-w-md mb-4">
          {meta.description}
        </p>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">
          <Clock className="w-4 h-4" />
          <span>הפיצ'ר בשלבי פיתוח אחרונים</span>
        </div>
      </div>
    );
  }

  if (status === 'admin_only' && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
