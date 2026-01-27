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
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden font-rubik h-full flex flex-col">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Clock size={20} /> נוספו לאחרונה
                </h3>
            </div>

            <div className="flex-1 p-2">
                {loading ? (
                    <div className="space-y-3 p-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg animate-pulse" />)}
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
                                    <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        {term.term}
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {term.translations[0]?.hebrew || 'תרגום..'}
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
