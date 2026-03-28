'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Database, Search, FileSpreadsheet, Plus, Sparkles, Loader2, Save, Trash2, X, Download, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCustomEntries, addCustomEntry, deleteCustomEntry, approveEntry, getDialects, downloadTemplate } from '../../services/storageService';
import { generateBatchEntries } from '../../services/geminiService';
import { DictionaryEntry, DialectScript, DialectItem } from '../../types';

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
    const [editForm, setEditForm] = useState({ hebrewScript: '', hebrewShort: '', latinScript: '', cyrillicScript: '', dialect: '' });

    // Column Visibility
    const ALL_COLUMNS = [
        { key: 'source', label: 'מקור', default: true },
        { key: 'sourceName', label: 'שם מקור', default: false },
        { key: 'hebrewScript', label: 'תעתיק עברי', default: true },
        { key: 'latinScript', label: 'תעתיק לטיני', default: true },
        { key: 'cyrillicScript', label: 'תעתיק קירילי', default: true },
        { key: 'pronunciationGuide', label: 'הגייה', default: false },
        { key: 'dialect', label: 'ניב', default: false },
        { key: 'hebrewShort', label: 'משמעות עברית', default: true },
        { key: 'hebrewLong', label: 'הגדרה עברית', default: false },
        { key: 'russianShort', label: 'משמעות רוסית', default: true },
        { key: 'russianLong', label: 'הגדרה רוסית', default: false },
        { key: 'englishShort', label: 'משמעות אנגלית', default: false },
        { key: 'englishLong', label: 'הגדרה אנגלית', default: false },
        { key: 'partOfSpeech', label: 'חלק דיבר', default: true },
    ] as const;

    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('admin-dict-columns') : null;
        if (saved) return new Set(JSON.parse(saved));
        return new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key));
    });
    const [showColumnPicker, setShowColumnPicker] = useState(false);

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            localStorage.setItem('admin-dict-columns', JSON.stringify([...next]));
            return next;
        });
    };

    const isColVisible = (key: string) => visibleColumns.has(key);
    const visibleCount = visibleColumns.size + (isAdmin ? 1 : 0); // +1 for actions column

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
            const [hebrewScript, hebrewShort, latinScript, dialect, definition, cyrillicScript] = row;
            if (hebrewScript.trim() && hebrewShort.trim()) {
                const dialectScript: DialectScript = {
                    dialect: dialect.trim() || 'General',
                    hebrewScript: hebrewShort.trim(),
                    latinScript: latinScript.trim() || hebrewScript.trim(),
                    cyrillicScript: cyrillicScript.trim() || ''
                };
                const entry: DictionaryEntry = {
                    hebrewScript: hebrewScript.trim(),
                    detectedLanguage: 'Hebrew',
                    dialectScripts: [dialectScript],
                    hebrewLong: definition.trim() ? definition.trim() : null,
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

    const handleDelete = (hebrewScript: string) => {
        if (!user) return;
        if (confirm(`האם למחוק את הערך "${hebrewScript}"?`)) {
            deleteCustomEntry(hebrewScript, user);
            loadEntries(currentPage, searchFilter);
        }
    };

    const handleStartEdit = (entry: DictionaryEntry) => {
        const entryId = (entry as any).id;
        if (!entryId) { alert('לא ניתן לערוך ערך זה - חסר מזהה'); return; }
        setEditingEntryId(entryId);
        setEditForm({
            hebrewScript: entry.hebrewScript || '', hebrewShort: entry.dialectScripts[0]?.hebrewScript || '',
            latinScript: entry.dialectScripts[0]?.latinScript || '', cyrillicScript: entry.dialectScripts[0]?.cyrillicScript || '',
            dialect: entry.dialectScripts[0]?.dialect || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingEntryId(null);
        setEditForm({ hebrewScript: '', hebrewShort: '', latinScript: '', cyrillicScript: '', dialect: '' });
    };

    const handleSaveEdit = async () => {
        if (!editingEntryId) return;
        try {
            const entry = entries.find(e => (e as any).id === editingEntryId);
            const dialectScriptId = (entry?.dialectScripts[0] as any)?.id;
            if (editForm.hebrewScript !== (entry?.hebrewScript || '')) {
                await fetch(`/api/dictionary/entries/${editingEntryId}/update-term`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', body: JSON.stringify({ hebrewScript: editForm.hebrewScript })
                });
            }
            if (dialectScriptId) {
                await fetch(`/api/dictionary/dialect-scripts/${dialectScriptId}`, {
                    method: 'PUT', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ hebrewScript: editForm.hebrewShort, latinScript: editForm.latinScript, cyrillicScript: editForm.cyrillicScript })
                });
            } else {
                await fetch(`/api/dictionary/entries/${editingEntryId}/suggest`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ dialect: editForm.dialect, hebrewScript: editForm.hebrewShort, latinScript: editForm.latinScript, cyrillicScript: editForm.cyrillicScript, reason: 'עריכה ידנית' })
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
                        <input type="text" placeholder="חיפוש במאגר..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-full p-3 ps-10 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
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
                    {/* Column Picker */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColumnPicker(!showColumnPicker)}
                            className="flex items-center gap-1.5 px-3 py-1.5 m-2 text-xs rounded-lg bg-white/10 text-slate-300 hover:bg-white/20 transition-colors"
                        >
                            <SlidersHorizontal size={14} /> עמודות ({visibleColumns.size})
                        </button>
                        {showColumnPicker && (
                            <div className="absolute top-10 right-2 z-30 bg-slate-800 border border-white/10 rounded-lg shadow-xl p-3 grid grid-cols-2 gap-2 min-w-[320px]">
                                {ALL_COLUMNS.map(col => (
                                    <label key={col.key} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns.has(col.key)}
                                            onChange={() => toggleColumn(col.key)}
                                            className="rounded border-slate-600"
                                        />
                                        {col.label}
                                    </label>
                                ))}
                                <div className="col-span-2 flex gap-2 mt-2 pt-2 border-t border-white/10">
                                    <button onClick={() => { const all = new Set(ALL_COLUMNS.map(c => c.key)); setVisibleColumns(all); localStorage.setItem('admin-dict-columns', JSON.stringify([...all])); }} className="text-[10px] text-indigo-400 hover:text-indigo-300">הצג הכל</button>
                                    <button onClick={() => { const def = new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key)); setVisibleColumns(def); localStorage.setItem('admin-dict-columns', JSON.stringify([...def])); }} className="text-[10px] text-slate-400 hover:text-slate-300">ברירת מחדל</button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
                        <table className="w-full text-sm text-start">
                            <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                                <tr>
                                    {isColVisible('source') && <th className="p-3 whitespace-nowrap">מקור</th>}
                                    {isColVisible('sourceName') && <th className="p-3 whitespace-nowrap">שם מקור</th>}
                                    {isColVisible('hebrewScript') && <th className="p-3 whitespace-nowrap">תעתיק עברי</th>}
                                    {isColVisible('latinScript') && <th className="p-3 whitespace-nowrap">תעתיק לטיני</th>}
                                    {isColVisible('cyrillicScript') && <th className="p-3 whitespace-nowrap">תעתיק קירילי</th>}
                                    {isColVisible('pronunciationGuide') && <th className="p-3 whitespace-nowrap">הגייה</th>}
                                    {isColVisible('dialect') && <th className="p-3 whitespace-nowrap">ניב</th>}
                                    {isColVisible('hebrewShort') && <th className="p-3 whitespace-nowrap">משמעות עברית</th>}
                                    {isColVisible('hebrewLong') && <th className="p-3 whitespace-nowrap max-w-[200px]">הגדרה עברית</th>}
                                    {isColVisible('russianShort') && <th className="p-3 whitespace-nowrap">משמעות רוסית</th>}
                                    {isColVisible('russianLong') && <th className="p-3 whitespace-nowrap max-w-[200px]">הגדרה רוסית</th>}
                                    {isColVisible('englishShort') && <th className="p-3 whitespace-nowrap">משמעות אנגלית</th>}
                                    {isColVisible('englishLong') && <th className="p-3 whitespace-nowrap max-w-[200px]">הגדרה אנגלית</th>}
                                    {isColVisible('partOfSpeech') && <th className="p-3 whitespace-nowrap">חלק דיבר</th>}
                                    {isAdmin && <th className="p-3 whitespace-nowrap">פעולות</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {entries.map((entry, idx) => {
                                    const entryId = (entry as any).id;
                                    const isEditing = editingEntryId === entryId;
                                    const ds = entry.dialectScripts?.[0];
                                    return (
                                        <tr key={idx} className={`text-slate-200 ${isEditing ? 'bg-amber-900/30' : 'hover:bg-white/5'}`}>
                                            {isColVisible('source') && (
                                                <td className="p-3">
                                                    <span className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap ${entry.source === 'AI' ? 'bg-purple-900/30 text-purple-400 border-purple-700' : entry.source === 'קהילה' ? 'bg-blue-900/30 text-blue-400 border-blue-700' : 'bg-emerald-900/30 text-emerald-400 border-emerald-700'}`}>{entry.source || 'מאגר'}</span>
                                                </td>
                                            )}
                                            {isColVisible('sourceName') && (
                                                <td className="p-3 text-xs text-slate-400 max-w-[120px] truncate">{(entry as any).sourceName || (entry as any).contributorName || '-'}</td>
                                            )}
                                            {isColVisible('hebrewScript') && (
                                                <td className="p-3 font-bold">
                                                    {isEditing ? (
                                                        <input type="text" value={editForm.hebrewScript} onChange={(e) => setEditForm({ ...editForm, hebrewScript: e.target.value })} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 text-sm" dir="auto" />
                                                    ) : (entry.hebrewScript || <span className="text-amber-500 text-xs">—</span>)}
                                                </td>
                                            )}
                                            {isColVisible('latinScript') && (
                                                <td className="p-3">
                                                    {isEditing ? (
                                                        <input type="text" value={editForm.latinScript} onChange={(e) => setEditForm({ ...editForm, latinScript: e.target.value })} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 text-xs" dir="ltr" />
                                                    ) : (<span className="text-xs text-slate-400 font-mono" dir="ltr">{ds?.latinScript || '-'}</span>)}
                                                </td>
                                            )}
                                            {isColVisible('cyrillicScript') && (
                                                <td className="p-3">
                                                    {isEditing ? (
                                                        <input type="text" value={editForm.cyrillicScript} onChange={(e) => setEditForm({ ...editForm, cyrillicScript: e.target.value })} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 text-xs" dir="ltr" />
                                                    ) : (<span className="text-xs text-slate-400" dir="ltr">{ds?.cyrillicScript || '-'}</span>)}
                                                </td>
                                            )}
                                            {isColVisible('pronunciationGuide') && (
                                                <td className="p-3 text-xs text-slate-400 font-mono" dir="ltr">{ds?.pronunciationGuide || '-'}</td>
                                            )}
                                            {isColVisible('dialect') && (
                                                <td className="p-3">
                                                    {isEditing ? (
                                                        <select value={editForm.dialect} onChange={(e) => setEditForm({ ...editForm, dialect: e.target.value })} className="w-full p-1 border rounded text-xs dark:bg-slate-800 dark:border-slate-600">
                                                            {dialects.map(d => (<option key={d.id} value={d.name}>{d.description || d.name}</option>))}
                                                        </select>
                                                    ) : (<span className="bg-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded text-[11px]">{ds?.dialect || '-'}</span>)}
                                                </td>
                                            )}
                                            {isColVisible('hebrewShort') && (
                                                <td className="p-3">
                                                    {isEditing ? (
                                                        <input type="text" value={editForm.hebrewShort} onChange={(e) => setEditForm({ ...editForm, hebrewShort: e.target.value })} className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600 text-sm" dir="rtl" />
                                                    ) : (<span className="text-sm">{entry.hebrewShort || <span className="text-slate-500 text-xs">—</span>}</span>)}
                                                </td>
                                            )}
                                            {isColVisible('hebrewLong') && (
                                                <td className="p-3 max-w-[200px]"><span className="text-xs text-slate-400 line-clamp-2">{entry.hebrewLong || '-'}</span></td>
                                            )}
                                            {isColVisible('russianShort') && (
                                                <td className="p-3"><span className="text-xs text-slate-300" dir="ltr">{entry.russianShort || '-'}</span></td>
                                            )}
                                            {isColVisible('russianLong') && (
                                                <td className="p-3 max-w-[200px]"><span className="text-xs text-slate-400 line-clamp-2" dir="ltr">{entry.russianLong || '-'}</span></td>
                                            )}
                                            {isColVisible('englishShort') && (
                                                <td className="p-3"><span className="text-xs text-slate-300" dir="ltr">{entry.englishShort || '-'}</span></td>
                                            )}
                                            {isColVisible('englishLong') && (
                                                <td className="p-3 max-w-[200px]"><span className="text-xs text-slate-400 line-clamp-2" dir="ltr">{entry.englishLong || '-'}</span></td>
                                            )}
                                            {isColVisible('partOfSpeech') && (
                                                <td className="p-3"><span className="text-xs text-indigo-300">{entry.partOfSpeech || '-'}</span></td>
                                            )}
                                            {isAdmin && (
                                                <td className="p-3">
                                                    {isEditing ? (
                                                        <div className="flex gap-1">
                                                            <button onClick={handleSaveEdit} className="p-1.5 text-green-500 hover:bg-green-900/20 rounded transition-colors" title="שמור"><Save size={14} /></button>
                                                            <button onClick={handleCancelEdit} className="p-1.5 text-slate-400 hover:bg-white/10 rounded transition-colors" title="בטל"><X size={14} /></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => handleStartEdit(entry)} className="p-1.5 text-indigo-400 hover:bg-indigo-900/20 rounded transition-colors" title="ערוך"><Save size={14} /></button>
                                                            <button onClick={() => handleDelete(entry.hebrewScript)} className="p-1.5 text-red-500 hover:bg-red-900/20 rounded transition-colors" title="מחק"><Trash2 size={14} /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                                {entries.length === 0 && !entriesLoading && (
                                    <tr><td colSpan={visibleCount} className="p-12 text-center text-slate-400">לא נמצאו תוצאות</td></tr>
                                )}
                                {entriesLoading && (
                                    <tr><td colSpan={visibleCount} className="p-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-indigo-500" /></td></tr>
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
                        <table className="w-full text-sm text-start">
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
                            <Save size={16} className="inline me-1" /> שמור הכל
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
