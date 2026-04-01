import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import DictionarySearch from './DictionarySearch';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'search' });
  return {
    title: t('pageTitle'),
    description: t('defaultDescription'),
    alternates: {
      canonical: `/${locale}/dictionary`,
      languages: {
        he: '/he/dictionary',
        en: '/en/dictionary',
        ru: '/ru/dictionary',
        'x-default': '/he/dictionary',
      },
    },
  };
}

export default function DictionaryPage() {
  return (
    <main className="min-h-screen overflow-x-hidden min-w-0 w-full">
      <DictionarySearch />
    </main>
  );
}
