'use client';

import { Suspense } from 'react';
import DictionaryPage from '../../../components/DictionaryPage';
import { useAppContext } from '../../../components/shell/AppContext';

function SearchContent() {
  const { dialects, openAuthModal, openContributeModal, setTranslationModalEntry, openWordListModal } = useAppContext();

  return (
    <DictionaryPage
      dialects={dialects}
      onOpenContribute={openContributeModal}
      onOpenAuthModal={openAuthModal}
      onOpenTranslationModal={setTranslationModalEntry}
      onOpenWordListModal={openWordListModal}
    />
  );
}

export default function DictionaryWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
