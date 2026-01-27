import React, { useEffect, useState } from 'react';
import { Languages, Plus, Loader2 } from 'lucide-react';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface HebrewOnlyEntry {
    id: number;
    term: string;
    hebrew: string;
}

interface HebrewOnlyWidgetProps {
    onAddTranslation: (entryId: number, term: string) => void;
    onOpenAuthModal: (reason?: string) => void;
    onViewAll: (total: number) => void;
}

const HebrewOnlyWidget: React.FC<HebrewOnlyWidgetProps> = ({ onAddTranslation, onOpenAuthModal, onViewAll }) => {
    const { isAuthenticated } = useAuth();
    const [entries, setEntries] = useState<HebrewOnlyEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const res = await apiService.get<{ entries: HebrewOnlyEntry[], total: number }>('/dictionary/hebrew-only?limit=5');
                setEntries(res.entries || []);
                setTotal(res.total || 0);
            } catch (err) {
                console.error('Failed to fetch hebrew-only entries:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEntries();
    }, []);

    const handleAddClick = (entry: HebrewOnlyEntry) => {
        if (!isAuthenticated) {
            onOpenAuthModal('כדי להוסיף תרגום ג\'והורי, יש להתחבר תחילה');
            return;
        }
        onAddTranslation(entry.id, entry.term);
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden font-rubik h-full flex flex-col">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Languages size={20} /> חסר ג'והורי
                </h3>
                <p className="text-xs text-white/80 mt-1">מילים עם עברית בלבד</p>
            </div>

            <div className="flex-1 p-2 overflow-y-auto">
                {entries.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm p-4">
                        כל המילים כוללות תרגום ג'והורי!
                    </div>
                ) : (
                    <div className="space-y-1">
                        {entries.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => handleAddClick(entry)}
                                className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
                            >
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        {entry.term}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {entry.hebrew}
                                    </div>
                                </div>
                                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <Plus size={18} />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <button
                onClick={() => onViewAll(total)}
                className="p-3 border-t border-slate-100 dark:border-slate-700 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <span className="text-xs text-slate-500 hover:text-amber-600 dark:hover:text-amber-400">
                    צפייה בכל {total.toLocaleString()} המילים
                </span>
            </button>
        </div>
    );
};

export default HebrewOnlyWidget;
