import React, { useEffect, useState } from 'react';
import { Languages, Plus, Loader2 } from 'lucide-react';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface UntranslatedEntry {
    id: number;
    term: string;
    detected_language: string;
}

interface NeedsTranslationProps {
    onTranslate: (entryId: number, term: string) => void;
    onOpenAuthModal: (reason?: string) => void;
}

const NeedsTranslation: React.FC<NeedsTranslationProps> = ({ onTranslate, onOpenAuthModal }) => {
    const { isAuthenticated } = useAuth();
    const [entries, setEntries] = useState<UntranslatedEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEntries = async () => {
            try {
                const res = await apiService.get<{ entries: UntranslatedEntry[] }>('/dictionary/needs-translation');
                setEntries(res.entries || []);
            } catch (err) {
                console.error('Failed to fetch untranslated entries:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEntries();
    }, []);

    const handleTranslateClick = (entry: UntranslatedEntry) => {
        if (!isAuthenticated) {
            onOpenAuthModal('כדי לתרגם מילים, יש להתחבר תחילה');
            return;
        }
        onTranslate(entry.id, entry.term);
    };

    if (loading) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden h-full flex flex-col">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Languages size={20} /> מחכות לתרגום
                    </h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-slate-400 text-sm p-4">
                    כל המילים מתורגמות! 🎉
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/10 overflow-hidden font-rubik h-full flex flex-col">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Languages size={20} /> מחכות לתרגום
                </h3>
                <p className="text-xs text-white/80 mt-1">עזור לקהילה לתרגם מילים חדשות</p>
            </div>

            <div className="flex-1 p-2 overflow-y-auto">
                <div className="space-y-1">
                    {entries.map((entry) => (
                        <button
                            key={entry.id}
                            onClick={() => handleTranslateClick(entry)}
                            className="w-full text-right flex items-center justify-between p-3 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all group border border-transparent hover:border-amber-200 dark:hover:border-amber-800"
                        >
                            <div>
                                <div className="font-bold text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors text-lg">
                                    {entry.term}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {entry.detected_language === 'Hebrew' ? 'עברית' : 'ג\'והורי'}
                                </div>
                            </div>
                            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-all">
                                <Plus size={18} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-3 border-t border-white/10 text-center">
                <span className="text-xs text-slate-400">
                    {entries.length} מילים מחכות לתרגום
                </span>
            </div>
        </div>
    );
};

export default NeedsTranslation;
