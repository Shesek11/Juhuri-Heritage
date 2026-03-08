import React, { useEffect, useState } from 'react';
import { Globe, Plus, Loader2 } from 'lucide-react';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface PartialEntry {
    id: number;
    term: string;
    detectedLanguage: string;
    existingDialects: string[];
    missingDialects: string[];
}

interface MissingDialectsProps {
    onAddDialect: (entryId: number, term: string, missingDialects: string[]) => void;
    onOpenAuthModal: (reason?: string) => void;
    onViewAll: (total: number) => void;
}

const MissingDialects: React.FC<MissingDialectsProps> = ({ onAddDialect, onOpenAuthModal, onViewAll }) => {
    const { isAuthenticated } = useAuth();
    const [entries, setEntries] = useState<PartialEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const res = await apiService.get<{ entries: PartialEntry[], total: number }>('/dictionary/missing-dialects?limit=5');
                setEntries(res.entries || []);
                setTotal(res.total || 0);
            } catch (err) {
                console.error('Failed to fetch partial entries:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEntries();
    }, []);

    const handleAddClick = (entry: PartialEntry) => {
        if (!isAuthenticated) {
            onOpenAuthModal('כדי להוסיף ניבים, יש להתחבר תחילה');
            return;
        }
        onAddDialect(entry.id, entry.term, entry.missingDialects);
    };

    if (loading) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex flex-col">
                <div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Globe size={20} /> חסרים ניבים
                    </h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4">
                    כל המילים מכילות את כל הניבים! 🌍
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col">
            <div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Globe size={20} /> חסרים ניבים
                </h3>
                <p className="text-xs text-white/80 mt-1">הוסף תרגומים בניבים נוספים</p>
            </div>

            <div className="flex-1 p-2 overflow-y-auto">
                <div className="space-y-1">
                    {entries.map((entry) => (
                        <button
                            key={entry.id}
                            onClick={() => handleAddClick(entry)}
                            className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                        >
                            <div>
                                <div className="font-bold text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {entry.term}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {entry.missingDialects.slice(0, 3).map((d, i) => (
                                        <span key={i} className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                            {d}
                                        </span>
                                    ))}
                                    {entry.missingDialects.length > 3 && (
                                        <span className="text-[10px] text-slate-400">+{entry.missingDialects.length - 3}</span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all">
                                <Plus size={18} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={() => onViewAll(total)}
                className="p-3 border-t border-white/10 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
                <span className="text-xs text-slate-500 hover:text-blue-600 dark:hover:text-blue-400">
                    צפייה בכל {total.toLocaleString()} המילים
                </span>
            </button>
        </div>
    );
};

export default MissingDialects;
