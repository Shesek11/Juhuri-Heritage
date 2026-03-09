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
            <div className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer">
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />
                <div className="absolute inset-x-0 -top-20 h-40 bg-amber-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                
                <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors z-10">
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 text-amber-500 group-hover:scale-110 transition-transform">
                        <Globe size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-white">חסרים ניבים</h3>
                    <p className="text-xs text-white/50 mt-1 line-clamp-1">מילים שחסרות בחלק מהניבים</p>
                </div>
                <div className="flex-1 flex items-center justify-center text-amber-500/70 text-sm p-4 z-10 font-medium">
                    כל המילים מכילות את כל הניבים! 🌍
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col group transition-all duration-500 hover:-translate-y-2 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] cursor-pointer">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700 z-50" />
            <div className="absolute inset-x-0 -top-20 h-40 bg-amber-500/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            <div className="bg-white/5 border-b border-white/10 backdrop-blur-xl p-4 text-white relative z-10">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Globe size={20} className="text-amber-500" /> חסרים ניבים
                </h3>
                <p className="text-xs text-white/60 mt-1">הוסף תרגומים בניבים נוספים</p>
            </div>

            <div className="flex-1 p-2 overflow-y-auto relative z-10">
                <div className="space-y-1">
                    {entries.map((entry) => (
                        <button
                            key={entry.id}
                            onClick={() => handleAddClick(entry)}
                            className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-all group/item border border-transparent hover:border-white/10"
                        >
                            <div>
                                <div className="font-bold text-slate-300 group-hover/item:text-amber-400 transition-colors">
                                    {entry.term}
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {entry.missingDialects.slice(0, 3).map((d, i) => (
                                        <span key={i} className="text-[10px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">
                                            {d}
                                        </span>
                                    ))}
                                    {entry.missingDialects.length > 3 && (
                                        <span className="text-[10px] text-slate-400">+{entry.missingDialects.length - 3}</span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500 opacity-0 group-hover/item:opacity-100 transition-all border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                                <Plus size={18} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={() => onViewAll(total)}
                className="p-3 border-t border-white/10 text-center hover:bg-white/5 transition-colors relative z-10"
            >
                <span className="text-xs text-slate-400 hover:text-amber-500 transition-colors">
                    צפייה בכל {total.toLocaleString()} המילים
                </span>
            </button>
        </div>
    );
};

export default MissingDialects;
