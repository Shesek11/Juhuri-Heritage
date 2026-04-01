import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import ContactClient from './ContactClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'contact' });
  return {
    title: t('pageTitle'),
    alternates: {
      canonical: `/${locale}/contact`,
      languages: { he: '/he/contact', en: '/en/contact', ru: '/ru/contact', 'x-default': '/he/contact' },
    },
  };
}

export default function Contact() {
  return <ContactClient />;
}
