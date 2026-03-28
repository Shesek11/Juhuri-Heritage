import React from 'react';
import { useTranslations } from 'next-intl';
import { BookOpen, ExternalLink } from 'lucide-react';

interface Props {
  note: string;
  link?: string;
}

export default function CulturalNote({ note, link }: Props) {
  const t = useTranslations('tutor');
  return (
    <div className="bg-gradient-to-r from-amber-500/[0.06] to-orange-500/[0.06] border border-amber-500/15 rounded-xl p-3 sm:p-4">
      <div className="flex items-start gap-2.5">
        <BookOpen size={16} className="text-amber-500/70 mt-0.5 shrink-0" />
        <div>
          <p className="text-[11px] sm:text-xs text-amber-300/70 font-bold mb-1">{t('didYouKnow')}</p>
          <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">{note}</p>
          {link && (
            <a
              href={link}
              className="inline-flex items-center gap-1 text-[11px] sm:text-xs text-amber-500/80 hover:text-amber-400 mt-1.5 transition-colors"
            >
              {t('learnMore')} <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
