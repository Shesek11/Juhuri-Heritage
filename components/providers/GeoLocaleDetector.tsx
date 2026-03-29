'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';

/**
 * Timezone → locale mapping.
 * Runs once on first visit (no NEXT_LOCALE cookie).
 * Sets cookie so it never runs again.
 */

const RUSSIAN_TIMEZONES = new Set([
  'Europe/Moscow',
  'Europe/Kaliningrad',
  'Europe/Samara',
  'Europe/Volgograd',
  'Asia/Yekaterinburg',
  'Asia/Omsk',
  'Asia/Novosibirsk',
  'Asia/Barnaul',
  'Asia/Tomsk',
  'Asia/Novokuznetsk',
  'Asia/Krasnoyarsk',
  'Asia/Irkutsk',
  'Asia/Chita',
  'Asia/Yakutsk',
  'Asia/Vladivostok',
  'Asia/Magadan',
  'Asia/Sakhalin',
  'Asia/Kamchatka',
  'Asia/Anadyr',
  // CIS countries with large Russian-speaking populations
  'Asia/Almaty',       // Kazakhstan
  'Asia/Tashkent',     // Uzbekistan
  'Asia/Bishkek',      // Kyrgyzstan
  'Asia/Dushanbe',     // Tajikistan
  'Asia/Ashgabat',     // Turkmenistan
  'Asia/Baku',         // Azerbaijan
  'Asia/Tbilisi',      // Georgia
  'Europe/Minsk',      // Belarus
  'Europe/Kiev',       // Ukraine
  'Europe/Chisinau',   // Moldova
]);

const HEBREW_TIMEZONES = new Set([
  'Asia/Jerusalem',
  'Asia/Tel_Aviv',
]);

function detectLocaleFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (HEBREW_TIMEZONES.has(tz)) return 'he';
    if (RUSSIAN_TIMEZONES.has(tz)) return 'ru';
    return 'en';
  } catch {
    return 'he'; // fallback
  }
}

export default function GeoLocaleDetector() {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Only run if no NEXT_LOCALE cookie exists (first visit)
    const hasLocaleCookie = document.cookie
      .split(';')
      .some(c => c.trim().startsWith('NEXT_LOCALE='));

    if (hasLocaleCookie) return;

    const detectedLocale = detectLocaleFromTimezone();

    // Set cookie so this never runs again
    document.cookie = `NEXT_LOCALE=${detectedLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;

    // Redirect if detected locale differs from current
    if (detectedLocale !== currentLocale) {
      router.replace(pathname, { locale: detectedLocale });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
