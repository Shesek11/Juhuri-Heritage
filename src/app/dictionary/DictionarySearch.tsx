'use client';

import DictionaryPage from '../../../components/DictionaryPage';
import { useAppContext } from '../../../components/shell/AppContext';

export default function DictionaryWrapper() {
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
