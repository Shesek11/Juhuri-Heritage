import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import FamilyTreeLoader from './FamilyTreeLoader';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'features' });
  return {
    title: t('family_tree_module.title'),
    description: t('family_tree_module.description'),
    alternates: { canonical: '/family' },
  };
}

export default function FamilyPage() {
  return <FamilyTreeLoader />;
}
