import React from 'react';
import { Lightbulb } from 'lucide-react';
import { FuzzySuggestion } from '../../types';

interface FuzzyMatchBannerProps {
  suggestions: FuzzySuggestion[];
  onSelect: (term: string) => void;
}

const FuzzyMatchBanner: React.FC<FuzzyMatchBannerProps> = ({ suggestions, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 font-rubik" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="text-amber-300 text-sm font-medium">?אולי התכוונת</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.term)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0d1424]/60 backdrop-blur-xl border border-white/10 rounded-lg text-sm text-white hover:border-amber-500/40 hover:bg-[#0d1424]/80 transition-colors"
          >
            <span className="font-medium">{s.term}</span>
            {s.hebrew && (
              <span className="text-slate-400">{s.hebrew}</span>
            )}
            {s.partOfSpeech && (
              <span className="text-[10px] text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded-full">
                {s.partOfSpeech}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FuzzyMatchBanner;
