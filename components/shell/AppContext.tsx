'use client';

import { createContext, useContext } from 'react';
import { DialectItem } from '../../types';
import { FeatureFlagsMap, FeatureFlag } from '../../services/featureFlagService';

export interface TranslationModalEntry {
  id: number;
  term: string;
  existingTranslation?: { id?: number; dialect: string; hebrewScript: string; latinScript: string; cyrillicScript: string };
}

export type ContributionCategory =
  | 'hebrew-only' | 'juhuri-only' // legacy
  | 'missing-dialects' | 'missing-audio' // universal
  | 'missing-script-hebrew' | 'missing-script-latin' | 'missing-script-cyrillic' // per-script
  | 'missing-meaning-he' | 'missing-meaning-en' | 'missing-meaning-ru'; // per-language

/** Maps a ContributionCategory to its API path under /dictionary/ */
export function categoryToApiPath(category: ContributionCategory): string {
  if (category.startsWith('missing-script-')) {
    const type = category.replace('missing-script-', '');
    return `missing-script?type=${type}`;
  }
  if (category.startsWith('missing-meaning-')) {
    const lang = category.replace('missing-meaning-', '');
    return `missing-meaning?lang=${lang}`;
  }
  return category; // hebrew-only, juhuri-only, missing-dialects, missing-audio
}

export interface WordListModalState {
  isOpen: boolean;
  category: ContributionCategory;
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
