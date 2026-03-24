import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Languages, BookText, Globe, Mic, Loader2 } from 'lucide-react';

// Shared amber icon style — matches the site's HeartHandshake icon
const ICON_CLASS = 'from-amber-500 to-orange-600';
const ACCENT_HOVER = 'hover:border-amber-500/30 hover:shadow-[0_12px_30px_-10px_rgba(245,158,11,0.12)]';
const HIGHLIGHT = 'text-amber-400';
import apiService from '../../services/apiService';

interface RotatingWord {
  id: number;
  term: string;
  subHint?: string; // optional extra info (e.g. "חסר: קובאי")
}

interface CardConfig {
  category: 'hebrew-only' | 'juhuri-only' | 'missing-dialects' | 'missing-audio';
  label: string;
  icon: React.ReactNode;
  staticHint: string;  // fixed text that stays, only the word rotates
  buildSubHint?: (entry: any) => string | null; // optional extra info (e.g. dialect name)
}

const CARD_CONFIGS: CardConfig[] = [
  {
    category: 'hebrew-only',
    label: 'הוסף ג\'והורי',
    icon: <Languages size={20} />,
    staticHint: 'יודעים איך אומרים?',
  },
  {
    category: 'juhuri-only',
    label: 'תרגם לעברית',
    icon: <BookText size={20} />,
    staticHint: 'מה זה בעברית?',
  },
  {
    category: 'missing-dialects',
    label: 'השלם ניבים',
    icon: <Globe size={20} />,
    staticHint: 'באיזה ניב זה?',
    buildSubHint: (entry: any) => {
      const missing = entry.missingDialects?.[0];
      return missing ? `חסר: ${missing}` : null;
    },
  },
  {
    category: 'missing-audio',
    label: 'הקלט הגייה',
    icon: <Mic size={20} />,
    staticHint: 'הקליטו את ההגייה',
  },
];

// Staggered intervals so cards don't rotate in sync
const INTERVALS = [3500, 4200, 3800, 4500];

interface ContributionGridProps {
  onOpenWordList: (category: 'hebrew-only' | 'juhuri-only' | 'missing-dialects' | 'missing-audio', title: string, totalCount: number, featuredTerm?: string) => void;
}

const ContributionGrid: React.FC<ContributionGridProps> = ({ onOpenWordList }) => {
  const [cardData, setCardData] = useState<{ words: RotatingWord[]; total: number; currentIndex: number }[]>(
    CARD_CONFIGS.map(() => ({ words: [], total: 0, currentIndex: 0 }))
  );
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState<boolean[]>([false, false, false, false]);
  const intervalRefs = useRef<ReturnType<typeof setInterval>[]>([]);

  // Fetch initial words for all 4 categories
  useEffect(() => {
    const fetchCategory = async (config: CardConfig) => {
      try {
        const res = await apiService.get<{ entries: any[]; total: number }>(
          `/dictionary/${config.category}?limit=5`
        );
        const words: RotatingWord[] = (res.entries || []).map((e: any) => ({
          id: e.id,
          term: e.term,
          subHint: config.buildSubHint?.(e) || undefined,
        }));
        return { words, total: res.total || 0 };
      } catch {
        return { words: [], total: 0 };
      }
    };

    const fetchAll = async () => {
      const results = await Promise.all(CARD_CONFIGS.map(fetchCategory));
      setCardData(results.map((r) => ({ ...r, currentIndex: 0 })));
      setLoading(false);
    };
    fetchAll();
  }, []);

  // Rotate words on staggered intervals
  const rotateCard = useCallback((cardIndex: number) => {
    setFading((prev) => {
      const next = [...prev];
      next[cardIndex] = true;
      return next;
    });

    setTimeout(() => {
      setCardData((prev) => {
        const next = [...prev];
        const card = next[cardIndex];
        if (card.words.length > 1) {
          next[cardIndex] = { ...card, currentIndex: (card.currentIndex + 1) % card.words.length };
        }
        return next;
      });
      setFading((prev) => {
        const next = [...prev];
        next[cardIndex] = false;
        return next;
      });
    }, 280);
  }, []);

  useEffect(() => {
    if (loading) return;
    intervalRefs.current = INTERVALS.map((ms, i) =>
      setInterval(() => rotateCard(i), ms)
    );
    return () => intervalRefs.current.forEach(clearInterval);
  }, [loading, rotateCard]);

  const handleCardClick = (cardIndex: number) => {
    const config = CARD_CONFIGS[cardIndex];
    const data = cardData[cardIndex];
    const currentWord = data.words[data.currentIndex];
    onOpenWordList(config.category, config.label, data.total, currentWord?.term);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in duration-500">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] h-44 flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-600" size={24} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-bottom-6 duration-700">
      {CARD_CONFIGS.map((config, i) => {
        const data = cardData[i];
        const currentWord = data.words[data.currentIndex];

        return (
          <button
            key={config.category}
            type="button"
            onClick={() => handleCardClick(i)}
            className={`group relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all duration-300 hover:-translate-y-1 ${ACCENT_HOVER} font-rubik cursor-pointer`}
          >
            {/* Icon — uniform amber style */}
            <div className={`w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br ${ICON_CLASS} flex items-center justify-center text-white shadow-lg shadow-amber-500/20`}>
              {config.icon}
            </div>

            {/* Label */}
            <div className="font-semibold text-[0.85rem] text-white mb-0.5">{config.label}</div>

            {/* Count */}
            <div className="text-[0.65rem] text-slate-500 mb-3">
              {data.total > 0 ? `${data.total.toLocaleString()} מילים מחכות` : 'אין מילים'}
            </div>

            {/* Rotating word area — fixed height to prevent jumps */}
            {currentWord && (
              <div className="pt-3 border-t border-white/[0.05] min-h-[3.5rem] flex flex-col items-center justify-center">
                {/* Only the word fades/rotates, the static text stays */}
                <div className="text-[0.8rem] text-slate-400 leading-relaxed">
                  <span
                    className={`font-bold ${HIGHLIGHT} inline-block transition-opacity duration-300 ${fading[i] ? 'opacity-0' : 'opacity-100'}`}
                  >
                    {currentWord.term}
                  </span>
                  <span className="mx-1 text-slate-600">&mdash;</span>
                  <span>{config.staticHint}</span>
                </div>

                {/* Sub-hint (e.g. "חסר: קובאי") */}
                {currentWord.subHint && (
                  <div className={`text-[0.65rem] text-amber-500/60 mt-1 transition-opacity duration-300 ${fading[i] ? 'opacity-0' : 'opacity-100'}`}>
                    {currentWord.subHint}
                  </div>
                )}

                {/* Dots */}
                {data.words.length > 1 && (
                  <div className="flex justify-center gap-1 mt-2">
                    {data.words.map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          dotIdx === data.currentIndex
                            ? 'w-2.5 bg-amber-400'
                            : 'w-1 bg-white/10'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ContributionGrid;
