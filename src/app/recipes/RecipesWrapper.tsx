'use client';

import { Suspense, lazy } from 'react';
import { FeatureRoute } from '../../../components/routing/FeatureRoute';

const RecipesPage = lazy(() =>
  import('../../../components/RecipesPage').then(m => ({ default: m.RecipesPage }))
);

const LazyFallback = () => (
  <div className="flex items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
  </div>
);

export default function RecipesWrapper() {
  return (
    <FeatureRoute feature="recipes_module">
      <div className="w-full animate-in slide-in-from-right duration-300">
        <Suspense fallback={<LazyFallback />}>
          <RecipesPage />
        </Suspense>
      </div>
    </FeatureRoute>
  );
}
