'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import WordPage, { EnrichmentData } from '../../../../../components/word/WordPage';
import { useAppContext } from '../../../../../components/shell/AppContext';
import apiService, { geminiApi } from '../../../../../services/apiService';
import type { DictionaryEntry } from '../../../../../types';

export default function DictionaryWrapper() {
  const { openAuthModal, openContributeModal, setTranslationModalEntry } = useAppContext();
  const params = useParams();
  const term = params?.term ? decodeURIComponent(params.term as string) : '';

  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrichmentData, setEnrichmentData] = useState<EnrichmentData | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(false);

  useEffect(() => {
    if (!term) return;
    const fetchEntry = async () => {
      setLoading(true);
      setError('');
      setEnrichmentData(null);
      setEnrichmentLoading(false);
      try {
        const res = await apiService.get<{ found: boolean; entry: DictionaryEntry }>(
          `/dictionary/entry/${encodeURIComponent(term)}`
        );
        if (res.found && res.entry) {
          setEntry(res.entry);

          // Trigger AI enrichment for missing fields
          const e = res.entry;
          const t = e.dialectScripts?.[0];
          const knownFields: Record<string, string> = {};
          const missingFields: string[] = [];

          if (e.russianShort) knownFields.russian = e.russianShort;
          if (e.hebrewShort) knownFields.hebrew = e.hebrewShort;
          if (t?.latinScript) knownFields.latin = t.latinScript;
          if (t?.cyrillicScript) knownFields.cyrillic = t.cyrillicScript;
          if (e.hebrewLong) knownFields.definition = e.hebrewLong;
          if (t?.pronunciationGuide) knownFields.pronunciationGuide = t.pronunciationGuide;
          if (e.partOfSpeech) knownFields.partOfSpeech = e.partOfSpeech;

          if (!e.hebrewScript) missingFields.push('hebrewTransliteration');
          if (!e.hebrewShort) missingFields.push('hebrew');
          if (!t?.latinScript) missingFields.push('latin');
          if (!t?.cyrillicScript) missingFields.push('cyrillic');
          if (!e.russianShort) missingFields.push('russian');
          if (!t?.pronunciationGuide) missingFields.push('pronunciationGuide');
          if (!e.partOfSpeech) missingFields.push('partOfSpeech');
          if (!e.hebrewLong) missingFields.push('definition');

          const hasContext = knownFields.russian || knownFields.hebrew || knownFields.latin || e.hebrewScript;
          if (missingFields.length > 0 && hasContext) {
            setEnrichmentLoading(true);
            geminiApi.enrich(missingFields, knownFields)
              .then((res: any) => {
                if (res.enrichment) {
                  setEnrichmentData(res.enrichment as EnrichmentData);
                }
              })
              .catch(() => {})
              .finally(() => setEnrichmentLoading(false));
          }
        } else {
          setError('הערך לא נמצא במילון');
        }
      } catch {
        setError('שגיאה בטעינת הערך');
      }
      setLoading(false);
    };
    fetchEntry();
  }, [term]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <div className="text-5xl mb-4">😔</div>
          <h2 className="text-xl font-bold text-white mb-2">{error || 'הערך לא נמצא'}</h2>
          <p className="text-slate-400 text-sm mb-4">
            הערך "{term}" לא נמצא במילון. נסה לחפש במילון.
          </p>
          <a href="/dictionary" className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            חזרה לחיפוש
          </a>
        </div>
      </div>
    );
  }

  return (
    <WordPage
      entry={entry}
      onOpenAuthModal={openAuthModal}
      enrichmentData={enrichmentData}
      enrichmentLoading={enrichmentLoading}
    />
  );
}
