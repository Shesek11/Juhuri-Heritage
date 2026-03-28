'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';

export default function HtmlLangSetter() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.dir = locale === 'he' ? 'rtl' : 'ltr';

    // Set cookie so middleware knows the locale
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;

    // Broadcast locale change to other tabs
    try {
      const bc = new BroadcastChannel('juhuri-locale');
      bc.postMessage({ locale });
      bc.close();
    } catch {}
  }, [locale]);

  // Listen for locale changes from other tabs
  useEffect(() => {
    try {
      const bc = new BroadcastChannel('juhuri-locale');
      bc.onmessage = (event) => {
        const newLocale = event.data?.locale;
        if (newLocale && newLocale !== locale && ['he', 'en', 'ru'].includes(newLocale)) {
          router.replace(pathname, { locale: newLocale });
        }
      };
      return () => bc.close();
    } catch {
      return undefined;
    }
  }, [locale, router, pathname]);

  return null;
}
