import type { Metadata } from 'next';
import { Music, Bell } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'features' });
  return {
    title: `${t('music_teaser.heading')} — ${t('music_teaser.badge')}`,
    description: t('music_teaser.description'),
    alternates: {
      canonical: `/${locale}/music`,
      languages: { he: '/he/music', en: '/en/music', ru: '/ru/music', 'x-default': '/he/music' },
    },
  };
}

export default async function MusicPage() {
  const t = await getTranslations('features');

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-lg text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Music size={40} className="text-[#050B14]" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">{t('music_teaser.heading')}</h1>
        <p className="text-lg text-slate-400 mb-8 leading-relaxed">
          {t('music_teaser.description')}
        </p>

        <div className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 font-medium mb-8">
          <Bell size={18} />
          <span>{t('music_teaser.badge')}</span>
        </div>

        <div className="mt-4">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            {t('music_teaser.backHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
