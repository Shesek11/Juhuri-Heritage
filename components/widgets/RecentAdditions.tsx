import React, { useEffect, useState } from 'react';
import { Clock, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DictionaryEntry } from '../../types';
import apiService from '../../services/apiService';

interface RecentAdditionsProps {
    onSelectWord: (term: string, id?: number) => void;
}

const RecentAdditions: React.FC<RecentAdditionsProps> = ({ onSelectWord }) => {
    const t = useTranslations('widgets');
    const [terms, setTerms] = useState<DictionaryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                const res = await apiService.get<{ entries: DictionaryEntry[] }>('/dictionary/recent?limit=20');
                if (res.entries) setTerms(res.entries);
            } catch (err) {
                if (process.env.NODE_ENV === 'development') console.error("Failed to fetch recent entries", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecent();
    }, []);

    return (
        <div className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/[0.06] overflow-hidden font-rubik h-full flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:border-amber-500/30">
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                    <Clock size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-sm text-white">{t('recentAdditions')}</h3>
                    <span className="text-xs text-slate-300">{t('recentSubtitle')}</span>
                </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto px-2 pb-2">
                {loading ? (
                    <div className="space-y-2 p-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-10 bg-white/[0.04] rounded-lg animate-pulse" />)}
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {terms.map((term, idx) => (
                            <button
                                type="button"
                                key={idx}
                                onClick={() => onSelectWord(term.hebrewScript || '', (term as any).id)}
                                className="w-full text-right flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-all group/item cursor-pointer"
                            >
                                <div className="min-w-0">
                                    <div className="font-semibold text-[0.8rem] text-slate-200 group-hover/item:text-amber-400 transition-colors truncate">
                                        {term.hebrewScript || (term as any).hebrewShort || (term as any).latinScript || '—'}
                                    </div>
                                    {term.hebrewScript && (term as any).hebrewShort && (
                                        <div className="text-xs text-slate-300 truncate">
                                            {(term as any).hebrewShort}
                                        </div>
                                    )}
                                    {!term.hebrewScript && (term as any).latinScript && (
                                        <div className="text-xs text-slate-300 truncate font-mono" dir="ltr">
                                            {(term as any).latinScript}
                                        </div>
                                    )}
                                </div>
                                <ArrowLeft size={14} className="text-slate-600 group-hover/item:text-amber-500 opacity-0 group-hover/item:opacity-100 transition-all shrink-0 mr-1" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentAdditions;
