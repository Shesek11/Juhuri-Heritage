import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getTranslations } from 'next-intl/server';

const AboutPage = dynamic(() => import('../../../../components/AboutPage'), {
  loading: () => (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
    </div>
  ),
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages' });
  return {
    title: t('aboutTitle'),
    description: t('aboutSubtitle'),
    alternates: { canonical: '/about' },
  };
}

export default function About() {
  return <AboutPage />;
}
