import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Languages, BookText, Globe, Mic, Loader2, Type, Sparkles } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { ContributionCategory, categoryToApiPath } from '../shell/AppContext';
import { getTermByLocale } from '../../utils/localeDisplay';
import apiService from '../../services/apiService';

interface RotatingWord {
  id: number;
  term: string;
  subHint?: string;
  isAi?: boolean;
}

interface CardConfig {
  category: ContributionCategory;
  labelKey: string;
  icon: React.ReactNode;
  hintKey: string;
  buildSubHintKey?: string;
}

function getCardConfigs(locale: string): CardConfig[] {
  // Cards 1 & 2 adapt per locale; cards 3 & 4 are universal
  const scriptCard: CardConfig = locale === 'ru'
    ? { category: 'missing-script-cyrillic', labelKey: 'addCyrillic', icon: <Type size={22} />, hintKey: 'hintAddCyrillic' }
    : locale === 'en'
    ? { category: 'missing-script-latin', labelKey: 'addTransliteration', icon: <Type size={22} />, hintKey: 'hintAddLatin' }
    : { category: 'missing-script-hebrew', labelKey: 'addHebrewScript', icon: <Languages size={22} />, hintKey: 'hintAddHebrewScript' };

  const meaningCard: CardConfig = locale === 'ru'
    ? { category: 'missing-meaning-ru', labelKey: 'addRussianMeaning', icon: <BookText size={22} />, hintKey: 'hintAddMeaning' }
    : locale === 'en'
    ? { category: 'missing-meaning-en', labelKey: 'addEnglishMeaning', icon: <BookText size={22} />, hintKey: 'hintAddMeaning' }
    : { category: 'missing-meaning-he', labelKey: 'addHebrewMeaning', icon: <BookText size={22} />, hintKey: 'hintAddMeaning' };

  return [
    scriptCard,
    meaningCard,
    {
      category: 'missing-dialects',
      labelKey: 'completeDialects',
      icon: <Globe size={22} />,
      hintKey: 'hintWhichDialect',
      buildSubHintKey: 'missingPrefix',
    },
    {
      category: 'missing-audio',
      labelKey: 'recordPronunciation',
      icon: <Mic size={22} />,
      hintKey: 'hintRecordIt',
    },
  ];
}

const INTERVALS = [3500, 4200, 3800, 4500];

interface ContributionGridProps {
  onOpenWordList: (category: ContributionCategory, title: string, totalCount: number, featuredTerm?: string) => void;
}

const ContributionGrid: React.FC<ContributionGridProps> = ({ onOpenWordList }) => {
  const t = useTranslations('dictionary');
  const locale = useLocale();
  const cardConfigs = useMemo(() => getCardConfigs(locale), [locale]);

  const [cardData, setCardData] = useState<{ words: RotatingWord[]; total: number; currentIndex: number }[]>(
    cardConfigs.map(() => ({ words: [], total: 0, currentIndex: 0 }))
  );
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState<boolean[]>([false, false, false, false]);
  const intervalRefs = useRef<ReturnType<typeof setInterval>[]>([]);

  useEffect(() => {
    const fetchCategory = async (config: CardConfig) => {
      try {
        const apiPath = categoryToApiPath(config.category);
        const separator = apiPath.includes('?') ? '&' : '?';
        const res = await apiService.get<{ entries: any[]; total: number }>(
          `/dictionary/${apiPath}${separator}limit=5`
        );
        const words: RotatingWord[] = (res.entries || [])
          .map((e: any) => ({
            id: e.id,
            term: getTermByLocale(e, locale),
            subHint: config.buildSubHintKey && e.missingDialects?.[0] ? t(config.buildSubHintKey, { dialect: e.missingDialects[0] }) : undefined,
            isAi: e.isAi || false,
          }))
          .filter((w: RotatingWord) => w.term && w.term !== '—' && w.term.length <= 25);
        return { words, total: res.total || 0 };
      } catch {
        return { words: [], total: 0 };
      }
    };

    const fetchAll = async () => {
      const results = await Promise.all(cardConfigs.map(fetchCategory));
      setCardData(results.map((r) => ({ ...r, currentIndex: 0 })));
      setLoading(false);
    };
    fetchAll();
  }, [cardConfigs]);

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
    const config = cardConfigs[cardIndex];
    const data = cardData[cardIndex];
    const currentWord = data.words[data.currentIndex];
    onOpenWordList(config.category, t(config.labelKey), data.total, currentWord?.term);
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
      {cardConfigs.map((config, i) => {
        const data = cardData[i];
        const currentWord = data.words[data.currentIndex];

        return (
          <button
            key={config.category}
            type="button"
            onClick={() => handleCardClick(i)}
            className="group relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl border border-white/[0.06] p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30 hover:shadow-[0_12px_30px_-10px_rgba(245,158,11,0.12)] font-rubik cursor-pointer"
          >
            {/* Icon */}
            <div className="w-11 h-11 mx-auto mb-3 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
              {config.icon}
            </div>

            {/* Label */}
            <div className="font-semibold text-[0.85rem] text-white mb-0.5">{t(config.labelKey)}</div>

            {/* Count */}
            <div className="text-xs text-slate-400 mb-3">
              {data.total > 0 ? t('wordsWaiting', { count: data.total.toLocaleString() }) : t('noWords')}
            </div>

            {/* Rotating word area */}
            {currentWord && (
              <div className="pt-3 border-t border-white/[0.05] h-[3.5rem] flex flex-col items-center justify-center overflow-hidden">
                <div className="text-[0.8rem] text-slate-400 leading-relaxed w-full truncate">
                  <span
                    className={`font-bold text-amber-400 inline-block transition-opacity duration-300 max-w-[8ch] truncate align-bottom ${fading[i] ? 'opacity-0' : 'opacity-100'}`}
                    dir="auto"
                  >
                    {currentWord.term}
                  </span>
                  <span className="mx-1 text-slate-600">&mdash;</span>
                  {currentWord.isAi ? (
                    <span className="inline-flex items-center gap-0.5 text-purple-400"><Sparkles size={10} /> {t('verifyAi')}</span>
                  ) : (
                    <span>{t(config.hintKey)}</span>
                  )}
                </div>

                {currentWord.subHint && (
                  <div className={`text-xs text-amber-500/60 mt-0.5 transition-opacity duration-300 ${fading[i] ? 'opacity-0' : 'opacity-100'}`}>
                    {currentWord.subHint}
                  </div>
                )}

                {data.words.length > 1 && (
                  <div className="flex justify-center gap-1 mt-1.5">
                    {data.words.map((_, dotIdx) => (
                      <span
                        key={dotIdx}
                        className={`h-1 rounded-full transition-all duration-300 ${
                          dotIdx === data.currentIndex ? 'w-2.5 bg-amber-400' : 'w-1 bg-white/10'
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
