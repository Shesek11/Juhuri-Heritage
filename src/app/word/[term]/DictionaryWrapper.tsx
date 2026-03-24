'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import WordPage from '../../../../components/word/WordPage';
import { useAppContext } from '../../../../components/shell/AppContext';
import apiService from '../../../../services/apiService';
import type { DictionaryEntry } from '../../../../types';

export default function DictionaryWrapper() {
  const { openAuthModal, openContributeModal, setTranslationModalEntry } = useAppContext();
  const params = useParams();
  const term = params?.term ? decodeURIComponent(params.term as string) : '';

  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!term) return;
    const fetchEntry = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiService.get<{ found: boolean; entry: DictionaryEntry }>(
          `/dictionary/entry/${encodeURIComponent(term)}`
        );
        if (res.found && res.entry) {
          setEntry(res.entry);
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
    />
  );
}
