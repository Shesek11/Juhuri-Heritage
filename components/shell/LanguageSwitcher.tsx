'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';

const LOCALES = [
  { code: 'he', label: 'עברית', short: 'HE' },
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ru', label: 'Русский', short: 'RU' },
] as const;

// Small inline SVG flags that work on all platforms (no emoji dependency)
function FlagIcon({ code }: { code: string }) {
  switch (code) {
    case 'he':
      return (
        <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[2px] shadow-sm">
          <rect width="24" height="16" fill="white" />
          <rect y="1.5" width="24" height="2" fill="#0038b8" />
          <rect y="12.5" width="24" height="2" fill="#0038b8" />
          <path d="M12 4L14.5 8.5H9.5L12 4Z" fill="none" stroke="#0038b8" strokeWidth="0.8" />
          <path d="M12 12L9.5 7.5H14.5L12 12Z" fill="none" stroke="#0038b8" strokeWidth="0.8" />
        </svg>
      );
    case 'en':
      return (
        <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[2px] shadow-sm">
          <rect width="24" height="16" fill="#B22234" />
          {[0,2,4,6,8,10,12].map(i => <rect key={i} y={i * 1.23} width="24" height="1.23" fill={i % 2 === 0 ? '#B22234' : 'white'} />)}
          <rect width="9.6" height="8.6" fill="#3C3B6E" />
          {[1,2.5,4,5.5,7].map((y,i) => <circle key={i} cx={i % 2 === 0 ? 2 : 3.2} cy={y} r="0.5" fill="white" />)}
          {[1,2.5,4,5.5,7].map((y,i) => <circle key={`b${i}`} cx={i % 2 === 0 ? 5 : 6.2} cy={y} r="0.5" fill="white" />)}
          {[1,2.5,4,5.5].map((y,i) => <circle key={`c${i}`} cx={8} cy={y} r="0.5" fill="white" />)}
        </svg>
      );
    case 'ru':
      return (
        <svg viewBox="0 0 24 16" className="w-5 h-3.5 rounded-[2px] shadow-sm">
          <rect width="24" height="5.33" fill="white" />
          <rect y="5.33" width="24" height="5.33" fill="#0039A6" />
          <rect y="10.66" width="24" height="5.34" fill="#D52B1E" />
        </svg>
      );
    default:
      return null;
  }
}

export default function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLocale = LOCALES.find(l => l.code === locale) || LOCALES[0];

  const switchLocale = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-all text-slate-300 hover:text-white"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <FlagIcon code={locale} />
        <span className="text-xs font-medium hidden sm:inline">{currentLocale.short}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-40 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {LOCALES.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => switchLocale(l.code)}
              className={`w-full px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors ${
                l.code === locale
                  ? 'bg-amber-500/10 text-amber-400 font-medium'
                  : 'text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <FlagIcon code={l.code} />
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
