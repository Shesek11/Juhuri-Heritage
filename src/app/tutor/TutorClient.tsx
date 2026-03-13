'use client';

import { Suspense, lazy } from 'react';

const TutorMode = lazy(() => import('../../../components/TutorMode'));

const LazyFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
  </div>
);

export default function TutorClient() {
  return (
    <div className="w-full animate-in slide-in-from-right duration-300">
      <Suspense fallback={<LazyFallback />}>
        <TutorMode />
      </Suspense>
    </div>
  );
}
