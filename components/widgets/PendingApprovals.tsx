import React, { useEffect, useState } from 'react';
import { CheckCircle, ThumbsUp, Loader2 } from 'lucide-react';
import apiService from '../../services/apiService';

interface PendingSuggestion {
    id: number;
    term: string;
    dialect: string;
    suggested_hebrew: string;
    user_name: string;
    created_at: string;
}

interface PendingApprovalsProps {
    onViewDetails: (suggestionId: number) => void;
}

const PendingApprovals: React.FC<PendingApprovalsProps> = ({ onViewDetails }) => {
    const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const res = await apiService.get<{ suggestions: PendingSuggestion[] }>('/dictionary/pending-suggestions');
                setSuggestions(res.suggestions || []);
            } catch (err) {
                console.error('Failed to fetch pending suggestions:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, []);

    if (loading) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20 mb-3 text-white">
                        <CheckCircle size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">ממתינים לאישור</h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-1">הצעות הממתינות לעורך</p>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4">
                    אין הצעות ממתינות! ✨
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />
            <div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <CheckCircle size={20} /> ממתינים לאישור
                </h3>
                <p className="text-xs text-white/80 mt-1">הצעות תרגום מהקהילה</p>
            </div>

            <div className="flex-1 p-2 overflow-y-auto">
                <div className="space-y-1">
                    {suggestions.slice(0, 5).map((suggestion) => (
                        <button
                            key={suggestion.id}
                            onClick={() => onViewDetails(suggestion.id)}
                            className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        {suggestion.term}
                                    </span>
                                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                        {suggestion.dialect}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                                    {suggestion.suggested_hebrew}
                                </div>
                                <div className="text-[10px] text-slate-400 mt-1">
                                    הוצע ע״י {suggestion.user_name}
                                </div>
                            </div>
                            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all mr-2">
                                <ThumbsUp size={18} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-3 border-t border-white/10 text-center">
                <span className="text-xs text-slate-400">
                    {suggestions.length} הצעות ממתינות
                </span>
            </div>
        </div>
    );
};

export default PendingApprovals;
