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
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex flex-col">
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <CheckCircle size={20} /> ממתינים לאישור
                    </h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4">
                    אין הצעות ממתינות! ✨
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden font-rubik h-full flex flex-col">
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4 text-white">
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
                                    <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
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

            <div className="p-3 border-t border-slate-100 dark:border-slate-700 text-center">
                <span className="text-xs text-slate-400">
                    {suggestions.length} הצעות ממתינות
                </span>
            </div>
        </div>
    );
};

export default PendingApprovals;
