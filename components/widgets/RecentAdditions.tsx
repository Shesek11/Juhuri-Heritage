import React, { useEffect, useState } from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { DictionaryEntry } from '../../types';
import apiService from '../../services/apiService';

interface RecentAdditionsProps {
    onSelectWord: (term: string) => void;
}

const RecentAdditions: React.FC<RecentAdditionsProps> = ({ onSelectWord }) => {
    const [terms, setTerms] = useState<DictionaryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecent = async () => {
            try {
                // Use dedicated /recent endpoint sorted by created_at DESC
                const res = await apiService.get<{ entries: DictionaryEntry[] }>('/dictionary/recent?limit=5');
                if (res.entries) {
                    setTerms(res.entries);
                }
            } catch (err) {
                console.error("Failed to fetch recent entries", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRecent();
    }, []);

    return (
        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col">
            <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 text-white">
                    <Clock size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">נוספו לאחרונה</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">צפה בכל המילים החדשות</p>
            </div>

            <div className="flex-1 p-2">
                {loading ? (
                    <div className="space-y-3 p-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/10 text-white rounded-lg animate-pulse" />)}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {terms.map((term, idx) => (
                            <button
                                key={idx}
                                onClick={() => onSelectWord(term.term)}
                                className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
                            >
                                <div>
                                    <div className="font-bold text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        {term.term}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {(term as any).hebrew || term.translations?.[0]?.hebrew || 'תרגום..'}
                                    </div>
                                </div>
                                <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all transform -translate-x-2 group-hover:translate-x-0" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <button className="w-full py-3 text-center text-xs font-medium text-slate-400 hover:text-indigo-600 transition-colors">
                צפה בכל המילים החדשות
            </button>
        </div>
    );
};

export default RecentAdditions;
