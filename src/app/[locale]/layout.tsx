import type { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { routing, type Locale } from '@/src/i18n/routing';
import AppProviders from '../../../components/providers/AppProviders';
import HtmlLangSetter from '../../../components/providers/HtmlLangSetter';
import GeoLocaleDetector from '../../../components/providers/GeoLocaleDetector';
import { getSeoSettings } from '@/src/lib/seo-settings';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

const OG_LOCALE_MAP: Record<Locale, string> = {
  he: 'he_IL',
  en: 'en_US',
  ru: 'ru_RU',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const settings = await getSeoSettings();
  const ogImage = settings.ogImage || '/images/og-default.png';
  const favicon = settings.favicon;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t('defaultTitle'),
      template: t('titleTemplate'),
    },
    description: t('description'),
    keywords: [
      "ג'והורי", "מילון ג'והורי", "יהודי ההרים", "שפת יהודי ההרים", "יהודי קווקז",
      'Juhuri', 'Juhuri dictionary', 'Judeo-Tat', 'Mountain Jews', 'Mountain Jews language',
      'Джуури', 'горские евреи', 'горско-еврейский язык', 'горско-еврейский словарь',
    ],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        he: '/he',
        en: '/en',
        ru: '/ru',
        'x-default': '/he',
      },
    },
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      type: 'website',
      locale: OG_LOCALE_MAP[locale as Locale] || 'he_IL',
      siteName: t('siteName'),
      // images handled by opengraph-image.tsx (or admin override)
    },
    twitter: {
      card: 'summary_large_image',
      title: t('ogTitle'),
      description: t('description'),
      // images handled by opengraph-image.tsx (or admin override)
    },
    verification: {
      google: 'A3yUQjWHTO2y6V4kjV3k61E43gkDr4yxavoZfyxKc4U',
    },
    icons: favicon
      ? { icon: favicon }
      : {
          icon: [
            { url: '/favicon.ico', sizes: 'any' },
            { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
            { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
          ],
          apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
        },
  };
}

function buildJsonLd(locale: string, siteName: string, siteLogo?: string | null) {
  const logoUrl = siteLogo ? `${SITE_URL}${siteLogo}` : `${SITE_URL}/images/logo.png`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: siteName,
        inLanguage: locale,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/${locale}/dictionary?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: siteName,
        url: SITE_URL,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
        },
      },
    ],
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'metadata' });
  const settings = await getSeoSettings();
  const dir = locale === 'he' ? 'rtl' : 'ltr';
  // JSON-LD is built from trusted server-side data only (no user input)
  const jsonLdString = JSON.stringify(buildJsonLd(locale, t('siteName'), settings.siteLogo));

  return (
    <NextIntlClientProvider locale={locale}>
      <HtmlLangSetter />
      <GeoLocaleDetector />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString }}
      />
      <AppProviders>{children}</AppProviders>
    </NextIntlClientProvider>
  );
}
