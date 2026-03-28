'use client';

import { Suspense, lazy } from 'react';
import { useAppContext } from '../../../components/shell/AppContext';

const HomePage = lazy(() => import('../../../components/HomePage'));

const LazyFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
  </div>
);

export default function HomePageWrapper() {
  const { featureFlags, openAuthModal, isAdmin } = useAppContext();

  return (
    <Suspense fallback={<LazyFallback />}>
      <HomePage
        featureFlags={featureFlags}
        onOpenAuthModal={openAuthModal}
        isAdmin={isAdmin}
      />
    </Suspense>
  );
}
