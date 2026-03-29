import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['he', 'en', 'ru'] as const,
  defaultLocale: 'he',
  localePrefix: 'always',
  localeDetection: false,
  localeCookie: {
    name: 'NEXT_LOCALE',
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  },
});

export type Locale = (typeof routing.locales)[number];
