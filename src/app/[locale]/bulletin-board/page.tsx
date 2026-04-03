import type { Metadata } from 'next';
import { Megaphone, Bell } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'features' });
  return {
    title: `${t('bulletin_board_teaser.heading')} — ${t('bulletin_board_teaser.badge')}`,
    description: t('bulletin_board_teaser.description'),
    alternates: {
      canonical: `/${locale}/bulletin-board`,
      languages: { he: '/he/bulletin-board', en: '/en/bulletin-board', ru: '/ru/bulletin-board', 'x-default': '/he/bulletin-board' },
    },
  };
}

export default async function BulletinBoardPage() {
  const t = await getTranslations('features');

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="max-w-lg text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-sky-400 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Megaphone size={40} className="text-[#050B14]" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">{t('bulletin_board_teaser.heading')}</h1>
        <p className="text-lg text-slate-400 mb-8 leading-relaxed">
          {t('bulletin_board_teaser.description')}
        </p>

        <div className="inline-flex items-center gap-2 px-5 py-3 bg-sky-500/10 border border-sky-500/30 rounded-full text-sky-400 font-medium mb-8">
          <Bell size={18} />
          <span>{t('bulletin_board_teaser.badge')}</span>
        </div>

        <div className="mt-4">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            {t('bulletin_board_teaser.backHome')}
          </Link>
        </div>
      </div>
    </main>
  );
}
