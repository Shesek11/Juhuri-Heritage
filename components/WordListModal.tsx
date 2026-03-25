import React, { useState, useEffect, useCallback, useRef } from 'react';
import FocusTrap from 'focus-trap-react';
import { X, Search, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import apiService from '../services/apiService';

interface WordListEntry {
    id: number;
    term: string;
    detected_language?: string;
    hebrew?: string;
    latin?: string;
    cyrillic?: string;
    existingDialects?: string[];
    missingDialects?: string[];
}

interface WordListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    category: 'hebrew-only' | 'juhuri-only' | 'missing-dialects' | 'missing-audio';
    totalCount: number;
    onSelectWord: (entryId: number, term: string) => void;
    featuredTerm?: string;
}

const WordListModal: React.FC<WordListModalProps> = ({
    isOpen,
    onClose,
    title,
    category,
    totalCount,
    onSelectWord,
    featuredTerm,
}) => {
    const [entries, setEntries] = useState<WordListEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(0);
    const [serverTotal, setServerTotal] = useState(totalCount);
    const [featuredEntry, setFeaturedEntry] = useState<WordListEntry | null>(null);
    const pageSize = 20;
    const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const offset = page * pageSize;
            const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
            const res = await apiService.get<{ entries: WordListEntry[], total: number }>(
                `/dictionary/${category}?limit=${pageSize}&offset=${offset}${searchParam}`
            );
            setEntries(res.entries || []);
            setServerTotal(res.total ?? totalCount);
        } catch (err) {
            console.error(`Failed to fetch ${category} entries:`, err);
        } finally {
            setLoading(false);
        }
    }, [category, page, debouncedSearch, totalCount]);

    useEffect(() => {
        if (isOpen) {
            fetchEntries();
        }
    }, [isOpen, fetchEntries]);

    useEffect(() => {
        if (isOpen) {
            setPage(0);
            setSearchTerm('');
            setDebouncedSearch('');
            setFeaturedEntry(null);

            // If there's a featured term, fetch it specifically
            if (featuredTerm) {
                apiService.get<{ entries: WordListEntry[]; total: number }>(
                    `/dictionary/${category}?limit=20&search=${encodeURIComponent(featuredTerm)}`
                ).then((res) => {
                    const match = (res.entries || []).find(
                        (e) => e.term === featuredTerm
                    );
                    if (match) setFeaturedEntry(match);
                }).catch(() => {});
            }
        }
    }, [isOpen, category, featuredTerm]);

    // Debounce search input
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(0);
        }, 350);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchTerm]);

    if (!isOpen) return null;

    const totalPages = Math.ceil(serverTotal / pageSize);

    const getCategoryColor = () => {
        switch (category) {
            case 'hebrew-only': return 'from-amber-500 to-orange-600';
            case 'juhuri-only': return 'from-emerald-500 to-teal-600';
            case 'missing-dialects': return 'from-blue-500 to-indigo-600';
            case 'missing-audio': return 'from-purple-500 to-violet-600';
            default: return 'from-slate-500 to-slate-600';
        }
    };

    const getCategoryBorderClass = () => {
        switch (category) {
            case 'hebrew-only': return 'border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/[0.08]';
            case 'juhuri-only': return 'border-emerald-500/20 bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]';
            case 'missing-dialects': return 'border-blue-500/20 bg-blue-500/[0.04] hover:bg-blue-500/[0.08]';
            case 'missing-audio': return 'border-purple-500/20 bg-purple-500/[0.04] hover:bg-purple-500/[0.08]';
            default: return 'border-white/10 bg-white/[0.02]';
        }
    };

    const getCategoryTextClass = () => {
        switch (category) {
            case 'hebrew-only': return 'text-amber-400';
            case 'juhuri-only': return 'text-emerald-400';
            case 'missing-dialects': return 'text-blue-400';
            case 'missing-audio': return 'text-purple-400';
            default: return 'text-slate-400';
        }
    };

    const getMissingInfo = (entry: WordListEntry) => {
        switch (category) {
            case 'hebrew-only':
                return <span className="text-amber-600 dark:text-amber-400">חסר: ג'והורי/לטינית</span>;
            case 'juhuri-only':
                return <span className="text-emerald-600 dark:text-emerald-400">חסר: עברית</span>;
            case 'missing-dialects':
                return (
                    <div className="flex flex-wrap gap-1">
                        {entry.missingDialects?.slice(0, 2).map((d, i) => (
                            <span key={i} className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1 rounded text-[11px]">
                                {d}
                            </span>
                        ))}
                        {(entry.missingDialects?.length || 0) > 2 && (
                            <span className="text-slate-400 text-[11px]">+{entry.missingDialects!.length - 2}</span>
                        )}
                    </div>
                );
            case 'missing-audio':
                return <span className="text-purple-600 dark:text-purple-400">חסר: הקלטה</span>;
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-rubik" onClick={onClose}>
            <FocusTrap focusTrapOptions={{ allowOutsideClick: true, escapeDeactivates: true }}>
            <div role="dialog" aria-modal="true" aria-labelledby="wordlist-modal-title" className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10 h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={`p-5 bg-gradient-to-r ${getCategoryColor()} text-white flex justify-between items-center shrink-0`}>
                    <div>
                        <h3 id="wordlist-modal-title" className="font-bold text-lg">{title}</h3>
                        <p className="text-sm text-white/80">{serverTotal.toLocaleString()} מילים</p>
                    </div>
                    <button type="button" onClick={onClose} title="סגור" className="p-2 rounded-full hover:bg-white/20 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-white/10 shrink-0">
                    <div className="relative">
                        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="חיפוש בכל התוצאות..."
                            className="w-full pr-10 pl-4 py-2 border border-white/10 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="animate-spin text-indigo-500" size={32} />
                        </div>
                    ) : entries.length === 0 && !featuredEntry ? (
                        <div className="text-center text-slate-400 py-8">
                            {searchTerm ? 'לא נמצאו תוצאות' : 'אין מילים בקטגוריה זו'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Featured entry — only on first page, no search */}
                            {featuredEntry && page === 0 && !debouncedSearch && (
                                <button
                                    key={`featured-${featuredEntry.id}`}
                                    onClick={() => onSelectWord(featuredEntry.id, featuredEntry.term)}
                                    className={`w-full text-right p-5 rounded-xl transition-all group border ${getCategoryBorderClass()} mb-3`}
                                >
                                    <div className={`text-xs font-semibold uppercase tracking-wider ${getCategoryTextClass()} mb-2`}>
                                        המילה שבחרתם
                                    </div>
                                    <div className="font-bold text-xl text-white group-hover:text-amber-400 transition-colors">
                                        {featuredEntry.term}
                                    </div>
                                    <div className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                        {featuredEntry.hebrew && <span>{featuredEntry.hebrew}</span>}
                                        {featuredEntry.latin && <span className="font-mono text-xs">{featuredEntry.latin}</span>}
                                    </div>
                                    <div className="text-xs mt-1">
                                        {getMissingInfo(featuredEntry)}
                                    </div>
                                </button>
                            )}

                            {/* Regular entries — skip featured */}
                            {entries
                                .filter((e) => !featuredEntry || e.id !== featuredEntry.id)
                                .map((entry) => (
                                <button
                                    key={entry.id}
                                    onClick={() => onSelectWord(entry.id, entry.term)}
                                    className="w-full text-right flex items-center justify-between p-4 rounded-xl hover:bg-white/[0.03] transition-all group border border-white/[0.06] hover:border-white/10"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-slate-200 group-hover:text-amber-400 transition-colors">
                                            {entry.term}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                                            {entry.hebrew && <span>{entry.hebrew}</span>}
                                            {entry.latin && <span className="font-mono text-xs">{entry.latin}</span>}
                                        </div>
                                        <div className="text-xs mt-1">
                                            {getMissingInfo(entry)}
                                        </div>
                                    </div>
                                    <ChevronLeft size={18} className="text-slate-600 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 shrink-0 mr-2" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="p-4 border-t border-white/10 flex items-center justify-between shrink-0">
                        <button
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                            disabled={page === 0}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight size={16} />
                            הקודם
                        </button>
                        <span className="text-sm text-slate-400">
                            עמוד {page + 1} מתוך {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={page >= totalPages - 1}
                            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            הבא
                            <ChevronLeft size={16} />
                        </button>
                    </div>
                )}
            </div>
            </FocusTrap>
        </div>
    );
};

export default WordListModal;
