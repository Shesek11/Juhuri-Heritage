'use client';

import React, { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Languages, FileText, RefreshCw, Loader2 } from 'lucide-react';

interface TranslatableContentProps {
  contentType: 'recipe' | 'page' | 'vendor' | 'music';
  contentId: string;
  fields: Record<string, string>; // field_name → Hebrew source text
  children: (translated: Record<string, string> | null, isTranslated: boolean) => React.ReactNode;
}

export default function TranslatableContent({
  contentType,
  contentId,
  fields,
  children,
}: TranslatableContentProps) {
  const locale = useLocale();
  const t = useTranslations('translation');
  const [translated, setTranslated] = useState<Record<string, string> | null>(null);
  const [isTranslated, setIsTranslated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  // Hebrew users see original content — no translation needed
  if (locale === 'he') {
    return <>{children(null, false)}</>;
  }

  const handleTranslate = useCallback(async () => {
    setIsLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          locale,
          fields,
        }),
      });
      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      setTranslated(data.translations);
      setIsTranslated(true);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }, [contentType, contentId, locale, fields]);

  const handleShowOriginal = useCallback(() => {
    setIsTranslated(false);
  }, []);

  const handleReTranslate = useCallback(() => {
    setTranslated(null);
    setIsTranslated(false);
    handleTranslate();
  }, [handleTranslate]);

  return (
    <div>
      {/* Banner */}
      {!isTranslated && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-blue-300">
            <Languages size={16} />
            <span>{t('contentInHebrew')}</span>
          </div>
          <button
            onClick={handleTranslate}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{t('translatePage')}...</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                <span>{t('translatePage')}</span>
              </>
            )}
          </button>
        </div>
      )}

      {isTranslated && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 text-amber-300">
            <Languages size={16} />
            <span>{t('aiTranslated')}</span>
          </div>
          <button
            onClick={handleShowOriginal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium transition-colors"
          >
            <FileText size={14} />
            <span>{t('showOriginal')}</span>
          </button>
        </div>
      )}

      {error && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
          Translation failed. Please try again.
        </div>
      )}

      {/* Content */}
      {children(isTranslated ? translated : null, isTranslated)}
    </div>
  );
}
