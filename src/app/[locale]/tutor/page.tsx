import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import TutorClient from './TutorClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tutor' });
  return {
    title: t('pageTitle'),
    alternates: {
      canonical: `/${locale}/tutor`,
      languages: { he: '/he/tutor', en: '/en/tutor', ru: '/ru/tutor', 'x-default': '/he/tutor' },
    },
  };
}

export default function TutorPage() {
  return <TutorClient />;
}
