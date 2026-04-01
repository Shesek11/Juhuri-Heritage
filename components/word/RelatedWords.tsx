import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/src/i18n/navigation';
import { ArrowLeft } from 'lucide-react';
import { partOfSpeechHebrew } from '../../utils/pos';

interface RelatedWord {
  id: string;
  slug?: string | null;
  hebrewScript: string;
  hebrewShort: string;
  partOfSpeech?: string;
}

interface RelatedWordsProps {
  relatedWords: RelatedWord[];
}

const RelatedWords: React.FC<RelatedWordsProps> = ({ relatedWords }) => {
  const t = useTranslations('word');
  if (relatedWords.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm uppercase tracking-wider text-slate-300 dark:text-slate-300 font-bold">
        {t('relatedWords')}
      </h2>

      <div className="flex flex-wrap gap-2">
        {relatedWords.map((word) => (
          <Link
            key={word.id}
            href={`/word/${word.slug || encodeURIComponent(word.hebrewScript)}`}
            className="group/related flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 transition-all"
          >
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-200 group-hover/related:text-indigo-300 transition-colors">
                {word.hebrewScript}
              </span>
              <span className="text-xs text-slate-300">
                {word.hebrewShort}
                {word.partOfSpeech && (
                  <span className="text-slate-600 ms-1">
                    ({partOfSpeechHebrew(word.partOfSpeech)})
                  </span>
                )}
              </span>
            </div>
            <ArrowLeft size={14} className="text-slate-600 group-hover/related:text-indigo-400 transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RelatedWords;
