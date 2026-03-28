'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/src/i18n/navigation';

const LOCALES = [
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
] as const;

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
    // Set cookie explicitly to ensure persistence across navigations
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-all text-slate-300 hover:text-white"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <span className="text-base leading-none">{currentLocale.flag}</span>
        <span className="text-xs font-medium hidden sm:inline">{currentLocale.label}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-36 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {LOCALES.map(l => (
            <button
              key={l.code}
              type="button"
              onClick={() => switchLocale(l.code)}
              className={`w-full text-right px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                l.code === locale
                  ? 'bg-amber-500/10 text-amber-400 font-medium'
                  : 'text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
