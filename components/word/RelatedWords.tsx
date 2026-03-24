import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { partOfSpeechHebrew } from '../../utils/pos';

interface RelatedWord {
  id: string;
  term: string;
  hebrew: string;
  partOfSpeech?: string;
}

interface RelatedWordsProps {
  relatedWords: RelatedWord[];
}

const RelatedWords: React.FC<RelatedWordsProps> = ({ relatedWords }) => {
  if (relatedWords.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">
        מילים קשורות
      </h3>

      <div className="flex flex-wrap gap-2">
        {relatedWords.map((word) => (
          <a
            key={word.id}
            href={`/word/${encodeURIComponent(word.term)}`}
            className="group/related flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-500/40 transition-all"
          >
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-200 group-hover/related:text-indigo-300 transition-colors">
                {word.term}
              </span>
              <span className="text-xs text-slate-400">
                {word.hebrew}
                {word.partOfSpeech && (
                  <span className="text-slate-600 mr-1">
                    ({partOfSpeechHebrew(word.partOfSpeech)})
                  </span>
                )}
              </span>
            </div>
            <ArrowLeft size={14} className="text-slate-600 group-hover/related:text-indigo-400 transition-colors shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
};

export default RelatedWords;
