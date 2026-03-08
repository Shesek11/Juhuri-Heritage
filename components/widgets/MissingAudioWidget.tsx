import React, { useEffect, useState } from 'react';
import { Mic, Plus, Loader2 } from 'lucide-react';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface MissingAudioEntry {
    id: number;
    term: string;
    hebrew?: string;
    latin?: string;
}

interface MissingAudioWidgetProps {
    onAddAudio: (entryId: number, term: string) => void;
    onOpenAuthModal: (reason?: string) => void;
    onViewAll: (total: number) => void;
}

const MissingAudioWidget: React.FC<MissingAudioWidgetProps> = ({ onAddAudio, onOpenAuthModal, onViewAll }) => {
    const { isAuthenticated } = useAuth();
    const [entries, setEntries] = useState<MissingAudioEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const res = await apiService.get<{ entries: MissingAudioEntry[], total: number }>('/dictionary/missing-audio?limit=5');
                setEntries(res.entries || []);
                setTotal(res.total || 0);
            } catch (err) {
                console.error('Failed to fetch missing-audio entries:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEntries();
    }, []);

    const handleAddClick = (entry: MissingAudioEntry) => {
        if (!isAuthenticated) {
            onOpenAuthModal('כדי להקליט הגייה, יש להתחבר תחילה');
            return;
        }
        onAddAudio(entry.id, entry.term);
    };

    if (loading) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-purple-500" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col">
            <div className="p-6 border-b border-white/10 flex flex-col items-center justify-center text-center h-40 bg-[#0d1424]/40 relative group-hover:bg-[#0d1424]/60 transition-colors">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 mb-3 text-white">
                    <Mic size={24} />
                </div>
                <h3 className="font-bold text-lg text-white">חסרה הקלטה</h3>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">עזרו לנו להקליט הגיות</p>
            </div>

            <div className="flex-1 p-2 overflow-y-auto">
                {entries.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-sm p-4">
                        כל המילים כוללות הקלטה!
                    </div>
                ) : (
                    <div className="space-y-1">
                        {entries.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => handleAddClick(entry)}
                                className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all group border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                            >
                                <div>
                                    <div className="font-bold text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {entry.term}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {entry.hebrew || entry.latin}
                                    </div>
                                </div>
                                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-all">
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
                <span className="text-xs text-slate-500 hover:text-purple-600 dark:hover:text-purple-400">
                    צפייה בכל {total.toLocaleString()} המילים
                </span>
            </button>
        </div>
    );
};

export default MissingAudioWidget;
