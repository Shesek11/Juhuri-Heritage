import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import MarketplaceWrapper from './MarketplaceWrapper';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'marketplace' });
  const title = t('pageTitle');
  return {
    title,
    openGraph: {
      title,
      type: 'website',
      url: `${SITE_URL}/marketplace`,
    },
    alternates: {
      canonical: `${SITE_URL}/marketplace`,
    },
  };
}

export default function MarketplaceListPage() {
  return <MarketplaceWrapper />;
}
