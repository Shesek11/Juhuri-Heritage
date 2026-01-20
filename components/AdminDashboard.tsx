
import React, { useState, useEffect } from 'react';
import { Database, Save, Trash2, FileSpreadsheet, Search, CheckCircle, XCircle, Sparkles, Loader2, Download, AlertCircle, Plus, Eraser, MapPin, Globe, LogOut, Users as UsersIcon, ShieldAlert, KeyRound, Activity, UserCheck, ToggleLeft } from 'lucide-react';
import FeatureFlagsPanel from './admin/FeatureFlagsPanel';
import { getCustomEntries, addCustomEntry, deleteCustomEntry, approveEntry, downloadTemplate, getDialects, addDialect, deleteDialect, getSystemLogs } from '../services/storageService';
import { generateBatchEntries } from '../services/geminiService';
import { getAllUsers, updateUserRole, deleteUser, updateUser } from '../services/authService';
import { DictionaryEntry, Translation, DialectItem, User, UserRole, SystemEvent } from '../types';

interface AdminDashboardProps {
    user: User; // Current logged in user
    onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onClose }) => {
    // Logic: Only Admins or Approvers should reach this component.
    const isAuthorized = user.role === 'admin' || user.role === 'approver';
    const isAdmin = user.role === 'admin';

    const [entries, setEntries] = useState<DictionaryEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'table' | 'pending' | 'import' | 'dialects' | 'users' | 'logs' | 'features'>('table');
    const [searchFilter, setSearchFilter] = useState('');

    // Dialect Management State
    const [dialects, setDialects] = useState<DialectItem[]>([]);
    const [newDialectName, setNewDialectName] = useState('');
    const [newDialectDesc, setNewDialectDesc] = useState('');

    // User Management State
    const [usersList, setUsersList] = useState<User[]>([]);

    // Logs State
    const [logs, setLogs] = useState<SystemEvent[]>([]);

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

    useEffect(() => {
        if (isAuthorized) {
            refreshData();
        }
    }, [isAuthorized]);

    // Refresh data whenever tab changes to ensure fresh data
    useEffect(() => {
        if (activeTab === 'users' && isAdmin) {
            getAllUsers().then(users => setUsersList(users || []));
        }
        if (activeTab === 'logs') {
            getSystemLogs().then(logs => setLogs(logs || []));
        }
    }, [activeTab, isAdmin]);

    const refreshData = async () => {
        try {
            const [entriesData, dialectsData] = await Promise.all([
                getCustomEntries(),
                getDialects()
            ]);
            setEntries(entriesData || []);
            setDialects(dialectsData || []);

            if (isAdmin) {
                const [usersData, logsData] = await Promise.all([
                    getAllUsers(),
                    getSystemLogs()
                ]);
                setUsersList(usersData || []);
                setLogs(logsData || []);
            }
        } catch (err) {
            console.error('Error refreshing data:', err);
        }
    };

    if (!isAuthorized) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 text-white p-4 text-center">
                <div>
                    <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-2xl font-bold">אין הרשאת גישה</h2>
                    <p className="text-slate-400 mb-4">חשבון זה אינו מורשה לגשת לממשק הניהול.</p>
                    <button onClick={onClose} className="px-4 py-2 bg-slate-700 rounded-lg">חזרה לאתר</button>
                </div>
            </div>
        )
    }

    // --- Dialect Handlers ---
    const handleAddDialect = (e: React.FormEvent) => {
        e.preventDefault();
        if (newDialectName.trim()) {
            addDialect(newDialectName, newDialectDesc, user);
            setNewDialectName('');
            setNewDialectDesc('');
            refreshData();
        }
    };

    const handleDeleteDialect = (id: string) => {
        if (confirm('למחוק ניב זה?')) {
            deleteDialect(id);
            refreshData();
        }
    }

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
                    source: 'Manual',
                    status: 'active',
                    contributorId: user.id
                };
                addCustomEntry(entry, user);
                savedCount++;
            }
        });
        if (savedCount > 0) {
            refreshData();
            alert(`נשמרו בהצלחה ${savedCount} רשומות!`);
            handleClearGrid();
            setActiveTab('table');
        } else {
            alert('לא נמצאו נתונים תקינים לשמירה.');
        }
    };

    // --- Entry Handlers ---
    const handleDelete = (term: string) => {
        if (confirm(`האם למחוק את הערך "${term}"?`)) {
            deleteCustomEntry(term, user);
            refreshData();
        }
    };

    const handleApprove = (term: string) => {
        approveEntry(term, user);
        refreshData();
    };

    const handleAiGenerate = async () => {
        if (!aiTopic.trim()) return;
        setIsGenerating(true);
        try {
            const generatedEntries = await generateBatchEntries(aiTopic, aiCount);
            generatedEntries.forEach(entry => {
                addCustomEntry({
                    ...entry,
                    source: 'AI',
                    status: 'active',
                    contributorId: user.id
                }, user);
            });
            refreshData();
            setShowAiModal(false);
            setAiTopic('');
            alert(`נוספו ${generatedEntries.length} מילים שנוצרו על ידי AI.`);
        } catch (e) {
            alert("שגיאה ביצירת נתונים. נסה שנית.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- User Handlers ---
    const handleRoleChange = async (userId: string, newRole: string) => {
        await updateUserRole(userId, newRole as UserRole, user);
        const users = await getAllUsers();
        setUsersList(users || []);
    };

    const handleDeleteUser = async (userId: string) => {
        if (userId === user.id) {
            alert("אינך יכול למחוק את עצמך.");
            return;
        }
        if (confirm("האם למחוק משתמש זה? פעולה זו היא בלתי הפיכה.")) {
            await deleteUser(userId, user);
            const users = await getAllUsers();
            setUsersList(users || []);
        }
    };

    const handleResetPassword = (userId: string) => {
        const newPassword = prompt("הזן סיסמה חדשה למשתמש זה:");
        if (newPassword && newPassword.trim()) {
            updateUser(userId, { password: newPassword });
            alert("הסיסמה שונתה בהצלחה.");
        }
    };

    const activeEntries = entries.filter(e => e.status !== 'pending');
    const pendingEntries = entries.filter(e => e.status === 'pending');

    const filteredActive = activeEntries.filter(e =>
        e.term.includes(searchFilter) ||
        e.translations.some(t => t.hebrew.includes(searchFilter) || t.latin.includes(searchFilter))
    );

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 overflow-y-auto font-rubik flex flex-col">
            {/* Header */}
            <header className="bg-slate-900 text-white p-4 shadow-md shrink-0">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Database className="text-amber-400" />
                        <h1 className="text-xl font-bold">ניהול מילון: {user.name} ({user.role})</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                            <span className="text-xs bg-slate-800 text-green-400 px-2 py-1 rounded border border-green-900">{activeEntries.length} פעילים</span>
                            <span className="text-xs bg-slate-800 text-amber-400 px-2 py-1 rounded border border-amber-900">{pendingEntries.length} בהמתנה</span>
                        </div>
                        <button onClick={onClose} className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors">יציאה לאתר</button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto w-full p-6 flex-1 flex flex-col">

                {/* Tabs */}
                <div className="flex gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-1 overflow-x-auto">
                    <button onClick={() => setActiveTab('table')} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'table' ? 'text-amber-600 border-b-2 border-amber-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                        <Database size={18} /> מאגר פעיל
                    </button>
                    <button onClick={() => setActiveTab('pending')} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'pending' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                        <CheckCircle size={18} /> אישורים ({pendingEntries.length})
                    </button>
                    {isAdmin && (
                        <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'users' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                            <UsersIcon size={18} /> משתמשים
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'logs' ? 'text-slate-600 border-b-2 border-slate-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                            <Activity size={18} /> יומן אירועים
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => setActiveTab('dialects')} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'dialects' ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                            <MapPin size={18} /> ניהול ניבים
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => setActiveTab('import')} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'import' ? 'text-green-600 border-b-2 border-green-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                            <FileSpreadsheet size={18} /> עורך טבלאי
                        </button>
                    )}
                    {isAdmin && (
                        <button onClick={() => setActiveTab('features')} className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors whitespace-nowrap ${activeTab === 'features' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}>
                            <ToggleLeft size={18} /> ניהול פיצ'רים
                        </button>
                    )}
                </div>

                {/* Tab: Active Table */}
                {activeTab === 'table' && (
                    <div className="flex-1 flex flex-col">
                        <div className="mb-4 flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute right-3 top-3 text-slate-400" size={20} />
                                <input type="text" placeholder="חיפוש במאגר הפעיל..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-full p-3 pr-10 rounded-lg border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                            </div>
                            {isAdmin && (
                                <>
                                    <button onClick={() => setShowUntranslatedModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium whitespace-nowrap">
                                        <Plus size={18} /> הוסף מילה ללא תרגום
                                    </button>
                                    <button onClick={() => setShowAiModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all font-medium whitespace-nowrap">
                                        <Sparkles size={18} /> יצירת מילים עם AI
                                    </button>
                                </>
                            )}
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 overflow-y-auto min-h-[400px]">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
                                    <tr>
                                        <th className="p-4">מקור</th>
                                        <th className="p-4">מונח (Term)</th>
                                        <th className="p-4">ניב</th>
                                        <th className="p-4">תרגום (עברית)</th>
                                        <th className="p-4">אושר ע"י</th>
                                        {isAdmin && <th className="p-4">פעולות</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredActive.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 text-slate-800 dark:text-slate-200">
                                            <td className="p-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${entry.source === 'AI' ? 'bg-purple-50 text-purple-600 border-purple-200' : entry.source === 'User' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{entry.source || 'Manual'}</span>
                                            </td>
                                            <td className="p-4 font-bold">{entry.term}</td>
                                            <td className="p-4"><span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs">{entry.translations[0]?.dialect || 'General'}</span></td>
                                            <td className="p-4 text-lg">{entry.translations[0]?.hebrew}</td>
                                            <td className="p-4 text-xs">
                                                {entry.approvedBy ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-green-600">{entry.approvedBy}</span>
                                                        {entry.approvedAt && <span className="text-slate-400">{new Date(entry.approvedAt).toLocaleDateString()}</span>}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4">
                                                    <button onClick={() => handleDelete(entry.term)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={16} /></button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {filteredActive.length === 0 && (<tr><td colSpan={6} className="p-8 text-center text-slate-400">אין נתונים להצגה</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab: Pending Approvals */}
                {activeTab === 'pending' && (
                    <div className="flex-1 flex flex-col">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
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
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 text-slate-800 dark:text-slate-200">
                                            <td className="p-4 font-bold text-lg">{entry.term}</td>
                                            <td className="p-4">{entry.translations[0]?.hebrew}</td>
                                            <td className="p-4"><span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded text-xs">{entry.translations[0]?.dialect || 'General'}</span></td>
                                            <td className="p-4 text-xs text-slate-500">{entry.contributorId ? 'משתמש רשום' : 'אורח'}</td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleApprove(entry.term)} className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors" title="אשר"><CheckCircle size={18} /></button>
                                                    <button onClick={() => handleDelete(entry.term)} className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors" title="דחה"><XCircle size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {pendingEntries.length === 0 && (<tr><td colSpan={5} className="p-12 text-center text-slate-400 flex flex-col items-center gap-2"><CheckCircle size={32} className="opacity-20" /><span>אין רשומות הממתינות לאישור</span></td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab: User Management (Admin Only) */}
                {activeTab === 'users' && isAdmin && (
                    <div className="flex-1 flex flex-col">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
                                    <tr>
                                        <th className="p-4">שם משתמש</th>
                                        <th className="p-4">אימייל</th>
                                        <th className="p-4">תאריך הרשמה</th>
                                        <th className="p-4">תרומות</th>
                                        <th className="p-4">תפקיד</th>
                                        <th className="p-4 w-32">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {usersList.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 text-slate-800 dark:text-slate-200">
                                            <td className="p-4 font-bold flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                                    <UsersIcon size={14} />
                                                </div>
                                                {u.name} {u.id === user.id && <span className="text-xs text-indigo-500">(אני)</span>}
                                            </td>
                                            <td className="p-4 text-slate-500">{u.email}</td>
                                            <td className="p-4 text-slate-500">{new Date(u.joinedAt).toLocaleDateString('he-IL')}</td>
                                            <td className="p-4">
                                                <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs border border-green-200">
                                                    {u.contributionsCount || 0}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={u.role}
                                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                                    className="bg-transparent border border-slate-300 dark:border-slate-600 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                                                    disabled={u.id === user.id}
                                                >
                                                    <option value="user">משתמש</option>
                                                    <option value="approver">מאשר תוכן</option>
                                                    <option value="admin">מנהל מערכת</option>
                                                </select>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleResetPassword(u.id)}
                                                        className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                                        title="אפס סיסמה"
                                                    >
                                                        <KeyRound size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(u.id)}
                                                        disabled={u.id === user.id}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="מחק משתמש"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab: System Logs (Admin Only) */}
                {activeTab === 'logs' && isAdmin && (
                    <div className="flex-1 flex flex-col">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden flex-1 overflow-y-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
                                    <tr>
                                        <th className="p-4">תאריך ושעה</th>
                                        <th className="p-4">סוג פעולה</th>
                                        <th className="p-4">משתמש מבצע</th>
                                        <th className="p-4">תיאור</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 text-slate-800 dark:text-slate-200">
                                            <td className="p-4 text-slate-500 font-mono text-xs">
                                                {new Date(log.timestamp).toLocaleString('he-IL')}
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${log.type?.includes('DELETED') || log.type?.includes('REJECTED') ? 'bg-red-50 text-red-600 border-red-200' :
                                                    log.type?.includes('APPROVED') ? 'bg-green-50 text-green-600 border-green-200' :
                                                        log.type?.includes('LOGIN') ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                            'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}>
                                                    {log.type || 'UNKNOWN'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold flex items-center gap-2">
                                                <UserCheck size={14} className="text-slate-400" />
                                                {log.userName}
                                            </td>
                                            <td className="p-4">{log.description}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (<tr><td colSpan={4} className="p-12 text-center text-slate-400">אין רישומים ביומן</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab: Dialect Management (Admin Only) */}
                {activeTab === 'dialects' && isAdmin && (
                    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
                        <div className="flex gap-4 mb-6 items-end bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">שם הניב (אנגלית/מזהה)</label>
                                <input type="text" value={newDialectName} onChange={(e) => setNewDialectName(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="למשל: Baku" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">תיאור (לתצוגה)</label>
                                <input type="text" value={newDialectDesc} onChange={(e) => setNewDialectDesc(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="למשל: באקו (עיר הבירה)" />
                            </div>
                            <button onClick={handleAddDialect} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 h-[42px]">
                                <Plus size={18} /> הוסף
                            </button>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 overflow-hidden">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium">
                                    <tr>
                                        <th className="p-4">מזהה / שם</th>
                                        <th className="p-4">תיאור תצוגה</th>
                                        <th className="p-4 w-20">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {dialects.map((d) => (
                                        <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 text-slate-800 dark:text-slate-200">
                                            <td className="p-4 font-bold">{d.name}</td>
                                            <td className="p-4">{d.description}</td>
                                            <td className="p-4">
                                                <button onClick={() => handleDeleteDialect(d.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab: Excel Grid (Admin Only) */}
                {activeTab === 'import' && isAdmin && (
                    <div className="flex-1 flex flex-col h-full">
                        <div className="flex-1 overflow-auto bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-inner rounded-lg relative">
                            <table className="w-full border-collapse text-sm">
                                <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm text-slate-600 dark:text-slate-300">
                                    <tr>
                                        <th className="border-b border-r dark:border-slate-700 p-2 min-w-[50px] bg-slate-100 dark:bg-slate-900 w-10 text-center">#</th>
                                        <th className="border-b border-r dark:border-slate-700 p-2 min-w-[150px] text-right">מונח (Term) *</th>
                                        <th className="border-b border-r dark:border-slate-700 p-2 min-w-[150px] text-right">תרגום עברי *</th>
                                        <th className="border-b border-r dark:border-slate-700 p-2 min-w-[150px] text-right">תעתיק לטיני</th>
                                        <th className="border-b border-r dark:border-slate-700 p-2 min-w-[120px] text-right">ניב</th>
                                        <th className="border-b border-r dark:border-slate-700 p-2 min-w-[200px] text-right">הגדרה</th>
                                        <th className="border-b dark:border-slate-700 p-2 min-w-[100px] text-right">קירילית</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800">
                                    {gridData.map((row, rIdx) => (
                                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                            <td className="border-b border-r dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-center text-xs text-slate-400 select-none">{rIdx + 1}</td>
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className="border-b border-r dark:border-slate-700 p-0 relative focus-within:ring-2 focus-within:ring-indigo-500 focus-within:z-10">
                                                    <input type="text" value={cell} onChange={(e) => handleGridChange(rIdx, cIdx, e.target.value)} onPaste={(e) => handleGridPaste(e, rIdx, cIdx)} className="w-full h-full px-2 py-2 bg-transparent border-none outline-none text-slate-800 dark:text-slate-200" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            <div className="flex gap-2 items-center">
                                <button onClick={handleAddRows} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"><Plus size={16} /> הוסף</button>
                                <input type="number" min="1" value={rowsToAdd} onChange={(e) => setRowsToAdd(parseInt(e.target.value) || 1)} className="w-16 p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-center text-sm" />
                                <span className="text-sm text-slate-500">שורות</span>
                                <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>
                                <button onClick={handleClearGrid} className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"><Eraser size={16} /> נקה טבלה</button>
                            </div>
                            <button onClick={handleSaveGrid} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-green-600/20 transition-all"><Save size={18} /> שמור טבלה למאגר</button>
                        </div>
                    </div>
                )}

                {/* Tab: Feature Flags (Admin Only) */}
                {activeTab === 'features' && isAdmin && (
                    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
                            <FeatureFlagsPanel />
                        </div>
                    </div>
                )}

            </div>
            {/* AI Modal (Same as before) */}
            {showAiModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2"><Sparkles className="text-purple-500" /> יצירת רשומות אוטומטית</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">נושא / קטגוריה</label>
                                <input type="text" value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="למשל: כלי מטבח, ברכות לחג, מספרים..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">כמות רשומות</label>
                                <input type="number" min="1" max="20" value={aiCount} onChange={(e) => setAiCount(parseInt(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setShowAiModal(false)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300 transition-colors">ביטול</button>
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
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                        <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                            <Plus className="text-amber-500" /> הוסף מילה ללא תרגום
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            הוסף מילה שהקהילה יוכל לתרגם. המילה תופיע בוידג'ט "מחכות לתרגום".
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">מילה בעברית *</label>
                                <input
                                    type="text"
                                    value={untranslatedTerm}
                                    onChange={(e) => setUntranslatedTerm(e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                    placeholder="למשל: אבא, אמא, שבת..."
                                    dir="rtl"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">מדריך הגייה (אופציונלי)</label>
                                <input
                                    type="text"
                                    value={untranslatedPronunciation}
                                    onChange={(e) => setUntranslatedPronunciation(e.target.value)}
                                    className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                    placeholder="למשל: a-BA"
                                    dir="ltr"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={() => { setShowUntranslatedModal(false); setUntranslatedTerm(''); setUntranslatedPronunciation(''); }}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300 transition-colors"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!untranslatedTerm.trim()) return;
                                        setIsAddingUntranslated(true);
                                        try {
                                            const res = await fetch('/api/dictionary/entries/add-untranslated', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                credentials: 'include',
                                                body: JSON.stringify({
                                                    term: untranslatedTerm.trim(),
                                                    detectedLanguage: 'Hebrew',
                                                    pronunciationGuide: untranslatedPronunciation.trim() || null
                                                })
                                            });
                                            if (res.ok) {
                                                alert('המילה נוספה בהצלחה! היא תופיע בוידג\'ט "מחכות לתרגום".');
                                                setShowUntranslatedModal(false);
                                                setUntranslatedTerm('');
                                                setUntranslatedPronunciation('');
                                                refreshData();
                                            } else {
                                                alert('שגיאה בהוספת מילה');
                                            }
                                        } catch (e) {
                                            alert('שגיאה בהוספת מילה');
                                        } finally {
                                            setIsAddingUntranslated(false);
                                        }
                                    }}
                                    disabled={isAddingUntranslated || !untranslatedTerm.trim()}
                                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    {isAddingUntranslated ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                                    {isAddingUntranslated ? 'מוסיף...' : 'הוסף לתרגום'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
