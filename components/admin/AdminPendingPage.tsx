'use client';

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Volume2, Pencil, Edit3, Play, Pause } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomEntries, deleteCustomEntry, approveEntry } from '../../services/storageService';
import { DictionaryEntry } from '../../types';

interface TranslationSuggestion {
    id: number;
    entry_id: number;
    dialect: string;
    suggested_hebrew_short: string;
    suggested_latin_script: string;
    suggested_cyrillic_script: string;
    suggested_russian_short: string | null;
    user_id: string | null;
    user_name: string | null;
    status: string;
    created_at: string;
    audio_url: string | null;
    audio_duration: number | null;
    dialect_script_id: number | null;
    field_name: string | null;
    reason: string | null;
    hebrewScript: string;
    contributor_name: string | null;
}

const ADMIN_FIELD_LABELS: Record<string, string> = {
    hebrewShort: 'עברית', latinScript: 'לטיני', cyrillicScript: 'קירילי', russianShort: 'רוסית',
    hebrewLong: 'הגדרה', pronunciationGuide: 'הגייה', partOfSpeech: 'חלק דיבר', dialect: 'ניב',
};

export default function AdminPendingPage() {
    const { user } = useAuth();
    const [pendingEntries, setPendingEntries] = useState<DictionaryEntry[]>([]);
    const [suggestions, setSuggestions] = useState<TranslationSuggestion[]>([]);
    const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const loadData = async () => {
        try {
            const [result, suggestionsRes] = await Promise.all([
                getCustomEntries({ page: 1, limit: 200, search: undefined, status: 'pending' }),
                fetch('/api/dictionary/pending-suggestions').then(r => r.json())
            ]);
            setPendingEntries(result.entries);
            setSuggestions(suggestionsRes.suggestions || []);
        } catch (err) { console.error('Error loading pending data:', err); }
    };

    useEffect(() => { loadData(); }, []);

    const handleApprove = (term: string) => {
        if (!user) return;
        approveEntry(term, user);
        loadData();
    };

    const handleDelete = (term: string) => {
        if (!user) return;
        if (confirm(`האם למחוק את הערך "${term}"?`)) {
            deleteCustomEntry(term, user);
            loadData();
        }
    };

    const handleApproveSuggestion = async (suggestionId: number) => {
        try {
            const res = await fetch(`/api/dictionary/suggestions/${suggestionId}/approve`, { method: 'PUT', credentials: 'include' });
            if (res.ok) {
                setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
                alert('ההצעה אושרה בהצלחה!');
            } else { alert('שגיאה באישור ההצעה'); }
        } catch { alert('שגיאה באישור ההצעה'); }
    };

    const handleRejectSuggestion = async (suggestionId: number) => {
        if (!confirm('האם לדחות את ההצעה?')) return;
        try {
            const res = await fetch(`/api/dictionary/suggestions/${suggestionId}/reject`, { method: 'PUT', credentials: 'include' });
            if (res.ok) {
                setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
                alert('ההצעה נדחתה');
            } else { alert('שגיאה בדחיית ההצעה'); }
        } catch { alert('שגיאה בדחיית ההצעה'); }
    };

    const handlePlayAudio = (suggestionId: number, audioUrl: string) => {
        if (playingAudioId === suggestionId) {
            audioRef.current?.pause();
            setPlayingAudioId(null);
        } else {
            if (audioRef.current) audioRef.current.pause();
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.play();
            setPlayingAudioId(suggestionId);
            audio.onended = () => setPlayingAudioId(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col space-y-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <CheckCircle size={24} className="text-indigo-500" />
                אישורים ממתינים
            </h2>

            {/* Pending Entries */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                <h3 className="text-lg font-bold text-slate-200 p-4 bg-white/5 border-b dark:border-slate-700">
                    רשומות חדשות ({pendingEntries.length})
                </h3>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-4">מונח</th>
                                <th className="p-4">תרגום מוצע</th>
                                <th className="p-4">ניב</th>
                                <th className="p-4">תורם</th>
                                <th className="p-4 w-40">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {pendingEntries.map((entry, idx) => (
                                <tr key={idx} className="hover:bg-white/5 text-slate-200">
                                    <td className="p-4 font-bold text-lg">{entry.hebrewScript}</td>
                                    <td className="p-4">{entry.dialectScripts[0]?.hebrewScript}</td>
                                    <td className="p-4"><span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded text-xs">{entry.dialectScripts[0]?.dialect || '-'}</span></td>
                                    <td className="p-4 text-xs text-slate-400">{entry.contributorId ? 'משתמש רשום' : 'אורח'}</td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApprove(entry.hebrewScript)} className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors" title="אשר"><CheckCircle size={18} /></button>
                                            <button onClick={() => handleDelete(entry.hebrewScript)} className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors" title="דחה"><XCircle size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {pendingEntries.length === 0 && (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle size={32} className="opacity-20" />
                                        <span>אין רשומות ממתינות לאישור</span>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Translation Suggestions */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                <h3 className="text-lg font-bold text-slate-200 p-4 bg-white/5 border-b dark:border-slate-700 flex items-center gap-2">
                    <Volume2 size={20} className="text-indigo-500" />
                    הצעות תרגום ({suggestions.length})
                </h3>
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-4">מונח</th>
                                <th className="p-4">הצעה</th>
                                <th className="p-4">תורם</th>
                                <th className="p-4">סוג</th>
                                <th className="p-4">אודיו</th>
                                <th className="p-4 w-40">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {suggestions.map((s) => (
                                <tr key={s.id} className="hover:bg-white/5 text-slate-200">
                                    <td className="p-4 font-bold text-lg">{s.hebrewScript}</td>
                                    <td className="p-4">
                                        {s.field_name ? (
                                            <div className="flex flex-col gap-1">
                                                <span className="text-xs text-slate-400">שדה: <span className="font-bold text-indigo-600 dark:text-indigo-400">{ADMIN_FIELD_LABELS[s.field_name] || s.field_name}</span></span>
                                                <span className="font-medium">
                                                    {s.field_name === 'russianShort' ? s.suggested_russian_short :
                                                     s.field_name === 'latinScript' ? s.suggested_latin_script :
                                                     s.field_name === 'cyrillicScript' ? s.suggested_cyrillic_script :
                                                     s.suggested_hebrew_short}
                                                </span>
                                                {s.reason && <span className="text-xs text-slate-400 italic">{s.reason}</span>}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium">{s.suggested_hebrew_short}</span>
                                                {s.suggested_latin_script && <span className="text-xs text-slate-400">{s.suggested_latin_script}</span>}
                                                {s.suggested_russian_short && <span className="text-xs text-slate-400">{s.suggested_russian_short}</span>}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-xs text-slate-400">
                                        {s.contributor_name || s.user_name || (s.user_id ? 'משתמש רשום' : 'אורח')}
                                    </td>
                                    <td className="p-4">
                                        {s.field_name ? (
                                            <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded text-xs flex items-center gap-1 w-fit"><Pencil size={12} />תיקון שדה</span>
                                        ) : s.dialect_script_id ? (
                                            <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs flex items-center gap-1 w-fit"><Edit3 size={12} />תיקון</span>
                                        ) : (
                                            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs">חדש</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {s.audio_url ? (
                                            <button onClick={() => handlePlayAudio(s.id, s.audio_url!)}
                                                className={`p-2 rounded-full transition-all ${playingAudioId === s.id ? 'bg-indigo-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                                                title={playingAudioId === s.id ? 'עצור' : 'נגן הקלטה'}>
                                                {playingAudioId === s.id ? <Pause size={16} /> : <Play size={16} />}
                                            </button>
                                        ) : (<span className="text-slate-400 text-xs">—</span>)}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproveSuggestion(s.id)} className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors" title="אשר"><CheckCircle size={18} /></button>
                                            <button onClick={() => handleRejectSuggestion(s.id)} className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors" title="דחה"><XCircle size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {suggestions.length === 0 && (
                                <tr><td colSpan={6} className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle size={32} className="opacity-20" />
                                        <span>אין הצעות תרגום ממתינות</span>
                                    </div>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
