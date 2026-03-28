'use client';

import { createContext, useContext } from 'react';
import { DialectItem } from '../../types';
import { FeatureFlagsMap, FeatureFlag } from '../../services/featureFlagService';

export interface TranslationModalEntry {
  id: number;
  term: string;
  existingTranslation?: { id?: number; dialect: string; hebrewScript: string; latinScript: string; cyrillicScript: string };
}

export interface WordListModalState {
  isOpen: boolean;
  category: 'hebrew-only' | 'juhuri-only' | 'missing-dialects' | 'missing-audio';
  title: string;
  totalCount: number;
  featuredTerm?: string;
}

export interface AppContextType {
  // Modal handlers
  openAuthModal: (reason?: string) => void;
  openContributeModal: () => void;
  setTranslationModalEntry: (entry: TranslationModalEntry | null) => void;
  openWordListModal: (category: WordListModalState['category'], title: string, totalCount: number, featuredTerm?: string) => void;

  // Data
  dialects: DialectItem[];
  featureFlags: FeatureFlagsMap;
  orderedFeatures: FeatureFlag[];
  featureFlagsLoaded: boolean;
  isAdmin: boolean;

  // Branding
  siteLogo: string | null;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppShell');
  return ctx;
}
