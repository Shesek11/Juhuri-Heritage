'use client';

import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle, Loader2 } from 'lucide-react';

const ADMIN_FIELD_LABELS: Record<string, string> = {
    hebrew: 'עברית', latin: 'לטיני', cyrillic: 'קירילי', russian: 'רוסית',
    definition: 'הגדרה', pronunciationGuide: 'הגייה', partOfSpeech: 'חלק דיבר', dialect: 'ניב',
};

export default function AdminAiFieldsPage() {
    const [aiFieldEntries, setAiFieldEntries] = useState<any[]>([]);
    const [aiFieldsTotal, setAiFieldsTotal] = useState(0);
    const [aiFieldsPage, setAiFieldsPage] = useState(1);
    const [aiFieldsTotalPages, setAiFieldsTotalPages] = useState(1);
    const [aiFieldsLoading, setAiFieldsLoading] = useState(false);
    const [selectedAiEntries, setSelectedAiEntries] = useState<Set<number>>(new Set());
    const [bulkConfirming, setBulkConfirming] = useState(false);

    const loadAiFields = async (page = 1) => {
        setAiFieldsLoading(true);
        try {
            const res = await fetch(`/api/dictionary/ai-fields?page=${page}&limit=30`);
            const data = await res.json();
            setAiFieldEntries(data.entries || []);
            setAiFieldsTotal(data.total || 0);
            setAiFieldsPage(data.page || 1);
            setAiFieldsTotalPages(data.totalPages || 1);
            setSelectedAiEntries(new Set());
        } catch (err) { console.error('Error loading AI fields:', err); }
        finally { setAiFieldsLoading(false); }
    };

    useEffect(() => { loadAiFields(1); }, []);

    const handleBulkConfirmAi = async () => {
        if (selectedAiEntries.size === 0) return;
        setBulkConfirming(true);
        try {
            const res = await fetch('/api/dictionary/bulk-confirm-ai', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ entryIds: Array.from(selectedAiEntries) })
            });
            const data = await res.json();
            if (data.success) { alert(data.message); loadAiFields(aiFieldsPage); }
            else { alert(data.error || 'שגיאה באישור'); }
        } catch { alert('שגיאה באישור מרובה'); }
        finally { setBulkConfirming(false); }
    };

    return (
        <div className="flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Bot size={24} className="text-amber-500" />
                    אישור שדות AI ({aiFieldsTotal})
                </h2>
                {selectedAiEntries.size > 0 && (
                    <button type="button" onClick={handleBulkConfirmAi} disabled={bulkConfirming}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium">
                        {bulkConfirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                        אשר {selectedAiEntries.size} נבחרים
                    </button>
                )}
            </div>
            <p className="text-sm text-slate-400">ערכים אלה מכילים שדות שמולאו אוטומטית על ידי AI. בחר ערכים ואשר כדי לשמור אותם כערכים קהילתיים.</p>

            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-sm text-right">
                        <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-3 w-10">
                                    <input type="checkbox"
                                        checked={aiFieldEntries.length > 0 && selectedAiEntries.size === aiFieldEntries.length}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedAiEntries(new Set(aiFieldEntries.map((en: any) => en.id)));
                                            else setSelectedAiEntries(new Set());
                                        }} title="בחר הכל" />
                                </th>
                                <th className="p-3">מונח</th>
                                <th className="p-3">עברית</th>
                                <th className="p-3">לטיני</th>
                                <th className="p-3">שדות AI</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {aiFieldsLoading ? (
                                <tr><td colSpan={5} className="p-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-indigo-500" /></td></tr>
                            ) : aiFieldEntries.length === 0 ? (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle size={32} className="opacity-20" />
                                        <span>אין שדות AI ממתינים לאישור</span>
                                    </div>
                                </td></tr>
                            ) : aiFieldEntries.map((entry: any) => (
                                <tr key={entry.id} className="hover:bg-white/5 text-slate-200">
                                    <td className="p-3">
                                        <input type="checkbox" checked={selectedAiEntries.has(entry.id)}
                                            onChange={(e) => {
                                                const next = new Set(selectedAiEntries);
                                                if (e.target.checked) next.add(entry.id); else next.delete(entry.id);
                                                setSelectedAiEntries(next);
                                            }} title={`בחר ${entry.term}`} />
                                    </td>
                                    <td className="p-3 font-bold text-lg">{entry.term}</td>
                                    <td className="p-3">{entry.hebrew || '—'}</td>
                                    <td className="p-3 font-mono text-xs">{entry.latin || '—'}</td>
                                    <td className="p-3">
                                        <div className="flex flex-wrap gap-1">
                                            {entry.ai_fields?.split(', ').map((field: string) => (
                                                <span key={field} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[11px] font-medium">
                                                    {ADMIN_FIELD_LABELS[field] || field}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {aiFieldsTotalPages > 1 && (
                    <div className="flex items-center justify-between p-3 bg-white/5 border-t border-white/10">
                        <span className="text-xs text-slate-400">עמוד {aiFieldsPage} מתוך {aiFieldsTotalPages} ({aiFieldsTotal} ערכים)</span>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => loadAiFields(aiFieldsPage - 1)} disabled={aiFieldsPage <= 1} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-600 text-xs disabled:opacity-50">הקודם</button>
                            <button type="button" onClick={() => loadAiFields(aiFieldsPage + 1)} disabled={aiFieldsPage >= aiFieldsTotalPages} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-600 text-xs disabled:opacity-50">הבא</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
