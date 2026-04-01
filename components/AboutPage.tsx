'use client';

import React from 'react';
import { Link } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Home, BookOpen, Globe, Users, Search, Lightbulb, Heart, GraduationCap,
  MapPin,
} from 'lucide-react';

const AboutPage: React.FC = () => {
  const t = useTranslations('about');
  const tp = useTranslations('pages');

  const timeline = [
    { year: t('timeline1Year'), title: t('timeline1Title'), text: t('timeline1Text'), color: 'from-amber-500 to-orange-600' },
    { year: t('timeline2Year'), title: t('timeline2Title'), text: t('timeline2Text'), color: 'from-emerald-500 to-teal-600' },
    { year: t('timeline3Year'), title: t('timeline3Title'), text: t('timeline3Text'), color: 'from-red-500 to-rose-600' },
    { year: t('timeline4Year'), title: t('timeline4Title'), text: t('timeline4Text'), color: 'from-blue-500 to-indigo-600' },
    { year: t('timeline5Year'), title: t('timeline5Title'), text: t('timeline5Text'), color: 'from-amber-400 to-amber-600' },
  ];

  const steps = [
    { icon: <Search size={24} />, title: t('howStep1Title'), text: t('howStep1Text'), color: 'text-blue-400' },
    { icon: <Lightbulb size={24} />, title: t('howStep2Title'), text: t('howStep2Text'), color: 'text-amber-400' },
    { icon: <Heart size={24} />, title: t('howStep3Title'), text: t('howStep3Text'), color: 'text-rose-400' },
    { icon: <GraduationCap size={24} />, title: t('howStep4Title'), text: t('howStep4Text'), color: 'text-emerald-400' },
  ];

  const communities = [
    { flag: '🇮🇱', name: t('mapIsrael'), text: t('mapIsraelText') },
    { flag: '🇺🇸', name: t('mapUSA'), text: t('mapUSAText') },
    { flag: '🇷🇺', name: t('mapRussia'), text: t('mapRussiaText') },
    { flag: '🇦🇿', name: t('mapAzerbaijan'), text: t('mapAzerbaijanText') },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 space-y-8">

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0d1424] via-[#111c33] to-[#0d1424] border border-white/10 p-8 md:p-12 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(217,119,6,0.08),transparent_60%)]" />
        <div className="relative">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4">{t('title')}</h1>
          <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">{t('welcomeText')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { value: '46,000+', label: t('statsEntries'), icon: <BookOpen size={22} /> },
          { value: '3', label: t('statsLanguages'), icon: <Globe size={22} /> },
          { value: '3', label: t('statsDialects'), icon: <Users size={22} /> },
        ].map((stat) => (
          <div key={stat.label} className="bg-[#0d1424]/60 backdrop-blur rounded-xl border border-white/10 p-5 text-center hover:border-amber-500/30 transition-all">
            <div className="text-amber-400 mb-2 flex justify-center">{stat.icon}</div>
            <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* What is Juhuri */}
      <div className="bg-[#0d1424]/60 backdrop-blur rounded-2xl border border-white/10 p-6 md:p-10">
        <h2 className="text-2xl font-bold text-white mb-4">{t('whatIsTitle')}</h2>
        <div className="space-y-4 text-slate-300 leading-relaxed">
          <p>{t('whatIsText1')}</p>
          <p>{t('whatIsText2')}</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-[#0d1424]/60 backdrop-blur rounded-2xl border border-white/10 p-6 md:p-10">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">{t('timelineTitle')}</h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute start-[18px] md:start-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/40 via-white/10 to-amber-500/40" />
          <div className="space-y-8">
            {timeline.map((item, i) => (
              <div key={i} className={`relative flex items-start gap-4 md:gap-8 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                {/* Dot */}
                <div className="absolute start-[11px] md:start-1/2 md:-translate-x-1/2 top-1 z-10">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${item.color} ring-4 ring-[#0d1424]`} />
                </div>
                {/* Content */}
                <div className={`ms-10 md:ms-0 md:w-[calc(50%-2rem)] ${i % 2 === 0 ? 'md:text-end md:pe-8' : 'md:text-start md:ps-8'}`}>
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${item.color} text-white mb-2`}>
                    {item.year}
                  </span>
                  <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#0d1424]/60 backdrop-blur rounded-2xl border border-white/10 p-6 md:p-10">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">{t('howItWorksTitle')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div key={i} className="relative bg-white/5 rounded-xl border border-white/10 p-5 text-center hover:border-white/20 transition-all group">
              <div className="absolute -top-3 -start-2 w-7 h-7 rounded-full bg-slate-800 border border-white/20 flex items-center justify-center text-xs font-bold text-amber-400">
                {i + 1}
              </div>
              <div className={`${step.color} mb-3 flex justify-center group-hover:scale-110 transition-transform`}>{step.icon}</div>
              <h3 className="text-white font-bold mb-1">{step.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Where is Juhuri spoken */}
      <div className="bg-[#0d1424]/60 backdrop-blur rounded-2xl border border-white/10 p-6 md:p-10">
        <h2 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
          <MapPin size={22} className="text-amber-400" />
          {t('mapTitle')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {communities.map((c, i) => (
            <div key={i} className="flex items-start gap-4 bg-white/5 rounded-xl border border-white/10 p-4 hover:border-amber-500/30 transition-all">
              <span className="text-3xl shrink-0">{c.flag}</span>
              <div>
                <h3 className="text-white font-bold">{c.name}</h3>
                <p className="text-slate-400 text-sm">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dictionary + Mission + Team */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0d1424]/60 backdrop-blur rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-3">{t('dictionaryTitle')}</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{t('dictionaryText')}</p>
        </div>
        <div className="bg-[#0d1424]/60 backdrop-blur rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-bold text-white mb-3">{t('missionTitle')}</h2>
          <p className="text-slate-300 text-sm leading-relaxed">{t('missionText')}</p>
        </div>
      </div>

      {/* Team */}
      <div className="bg-amber-900/20 rounded-2xl border border-amber-900/50 p-6 text-center">
        <h2 className="text-xl font-bold text-amber-100 mb-3">{t('teamTitle')}</h2>
        <p className="text-amber-200/80 mb-4">{t('teamText')}</p>
        <Link href="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all">
          {t('contactLink')}
        </Link>
      </div>

      {/* Back home */}
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
          <Home size={18} />
          {tp('backHome')}
        </Link>
      </div>
    </div>
  );
};

export default AboutPage;
