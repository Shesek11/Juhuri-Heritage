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
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    return (
        <div className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />
            <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-white">
                    <Languages size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">חסר ג'והורי</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">מילים עם עברית בלבד</p>
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
                                    <div className="font-bold text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                        {entry.term}
                                    </div>
                                    <div className="text-xs text-slate-400 mt-0.5">
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
                className="p-3 border-t border-white/10 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <span className="text-xs text-slate-400 hover:text-amber-600 dark:hover:text-amber-400">
                    צפייה בכל {total.toLocaleString()} המילים
                </span>
            </button>
        </div>
    );
};

export default HebrewOnlyWidget;
