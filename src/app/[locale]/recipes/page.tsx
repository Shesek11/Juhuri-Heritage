import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import RecipesWrapper from './RecipesWrapper';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'recipes' });
  const title = t('metaTitle');
  const description = t('metaDescription');

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${SITE_URL}/recipes`,
    },
    alternates: {
      canonical: `${SITE_URL}/recipes`,
    },
  };
}

export default function RecipesPage() {
  return <RecipesWrapper />;
}
