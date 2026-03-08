import React, { useEffect, useState } from 'react';
import { BookText, Plus, Loader2 } from 'lucide-react';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface JuhuriOnlyEntry {
    id: number;
    term: string;
    latin: string;
    cyrillic?: string;
}

interface JuhuriOnlyWidgetProps {
    onAddTranslation: (entryId: number, term: string) => void;
    onOpenAuthModal: (reason?: string) => void;
    onViewAll: (total: number) => void;
}

const JuhuriOnlyWidget: React.FC<JuhuriOnlyWidgetProps> = ({ onAddTranslation, onOpenAuthModal, onViewAll }) => {
    const { isAuthenticated } = useAuth();
    const [entries, setEntries] = useState<JuhuriOnlyEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const res = await apiService.get<{ entries: JuhuriOnlyEntry[], total: number }>('/dictionary/juhuri-only?limit=5');
                setEntries(res.entries || []);
                setTotal(res.total || 0);
            } catch (err) {
                console.error('Failed to fetch juhuri-only entries:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEntries();
    }, []);

    const handleAddClick = (entry: JuhuriOnlyEntry) => {
        if (!isAuthenticated) {
            onOpenAuthModal('כדי להוסיף תרגום עברי, יש להתחבר תחילה');
            return;
        }
        onAddTranslation(entry.id, entry.term);
    };

    if (loading) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col">
            <div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <BookText size={20} /> חסר עברית
                </h3>
                <p className="text-xs text-white/80 mt-1">מילים עם ג'והורי בלבד</p>
            </div>

            <div className="flex-1 p-2 overflow-y-auto">
                {entries.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm p-4">
                        כל המילים כוללות תרגום עברי!
                    </div>
                ) : (
                    <div className="space-y-1">
                        {entries.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => handleAddClick(entry)}
                                className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all group border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800"
                            >
                                <div>
                                    <div className="font-bold text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                        {entry.term}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5 font-mono">
                                        {entry.latin || entry.cyrillic}
                                    </div>
                                </div>
                                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-all">
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
                <span className="text-xs text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400">
                    צפייה בכל {total.toLocaleString()} המילים
                </span>
            </button>
        </div>
    );
};

export default JuhuriOnlyWidget;
