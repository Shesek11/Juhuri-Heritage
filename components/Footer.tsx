'use client';

import React from 'react';
import Link from 'next/link';
import { Scroll, Facebook, Instagram, Youtube, HeartHandshake } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAppContext } from './shell/AppContext';

const Footer: React.FC = () => {
  const { orderedFeatures } = useAppContext();
  const t = useTranslations('footer');
  const ts = useTranslations('shell');
  const tc = useTranslations('common');
  const locale = useLocale();

  const getFeatureName = (f: { name: string; name_en?: string | null; name_ru?: string | null }) => {
    if (locale === 'en' && f.name_en) return f.name_en;
    if (locale === 'ru' && f.name_ru) return f.name_ru;
    return f.name;
  };
  const linkClass = "text-slate-300 hover:text-white transition-colors text-sm";

  // Filter features that should show in footer
  const footerFeatures = orderedFeatures.filter(f => f.show_in_footer !== false && f.link);

  return (
    <footer className="bg-[#0d1424] text-slate-300 rounded-t-3xl pt-14 pb-6 font-rubik relative overflow-hidden border-t border-white/5">
      {/* Premium Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-amber-500/5 rounded-[100%] blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start text-center md:text-right">
          <Link href="/" className="flex items-center gap-3 mb-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow duration-500">
              <Scroll size={18} className="text-[#050B14]" />
            </div>
            <span className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors duration-300">{t('brand')}</span>
          </Link>
          <p className="text-slate-300 text-sm leading-relaxed max-w-xs mb-4">
            {t('brandDescription')}
          </p>
          <div className="flex gap-3">
            <span aria-hidden="true" className="text-slate-400"><Facebook size={20} /></span>
            <span aria-hidden="true" className="text-slate-400"><Instagram size={20} /></span>
            <span aria-hidden="true" className="text-slate-400"><Youtube size={20} /></span>
          </div>
        </div>

        {/* Quick Links — dynamic from features */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 drop-shadow-md">{t('links')}</h3>
          <ul className="space-y-2">
            <li><Link href="/" className={linkClass}>{ts('home')}</Link></li>
            {footerFeatures.map(f => (
              <li key={f.feature_key}>
                <Link href={f.link!} className={linkClass}>
                  {getFeatureName(f)}
                  {f.status === 'coming_soon' && <span className="text-xs text-blue-400 mr-1">({tc('comingSoon')})</span>}
                </Link>
              </li>
            ))}
            <li><Link href="/about" className={linkClass}>{t('about')}</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 drop-shadow-md">{t('legal')}</h3>
          <ul className="space-y-2">
            <li><Link href="/privacy" className={linkClass}>{t('privacy')}</Link></li>
            <li><Link href="/accessibility" className={linkClass}>{t('accessibility')}</Link></li>
            <li><Link href="/contact" className={linkClass}>{t('contact')}</Link></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-slate-300 relative z-10 mx-6 sm:mx-10 md:mx-auto max-w-6xl">
        <p>{t('copyright', { year: new Date().getFullYear() })}</p>
        <p className="flex items-center justify-center gap-1 mt-1">
          {t.rich('madeWithLove', {
            icon: () => <HeartHandshake size={12} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />,
          })}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
