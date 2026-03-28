'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

function FamilyTreeLoading() {
  const t = useTranslations('family');
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center text-slate-400 dark:text-slate-500">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p>{t('loadingTree')}</p>
      </div>
    </div>
  );
}

const FamilyTreeClient = dynamic(() => import('./FamilyTreeClient'), {
  ssr: false,
  loading: () => <FamilyTreeLoading />,
});

export default function FamilyTreeLoader() {
  return <FamilyTreeClient />;
}
