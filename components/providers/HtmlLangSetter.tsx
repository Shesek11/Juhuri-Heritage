'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';

export default function HtmlLangSetter() {
  const locale = useLocale();

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === 'he' ? 'rtl' : 'ltr';

    // Ensure the locale cookie is always in sync with the current page locale
    // This prevents stale cookies from causing locale mismatch on navigation
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
  }, [locale]);

  return null;
}
