'use client';

import { createContext, useContext } from 'react';
import { DialectItem } from '../../types';
import { FeatureFlagsMap } from '../../services/featureFlagService';

export interface TranslationModalEntry {
  id: number;
  term: string;
  existingTranslation?: { id?: number; dialect: string; hebrew: string; latin: string; cyrillic: string };
}

export interface WordListModalState {
  isOpen: boolean;
  category: 'hebrew-only' | 'juhuri-only' | 'missing-dialects' | 'missing-audio';
  title: string;
  totalCount: number;
}

export interface AppContextType {
  // Modal handlers
  openAuthModal: (reason?: string) => void;
  openContributeModal: () => void;
  setTranslationModalEntry: (entry: TranslationModalEntry | null) => void;
  openWordListModal: (category: WordListModalState['category'], title: string, totalCount: number) => void;

  // Data
  dialects: DialectItem[];
  featureFlags: FeatureFlagsMap;
  featureFlagsLoaded: boolean;
  isAdmin: boolean;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppShell');
  return ctx;
}
