'use client';

import React, { useState, useEffect } from 'react';
import { Database, Search, FileSpreadsheet, Plus, Sparkles, Loader2, Save, Trash2, X, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomEntries, addCustomEntry, deleteCustomEntry, approveEntry, getDialects, downloadTemplate } from '../../services/storageService';
import { generateBatchEntries } from '../../services/geminiService';
import { DictionaryEntry, Translation, DialectItem } from '../../types';

export default function AdminDictionaryPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    const [entries, setEntries] = useState<DictionaryEntry[]>([]);
    const [searchFilter, setSearchFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEntries, setTotalEntries] = useState(0);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const entriesPerPage = 50;

    const [dialects, setDialects] = useState<DialectItem[]>([]);
    const [viewMode, setViewMode] = useState<'table' | 'bulk'>('table');
    const [bulkNoTranslation, setBulkNoTranslation] = useState(false);

    // Grid State
    const [gridData, setGridData] = useState<string[][]>(
        Array(15).fill('').map(() => Array(6).fill(''))
    );
    const [rowsToAdd, setRowsToAdd] = useState(1);

    // AI Generation State
    const [aiTopic, setAiTopic] = useState('');
    const [aiCount, setAiCount] = useState(5);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);

    // Untranslated Words Modal State
    const [showUntranslatedModal, setShowUntranslatedModal] = useState(false);
    const [untranslatedTerm, setUntranslatedTerm] = useState('');
    const [untranslatedPronunciation, setUntranslatedPronunciation] = useState('');
    const [isAddingUntranslated, setIsAddingUntranslated] = useState(false);

    // Inline Editing State
    const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({ term: '', hebrew: '', latin: '', cyrillic: '', dialect: '' });

    const loadEntries = async (page = 1, search = '') => {
        setEntriesLoading(true);
        try {
            const result = await getCustomEntries({ page, limit: entriesPerPage, search: search || undefined });
            setEntries(result.entries);
            setTotalPages(result.totalPages);
            setTotalEntries(result.total);
            setCurrentPage(result.page);
        } catch (err) {
            console.error('Error loading entries:', err);
        } finally {
            setEntriesLoading(false);
        }
    };

    useEffect(() => {
        loadEntries(1, searchFilter);
        getDialects().then(d => setDialects(d || []));
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadEntries(1, searchFilter);
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchFilter]);

    // --- Grid Handlers ---
    const handleGridChange = (row: number, col: number, value: string) => {
        const newGrid = [...gridData];
        newGrid[row] = [...newGrid[row]];
        newGrid[row][col] = value;
        setGridData(newGrid);
    };

    const handleGridPaste = (e: React.ClipboardEvent<HTMLInputElement>, startRow: number, startCol: number) => {
        e.preventDefault();
        const pasteData = e.clipboardData.getData('text');
        const rows = pasteData.split(/\r\n|\n|\r/).filter(row => row.trim() !== '');
        if (rows.length === 0) return;
        const newGrid = [...gridData];
        rows.forEach((rowStr, rIdx) => {
            const currentRowIdx = startRow + rIdx;
            const cols = rowStr.split('\t');
            if (currentRowIdx >= newGrid.length) newGrid.push(Array(6).fill(''));
            if (!newGrid[currentRowIdx]) newGrid[currentRowIdx] = Array(6).fill('');
            else newGrid[currentRowIdx] = [...newGrid[currentRowIdx]];
            cols.forEach((cellData, cIdx) => {
                const currentColIdx = startCol + cIdx;
                if (currentColIdx < 6) newGrid[currentRowIdx][currentColIdx] = cellData.trim();
            });
        });
        setGridData(newGrid);
    };

    const handleClearGrid = () => {
        if (confirm('האם לנקות את כל הטבלה?')) {
            setGridData(Array(15).fill('').map(() => Array(6).fill('')));
        }
    };

    const handleAddRows = () => {
        const count = Math.max(1, rowsToAdd);
        const newRows = Array(count).fill('').map(() => Array(6).fill(''));
        setGridData(prev => [...prev, ...newRows]);
    };

    const handleSaveGrid = () => {
        if (!user) return;
        let savedCount = 0;
        gridData.forEach(row => {
            const [term, hebrew, latin, dialect, definition, cyrillic] = row;
            if (term.trim() && hebrew.trim()) {
                const translation: Translation = {
                    dialect: dialect.trim() || 'General',
                    hebrew: hebrew.trim(),
                    latin: latin.trim() || term.trim(),
                    cyrillic: cyrillic.trim() || ''
                };
                const entry: DictionaryEntry = {
                    term: term.trim(),
                    detectedLanguage: 'Hebrew',
                    translations: [translation],
                    definitions: definition.trim() ? [definition.trim()] : [],
                    examples: [],
                    isCustom: true,
                    source: 'מאגר',
                    status: 'active',
                    contributorId: user.id
                };
                addCustomEntry(entry, user);
                savedCount++;
            }
        });
        if (savedCount > 0) {
            loadEntries(1, searchFilter);
            alert(`נשמרו בהצלחה ${savedCount} רשומות!`);
            handleClearGrid();
            setViewMode('table');
        } else {
            alert('לא נמצאו נתונים תקינים לשמירה.');
        }
    };

    const handleSaveBulkUntranslated = async () => {
        const terms = gridData.map(row => row[0].trim()).filter(Boolean);
        if (terms.length === 0) { alert('לא נמצאו מילים לשמירה.'); return; }
        let savedCount = 0;
        for (const term of terms) {
            try {
                const res = await fetch('/api/dictionary/entries/add-untranslated', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify({ term, detectedLanguage: 'Hebrew' })
                });
                if (res.ok) savedCount++;
            } catch (e) { console.error('Error saving term:', term, e); }
        }
        if (savedCount > 0) {
            loadEntries(1, searchFilter);
            alert(`נוספו בהצלחה ${savedCount} מילים ללא תרגום!`);
            handleClearGrid();
            setViewMode('table');
        } else { alert('שגיאה בשמירה.'); }
    };

    const handleDelete = (term: string) => {
        if (!user) return;
        if (confirm(`האם למחוק את הערך "${term}"?`)) {
            deleteCustomEntry(term, user);
            loadEntries(currentPage, searchFilter);
        }
    };

    const handleStartEdit = (entry: DictionaryEntry) => {
        const entryId = (entry as any).id;
        if (!entryId) { alert('לא ניתן לערוך ערך זה - חסר מזהה'); return; }
        setEditingEntryId(entryId);
        setEditForm({
            term: entry.term || '', hebrew: entry.translations[0]?.hebrew || '',
            latin: entry.translations[0]?.latin || '', cyrillic: entry.translations[0]?.cyrillic || '',
            dialect: entry.translations[0]?.dialect || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingEntryId(null);
        setEditForm({ term: '', hebrew: '', latin: '', cyrillic: '', dialect: '' });
    };

    const handleSaveEdit = async () => {
        if (!editingEntryId) return;
        try {
            const entry = entries.find(e => (e as any).id === editingEntryId);
            const translationId = (entry?.translations[0] as any)?.id;
            if (editForm.term !== (entry?.term || '')) {
                await fetch(`/api/dictionary/entries/${editingEntryId}/update-term`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify({ term: editForm.term })
                });
            }
            if (translationId) {
                await fetch(`/api/dictionary/translations/${translationId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ hebrew: editForm.hebrew, latin: editForm.latin, cyrillic: editForm.cyrillic })
                });
            } else {
                await fetch(`/api/dictionary/entries/${editingEntryId}/suggest`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ dialect: editForm.dialect, hebrew: editForm.hebrew, latin: editForm.latin, cyrillic: editForm.cyrillic, reason: 'עריכה ידנית' })
                });
            }
            handleCancelEdit();
            loadEntries(currentPage, searchFilter);
            alert('נשמר בהצלחה!');
        } catch (err) {
            console.error('Save edit error:', err);
            alert('שגיאה בשמירה');
        }
    };

    const handleAiGenerate = async () => {
        if (!user || !aiTopic.trim()) return;
        setIsGenerating(true);
        try {
            const generatedEntries = await generateBatchEntries(aiTopic, aiCount);
            generatedEntries.forEach(entry => {
                addCustomEntry({ ...entry, source: 'AI', status: 'active', contributorId: user.id }, user);
            });
            loadEntries(1, searchFilter);
            setShowAiModal(false);
            setAiTopic('');
            alert(`נוספו ${generatedEntries.length} מילים שנוצרו על ידי AI.`);
        } catch {
            alert("שגיאה ביצירת נתונים. נסה שנית.");
        } finally { setIsGenerating(false); }
    };

    const handleAddUntranslated = async () => {
        if (!untranslatedTerm.trim()) return;
        setIsAddingUntranslated(true);
        try {
            const res = await fetch('/api/dictionary/entries/add-untranslated', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ term: untranslatedTerm.trim(), detectedLanguage: 'Hebrew', pronunciationGuide: untranslatedPronunciation.trim() || undefined })
            });
            if (res.ok) {
                alert('המילה נוספה בהצלחה!');
                setUntranslatedTerm(''); setUntranslatedPronunciation('');
                setShowUntranslatedModal(false);
                loadEntries(1, searchFilter);
            } else { alert('שגיאה בהוספה'); }
        } catch { alert('שגיאה בהוספה'); }
        finally { setIsAddingUntranslated(false); }
    };

    return (
        <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Database size={24} className="text-amber-500" />
                מאגר מילון פעיל
            </h2>

            {/* Toolbar */}
            <div className="mb-4 flex flex-wrap gap-4 items-center">
                {viewMode === 'table' && (
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute right-3 top-3 text-slate-400" size={20} />
                        <input type="text" placeholder="חיפוש במאגר..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-full p-3 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                    </div>
                )}
                {isAdmin && (
                    <>
                        <button
                            onClick={() => setViewMode(viewMode === 'table' ? 'bulk' : 'table')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${viewMode === 'bulk' ? 'bg-green-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'}`}
                        >
                            <FileSpreadsheet size={18} /> {viewMode === 'bulk' ? 'חזרה לתצוגה' : 'הוספה בבולק'}
                        </button>
                        {viewMode === 'table' && (
                            <>
                                <button onClick={() => setShowUntranslatedModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium whitespace-nowrap">
                                    <Plus size={18} /> הוסף מילה ללא תרגום
                                </button>
                                <button onClick={() => setShowAiModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium whitespace-nowrap">
                                    <Sparkles size={18} /> יצירת מילים עם AI
                                </button>
                                <button onClick={() => downloadTemplate()} className="flex items-center gap-2 bg-white/10 text-slate-300 hover:bg-white/20 px-4 py-2 rounded-lg transition-all font-medium whitespace-nowrap">
                                    <Download size={18} /> הורד תבנית
                                </button>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* View Mode: Table */}
            {viewMode === 'table' && (
                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                    <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="p-4">מקור</th>
                                    <th className="p-4">שם מקור / תורם</th>
                                    <th className="p-4">מונח (Term)</th>
                                    <th className="p-4">ניב</th>
                                    <th className="p-4">תרגום (עברית)</th>
                                    <th className="p-4">לטינית</th>
                                    <th className="p-4">קירילית</th>
                                    {isAdmin && <th className="p-4">פעולות</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {entries.map((entry, idx) => {
                                    const entryId = (entry as any).id;
                                    const isEditing = editingEntryId === entryId;
                                    return (
                                        <tr key={idx} className={`text-slate-200 ${isEditing ? 'bg-amber-900/30' : 'hover:bg-white/5'}`}>
                                            <td className="p-4">
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full border ${entry.source === 'AI' ? 'bg-purple-50 text-purple-600 border-purple-200' : entry.source === 'קהילה' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-900/30 text-emerald-400 border-emerald-700'}`}>{entry.source || 'מאגר'}</span>
                                            </td>
                                            <td className="p-4 text-xs text-slate-400">{(entry as any).sourceName || (entry as any).contributorName || '-'}</td>
                                            <td className="p-4 font-bold">
                                                {isEditing ? (
                                                    <input type="text" value={editForm.term} onChange={(e) => setEditForm({ ...editForm, term: e.target.value })} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" placeholder="מונח..." dir="auto" />
                                                ) : (entry.term || <span className="text-amber-500 text-sm">חסר term</span>)}
                                            </td>
                                            <td className="p-4">
                                                {isEditing ? (
                                                    <select value={editForm.dialect} onChange={(e) => setEditForm({ ...editForm, dialect: e.target.value })} className="w-full p-1 border rounded text-xs dark:bg-slate-800 dark:border-slate-600">
                                                        {dialects.map(d => (<option key={d.id} value={d.name}>{d.description || d.name}</option>))}
                                                    </select>
                                                ) : (<span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded text-xs">{entry.translations[0]?.dialect || '-'}</span>)}
                                            </td>
                                            <td className="p-4">
                                                {isEditing ? (
                                                    <input type="text" value={editForm.hebrew} onChange={(e) => setEditForm({ ...editForm, hebrew: e.target.value })} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" placeholder="תרגום עברי..." dir="rtl" />
                                                ) : (<span className="text-lg">{entry.translations[0]?.hebrew || <span className="text-amber-500 text-sm">מחכה לתרגום</span>}</span>)}
                                            </td>
                                            <td className="p-4">
                                                {isEditing ? (
                                                    <input type="text" value={editForm.latin} onChange={(e) => setEditForm({ ...editForm, latin: e.target.value })} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" placeholder="Latin..." dir="ltr" />
                                                ) : (<span className="text-xs text-slate-400">{entry.translations[0]?.latin || '-'}</span>)}
                                            </td>
                                            <td className="p-4">
                                                {isEditing ? (
                                                    <input type="text" value={editForm.cyrillic} onChange={(e) => setEditForm({ ...editForm, cyrillic: e.target.value })} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600" placeholder="Кириллица..." dir="ltr" />
                                                ) : (<span className="text-xs text-slate-400">{entry.translations[0]?.cyrillic || '-'}</span>)}
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4">
                                                    {isEditing ? (
                                                        <div className="flex gap-1">
                                                            <button onClick={handleSaveEdit} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="שמור"><Save size={16} /></button>
                                                            <button onClick={handleCancelEdit} className="p-2 text-slate-400 hover:bg-white/10 rounded transition-colors" title="בטל"><X size={16} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => handleStartEdit(entry)} className="p-2 text-indigo-400 hover:bg-indigo-900/20 rounded transition-colors" title="ערוך"><Save size={16} /></button>
                                                            <button onClick={() => handleDelete(entry.term)} className="p-2 text-red-500 hover:bg-red-900/20 rounded transition-colors" title="מחק"><Trash2 size={16} /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {entries.length === 0 && !entriesLoading && (
                                    <tr><td colSpan={8} className="p-12 text-center text-slate-400">לא נמצאו תוצאות</td></tr>
                                )}
                                {entriesLoading && (
                                    <tr><td colSpan={8} className="p-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-indigo-500" /></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-3 bg-white/5 border-t border-white/10">
                            <span className="text-xs text-slate-400">עמוד {currentPage} מתוך {totalPages} ({totalEntries} ערכים)</span>
                            <div className="flex gap-2">
                                <button onClick={() => loadEntries(currentPage - 1, searchFilter)} disabled={currentPage <= 1} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-600 text-xs disabled:opacity-50">הקודם</button>
                                <button onClick={() => loadEntries(currentPage + 1, searchFilter)} disabled={currentPage >= totalPages} className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-600 text-xs disabled:opacity-50">הבא</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* View Mode: Bulk */}
            {viewMode === 'bulk' && (
                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 p-4 space-y-4">
                    <div className="flex items-center gap-4 mb-2">
                        <label className="flex items-center gap-2 text-sm text-slate-300">
                            <input type="checkbox" checked={bulkNoTranslation} onChange={e => setBulkNoTranslation(e.target.checked)} />
                            מילים ללא תרגום (רק עמודה ראשונה)
                        </label>
                    </div>
                    <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="p-2">מונח</th>
                                    {!bulkNoTranslation && <><th className="p-2">עברית</th><th className="p-2">לטינית</th><th className="p-2">ניב</th><th className="p-2">הגדרה</th><th className="p-2">קירילית</th></>}
                                </tr>
                            </thead>
                            <tbody>
                                {gridData.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        {(bulkNoTranslation ? [0] : [0, 1, 2, 3, 4, 5]).map(cIdx => (
                                            <td key={cIdx} className="p-1">
                                                <input
                                                    type="text" value={row[cIdx]}
                                                    onChange={e => handleGridChange(rIdx, cIdx, e.target.value)}
                                                    onPaste={e => handleGridPaste(e, rIdx, cIdx)}
                                                    className="w-full p-1.5 border rounded text-xs dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                                    dir="auto"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex items-center gap-2">
                            <input type="number" min={1} max={100} value={rowsToAdd} onChange={e => setRowsToAdd(parseInt(e.target.value) || 1)} className="w-16 p-1 border rounded text-xs dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                            <button onClick={handleAddRows} className="px-3 py-1 bg-white/10 text-slate-300 rounded text-xs hover:bg-white/20">+ שורות</button>
                        </div>
                        <button onClick={handleClearGrid} className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30">נקה טבלה</button>
                        <button onClick={bulkNoTranslation ? handleSaveBulkUntranslated : handleSaveGrid} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">
                            <Save size={16} className="inline ml-1" /> שמור הכל
                        </button>
                    </div>
                </div>
            )}

            {/* AI Modal */}
            {showAiModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#0d1424]/60 backdrop-blur-xl p-6 rounded-xl shadow-2xl w-full max-w-md border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2"><Sparkles className="text-purple-500" /> יצירת רשומות אוטומטית</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-300">נושא / קטגוריה</label>
                                <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="למשל: כלי מטבח, ברכות לחג, מספרים..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-300">כמות רשומות</label>
                                <input type="number" min="1" max="20" value={aiCount} onChange={(e) => setAiCount(parseInt(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setShowAiModal(false)} className="flex-1 py-2 bg-slate-100 hover:bg-white/10 dark:hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">ביטול</button>
                                <button onClick={handleAiGenerate} disabled={isGenerating || !aiTopic} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                                    {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} {isGenerating ? 'מייצר...' : 'צור מילים'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Untranslated Words Modal */}
            {showUntranslatedModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-[#0d1424]/60 backdrop-blur-xl p-6 rounded-xl shadow-2xl w-full max-w-md border border-white/10">
                        <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
                            <Plus className="text-amber-500" /> הוסף מילה ללא תרגום
                        </h3>
                        <p className="text-sm text-slate-400 mb-4">הוסף מילה שהקהילה יוכל לתרגם.</p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-300">מילה בעברית *</label>
                                <input type="text" value={untranslatedTerm} onChange={e => setUntranslatedTerm(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" dir="rtl" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-300">מדריך הגייה (אופציונלי)</label>
                                <input type="text" value={untranslatedPronunciation} onChange={e => setUntranslatedPronunciation(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" dir="ltr" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setShowUntranslatedModal(false)} className="flex-1 py-2 bg-slate-100 hover:bg-white/10 dark:hover:bg-slate-600 rounded-lg text-slate-300 transition-colors">ביטול</button>
                                <button onClick={handleAddUntranslated} disabled={isAddingUntranslated || !untranslatedTerm.trim()} className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                                    {isAddingUntranslated ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} הוסף
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
