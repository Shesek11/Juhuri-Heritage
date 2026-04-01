'use client';

import React from 'react';
import { Link } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Home, BookOpen, Globe, Users } from 'lucide-react';

const AboutPage: React.FC = () => {
  const t = useTranslations('about');
  const tp = useTranslations('pages');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12">
      <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden">

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-white/10 text-center bg-white/5">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-2">
            {t('title')}
          </h1>
        </div>

        {/* Content */}
        <div className="p-6 md:p-10 space-y-10 text-slate-300 leading-relaxed">

          {/* Welcome */}
          <div className="bg-amber-900/20 p-6 rounded-2xl border border-amber-900/50">
            <h2 className="font-bold text-amber-100 text-xl mb-3">{t('welcomeTitle')}</h2>
            <p className="text-amber-200/80">{t('welcomeText')}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: '46,000+', label: t('statsEntries'), icon: <BookOpen size={20} /> },
              { value: '3', label: t('statsLanguages'), icon: <Globe size={20} /> },
              { value: '3', label: t('statsDialects'), icon: <Users size={20} /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl border border-white/10 p-4 text-center">
                <div className="text-amber-400 mb-2 flex justify-center">{stat.icon}</div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* What is Juhuri */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">{t('whatIsTitle')}</h2>
            <p className="text-slate-300 leading-relaxed mb-3">{t('whatIsText1')}</p>
            <p className="text-slate-300 leading-relaxed">{t('whatIsText2')}</p>
          </section>

          {/* Dictionary */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">{t('dictionaryTitle')}</h2>
            <p className="text-slate-300 leading-relaxed">{t('dictionaryText')}</p>
          </section>

          {/* Mission */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">{t('missionTitle')}</h2>
            <p className="text-slate-300 leading-relaxed">{t('missionText')}</p>
          </section>

          {/* Team */}
          <section>
            <h2 className="text-xl font-bold text-white mb-3">{t('teamTitle')}</h2>
            <p className="text-slate-300 leading-relaxed">
              {t('teamText')}{' '}
              <Link href="/contact" className="text-amber-400 hover:underline">{t('contactLink')}</Link>.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
            <Home size={18} />
            {tp('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
