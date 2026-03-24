
import React, { useState, useEffect, useRef } from 'react';
import { Database, Save, Trash2, FileSpreadsheet, Search, CheckCircle, XCircle, Sparkles, Loader2, Download, AlertCircle, Plus, Eraser, MapPin, Globe, LogOut, Users as UsersIcon, ShieldAlert, KeyRound, Activity, UserCheck, ToggleLeft, Pencil, X, Play, Pause, Volume2, Edit3, Tag, ChevronDown, ChevronUp, BookOpen, ShoppingCart, GitBranch, Settings, Bot, Info } from 'lucide-react';

// Section descriptions for admin panel
const SECTION_DESCRIPTIONS: Record<string, string> = {
    dict_active: 'כל המילים הפעילות במאגר. ניתן לחפש, לערוך ולמחוק ערכים.',
    dict_pending: 'הצעות תרגום ותיקוני שדות שממתינים לאישור מנהל.',
    dict_ai: 'שדות שמולאו אוטומטית על ידי AI. בחר ואשר כדי להפוך לתוכן קהילתי מאושר.',
    dict_dialects: 'ניהול רשימת הניבים (דיאלקטים) הזמינים במילון.',
    gen_users: 'ניהול משתמשים, שינוי תפקידים ואיפוס סיסמאות.',
    gen_logs: 'יומן אירועים מהמערכת: כניסות, שינויים, שגיאות.',
    gen_features: 'הפעלה/כיבוי של פיצ\'רים באתר. שינויים חלים מיד.',
    gen_settings: 'הגדרת מפתחות API (Gemini). ניתן לבדוק חיבור.',
    recipe_tags: 'ניהול תגיות לסינון מתכונים (סוג מנה, מרכיבים, אזור).',
    market_vendors: 'ניהול חנויות בשוק: אישור, חסימה, תלונות.',
    family_suggestions: 'בקשות מיזוג ושיוך באילן היוחסין.',
    seo_management: 'ניהול SEO: תבניות meta, robots.txt, הפניות, סקירת מצב.',
    seo_analytics: 'נתוני Google Analytics: משתמשים, צפיות, מקורות תנועה ומכשירים.',
};

/** Small info bar showing section description */
const SectionInfoBar: React.FC<{ sectionId: string }> = ({ sectionId }) => {
    const desc = SECTION_DESCRIPTIONS[sectionId];
    if (!desc) return null;
    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-indigo-900/40 border border-indigo-500/20 rounded-lg text-xs text-indigo-300 mb-4">
            <Info size={14} className="shrink-0" />
            <span>{desc}</span>
        </div>
    );
};
import FeatureFlagsPanel from './admin/FeatureFlagsPanel';
import ApiSettingsPanel from './admin/ApiSettingsPanel';
import AdminTagsPanel from './admin/AdminTagsPanel';
import AdminFamilyPanel from './admin/AdminFamilyPanel';
import AdminMarketplacePanel from './admin/AdminMarketplacePanel';
import AdminSEOPanel from './admin/AdminSEOPanel';
import AdminAnalyticsPanel from './admin/AdminAnalyticsPanel';
import { getCustomEntries, addCustomEntry, deleteCustomEntry, approveEntry, downloadTemplate, getDialects, addDialect, deleteDialect, getSystemLogs } from '../services/storageService';
import { generateBatchEntries } from '../services/geminiService';
import { getAllUsers, updateUserRole, deleteUser, updateUser } from '../services/authService';
import { DictionaryEntry, Translation, DialectItem, User, UserRole, SystemEvent } from '../types';

interface AdminDashboardProps {
    user: User; // Current logged in user
    onClose: () => void;
}

// Translation Suggestion interface
interface TranslationSuggestion {
    id: number;
    entry_id: number;
    dialect: string;
    suggested_hebrew: string;
    suggested_latin: string;
    suggested_cyrillic: string;
    suggested_russian: string | null;
    user_id: string | null;
    user_name: string | null;
    status: string;
    created_at: string;
    audio_url: string | null;
    audio_duration: number | null;
    translation_id: number | null; // If set, this is a correction
    field_name: string | null;     // If set, this is a per-field suggestion
    reason: string | null;
    term: string;
    contributor_name: string | null;
}

// Field labels for admin display
const ADMIN_FIELD_LABELS: Record<string, string> = {
    hebrew: 'עברית',
    latin: 'לטיני',
    cyrillic: 'קירילי',
    russian: 'רוסית',
    definition: 'הגדרה',
    pronunciationGuide: 'הגייה',
    partOfSpeech: 'חלק דיבר',
    dialect: 'ניב',
};

// Sidebar menu structure
interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    children?: SubMenuItem[];
}

interface SubMenuItem {
    id: string;
    label: string;
    badge?: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onClose }) => {
    // Logic: Only Admins or Approvers should reach this component.
    const isAuthorized = user.role === 'admin' || user.role === 'approver';
    const isAdmin = user.role === 'admin';

    const [entries, setEntries] = useState<DictionaryEntry[]>([]);
    const [activeSection, setActiveSectionState] = useState<string>(() => {
        if (typeof window !== 'undefined' && window.location.hash) {
            return window.location.hash.slice(1) || 'dict_active';
        }
        return 'dict_active';
    });

    const setActiveSection = (section: string) => {
        setActiveSectionState(section);
        window.history.pushState(null, '', `#${section}`);
    };

    useEffect(() => {
        const onPopState = () => {
            const hash = window.location.hash.slice(1);
            if (hash) setActiveSectionState(hash);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);
    const [searchFilter, setSearchFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalEntries, setTotalEntries] = useState(0);
    const [entriesLoading, setEntriesLoading] = useState(false);
    const entriesPerPage = 50;
    const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set(['dictionary', 'general']));

    // Dialect Management State
    const [dialects, setDialects] = useState<DialectItem[]>([]);
    const [newDialectName, setNewDialectName] = useState('');
    const [newDialectDesc, setNewDialectDesc] = useState('');

    // User Management State
    const [usersList, setUsersList] = useState<User[]>([]);

    // Logs State
    const [logs, setLogs] = useState<SystemEvent[]>([]);

    // Translation Suggestions State
    const [suggestions, setSuggestions] = useState<TranslationSuggestion[]>([]);
    const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // AI Fields Confirmation State
    const [aiFieldEntries, setAiFieldEntries] = useState<any[]>([]);
    const [aiFieldsTotal, setAiFieldsTotal] = useState(0);
    const [aiFieldsPage, setAiFieldsPage] = useState(1);
    const [aiFieldsTotalPages, setAiFieldsTotalPages] = useState(1);
    const [aiFieldsLoading, setAiFieldsLoading] = useState(false);
    const [selectedAiEntries, setSelectedAiEntries] = useState<Set<number>>(new Set());
    const [bulkConfirming, setBulkConfirming] = useState(false);

    // Grid State
    const [gridData, setGridData] = useState<string[][]>(
        Array(15).fill('').map(() => Array(6).fill(''))
    );
    const [rowsToAdd, setRowsToAdd] = useState(1);
    const [viewMode, setViewMode] = useState<'table' | 'bulk'>('table');
    const [bulkNoTranslation, setBulkNoTranslation] = useState(false);

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
    const [editForm, setEditForm] = useState<{
        term: string;
        hebrew: string;
        latin: string;
        cyrillic: string;
        dialect: string;
    }>({ term: '', hebrew: '', latin: '', cyrillic: '', dialect: '' });

    useEffect(() => {
        if (isAuthorized) {
            refreshData();
        }
    }, [isAuthorized]);

    // Refresh data whenever active section changes
    useEffect(() => {
        if (activeSection === 'gen_users' && isAdmin) {
            getAllUsers().then(users => setUsersList(users || []));
        }
        if (activeSection === 'gen_logs') {
            getSystemLogs().then(logs => setLogs(logs || []));
        }
        if (activeSection === 'dict_pending') {
            // Fetch translation suggestions
            fetch('/api/dictionary/pending-suggestions')
                .then(res => res.json())
                .then(data => setSuggestions(data.suggestions || []))
                .catch(err => console.error('Error fetching suggestions:', err));
        }
        if (activeSection === 'dict_ai') {
            loadAiFields(1);
        }
    }, [activeSection, isAdmin]);

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
        } catch (err) {
            console.error('Error loading AI fields:', err);
        } finally {
            setAiFieldsLoading(false);
        }
    };

    const handleBulkConfirmAi = async () => {
        if (selectedAiEntries.size === 0) return;
        setBulkConfirming(true);
        try {
            const res = await fetch('/api/dictionary/bulk-confirm-ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ entryIds: Array.from(selectedAiEntries) })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                loadAiFields(aiFieldsPage);
            } else {
                alert(data.error || 'שגיאה באישור');
            }
        } catch (err) {
            console.error('Bulk confirm error:', err);
            alert('שגיאה באישור מרובה');
        } finally {
            setBulkConfirming(false);
        }
    };

    const refreshData = async () => {
        try {
            const [, dialectsData] = await Promise.all([
                loadEntries(1, searchFilter),
                getDialects()
            ]);
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

    // Debounced search
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (activeSection === 'dict_active') {
                loadEntries(1, searchFilter);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [searchFilter]);

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

    // --- Sidebar Menu Structure ---
    const activeEntries = entries.filter(e => e.status !== 'pending');
    const pendingEntries = entries.filter(e => e.status === 'pending');

    const menuItems: MenuItem[] = [
        {
            id: 'dictionary',
            label: 'מילון',
            icon: <BookOpen size={20} />,
            children: [
                { id: 'dict_active', label: 'מאגר פעיל' },
                { id: 'dict_pending', label: 'אישורים', badge: pendingEntries.length },
                { id: 'dict_ai', label: 'אישור AI' },
                { id: 'dict_dialects', label: 'ניהול ניבים' }
            ]
        },
        {
            id: 'recipes',
            label: 'מתכונים',
            icon: <Tag size={20} />,
            children: [
                { id: 'recipe_tags', label: 'ניהול תגיות' }
            ]
        },
        {
            id: 'marketplace',
            label: 'שוק',
            icon: <ShoppingCart size={20} />,
            children: [
                { id: 'market_vendors', label: 'ניהול חנויות' }
            ]
        },
        {
            id: 'family',
            label: 'אילן יוחסין',
            icon: <GitBranch size={20} />,
            children: [
                { id: 'family_suggestions', label: 'הצעות ובקשות' }
            ]
        },
        {
            id: 'seo',
            label: 'SEO',
            icon: <Globe size={20} />,
            children: [
                { id: 'seo_management', label: 'ניהול SEO' },
                { id: 'seo_analytics', label: 'Analytics' }
            ]
        },
        {
            id: 'general',
            label: 'כללי',
            icon: <Settings size={20} />,
            children: [
                { id: 'gen_users', label: 'משתמשים' },
                { id: 'gen_logs', label: 'יומן אירועים' },
                { id: 'gen_features', label: 'ניהול פיצ\'רים' },
                { id: 'gen_settings', label: 'מפתחות API' }
            ]
        }
    ];

    const toggleMenu = (menuId: string) => {
        setExpandedMenus(prev => {
            const newSet = new Set(prev);
            if (newSet.has(menuId)) {
                newSet.delete(menuId);
            } else {
                newSet.add(menuId);
            }
            return newSet;
        });
    };

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
                    source: 'מאגר',
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
            setViewMode('table');
        } else {
            alert('לא נמצאו נתונים תקינים לשמירה.');
        }
    };

    const handleSaveBulkUntranslated = async () => {
        const terms = gridData.map(row => row[0].trim()).filter(Boolean);
        if (terms.length === 0) {
            alert('לא נמצאו מילים לשמירה.');
            return;
        }

        let savedCount = 0;
        for (const term of terms) {
            try {
                const res = await fetch('/api/dictionary/entries/add-untranslated', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        term,
                        detectedLanguage: 'Hebrew'
                    })
                });
                if (res.ok) savedCount++;
            } catch (e) {
                console.error('Error saving term:', term, e);
            }
        }

        if (savedCount > 0) {
            refreshData();
            alert(`נוספו בהצלחה ${savedCount} מילים ללא תרגום!`);
            handleClearGrid();
            setViewMode('table');
        } else {
            alert('שגיאה בשמירה.');
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

    const handleStartEdit = (entry: DictionaryEntry) => {
        // Find the entry ID - entries should have an id from the database
        const entryId = (entry as any).id;
        if (!entryId) {
            alert('לא ניתן לערוך ערך זה - חסר מזהה');
            return;
        }
        setEditingEntryId(entryId);
        setEditForm({
            term: entry.term || '',
            hebrew: entry.translations[0]?.hebrew || '',
            latin: entry.translations[0]?.latin || '',
            cyrillic: entry.translations[0]?.cyrillic || '',
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
            // Find the translation ID for this entry
            const entry = entries.find(e => (e as any).id === editingEntryId);
            const translationId = (entry?.translations[0] as any)?.id;

            // Update term if changed
            if (editForm.term !== (entry?.term || '')) {
                await fetch(`/api/dictionary/entries/${editingEntryId}/update-term`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ term: editForm.term })
                });
            }

            if (translationId) {
                // Update existing translation
                await fetch(`/api/dictionary/translations/${translationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        hebrew: editForm.hebrew,
                        latin: editForm.latin,
                        cyrillic: editForm.cyrillic
                    })
                });
            } else {
                // Add new translation to entry without one
                await fetch(`/api/dictionary/entries/${editingEntryId}/suggest`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        dialect: editForm.dialect,
                        hebrew: editForm.hebrew,
                        latin: editForm.latin,
                        cyrillic: editForm.cyrillic,
                        reason: 'עריכה ידנית'
                    })
                });
            }

            handleCancelEdit();
            refreshData();
            alert('נשמר בהצלחה!');
        } catch (err) {
            console.error('Save edit error:', err);
            alert('שגיאה בשמירה');
        }
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

    // --- Suggestion Handlers ---
    const handleApproveSuggestion = async (suggestionId: number) => {
        try {
            const res = await fetch(`/api/dictionary/suggestions/${suggestionId}/approve`, {
                method: 'PUT',
                credentials: 'include'
            });
            if (res.ok) {
                setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
                alert('ההצעה אושרה בהצלחה!');
            } else {
                alert('שגיאה באישור ההצעה');
            }
        } catch (err) {
            console.error('Error approving suggestion:', err);
            alert('שגיאה באישור ההצעה');
        }
    };

    const handleRejectSuggestion = async (suggestionId: number) => {
        if (!confirm('האם לדחות את ההצעה?')) return;
        try {
            const res = await fetch(`/api/dictionary/suggestions/${suggestionId}/reject`, {
                method: 'PUT',
                credentials: 'include'
            });
            if (res.ok) {
                setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
                alert('ההצעה נדחתה');
            } else {
                alert('שגיאה בדחיית ההצעה');
            }
        } catch (err) {
            console.error('Error rejecting suggestion:', err);
            alert('שגיאה בדחיית ההצעה');
        }
    };

    const handlePlayAudio = (suggestionId: number, audioUrl: string) => {
        if (playingAudioId === suggestionId) {
            // Stop playing
            audioRef.current?.pause();
            setPlayingAudioId(null);
        } else {
            // Start playing
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.play();
            setPlayingAudioId(suggestionId);
            audio.onended = () => setPlayingAudioId(null);
        }
    };

    // Server-side search + pagination - entries are already filtered
    const filteredActive = entries;

    return (
        <div className="fixed inset-0 z-50 bg-[#050B14] overflow-hidden font-rubik flex flex-col">
            {/* Header */}
            <header className="bg-[#0d1424]/80 backdrop-blur-xl border-b border-white/10 text-white p-4 shadow-md shrink-0">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Database className="text-amber-400" />
                        <h1 className="text-xl font-bold">שביבלן - ממשק ניהול</h1>
                        <span className="text-sm text-slate-400">({user.name} - {user.role})</span>
                    </div>
                    <button onClick={onClose} className="text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded transition-colors">יציאה לאתר</button>
                </div>
            </header>

            {/* Main Layout: Sidebar + Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className="w-64 bg-[#0d1424]/60 backdrop-blur-xl border-l border-white/10 overflow-y-auto shrink-0">
                    <nav className="p-4 space-y-2">
                        {menuItems.map(menu => {
                            // Hide non-admin sections for non-admins
                            if (!isAdmin && menu.id === 'general') return null;

                            const isExpanded = expandedMenus.has(menu.id);
                            const hasActiveChild = menu.children?.some(child => child.id === activeSection);

                            return (
                                <div key={menu.id}>
                                    {/* Menu Header */}
                                    <button
                                        onClick={() => toggleMenu(menu.id)}
                                        className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                                            hasActiveChild || isExpanded
                                                ? 'bg-amber-900/30 text-amber-400'
                                                : 'text-slate-300 hover:bg-white/10'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {menu.icon}
                                            <span className="font-semibold">{menu.label}</span>
                                        </div>
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>

                                    {/* Sub-menu Items */}
                                    {isExpanded && menu.children && (
                                        <div className="mr-4 mt-1 space-y-1">
                                            {menu.children.map(child => {
                                                const isActive = activeSection === child.id;
                                                const isDisabled = child.id.includes('coming');

                                                return (
                                                    <button
                                                        key={child.id}
                                                        onClick={() => !isDisabled && setActiveSection(child.id)}
                                                        disabled={isDisabled}
                                                        className={`w-full flex items-center justify-between p-2 pr-4 rounded-lg transition-colors text-sm ${
                                                            isActive
                                                                ? 'bg-amber-500 text-white font-medium'
                                                                : isDisabled
                                                                ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed italic'
                                                                : 'text-slate-400 hover:bg-white/10'
                                                        }`}
                                                    >
                                                        <span>{child.label}</span>
                                                        {child.badge !== undefined && child.badge > 0 && (
                                                            <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                                                {child.badge}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">

                        {/* Dictionary: Active Table */}
                        {activeSection === 'dict_active' && (
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
                                                    {filteredActive.map((entry, idx) => {
                                                        const entryId = (entry as any).id;
                                                        const isEditing = editingEntryId === entryId;

                                                        return (
                                                            <tr key={idx} className={`text-slate-200 ${isEditing ? 'bg-amber-900/30' : 'hover:bg-white/5'}`}>
                                                                <td className="p-4">
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${entry.source === 'AI' ? 'bg-purple-50 text-purple-600 border-purple-200' : entry.source === 'קהילה' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-emerald-900/30 text-emerald-400 border-emerald-700'}`}>{entry.source || 'מאגר'}</span>
                                                                </td>
                                                                <td className="p-4 text-xs text-slate-400">{(entry as any).sourceName || (entry as any).contributorName || '-'}</td>
                                                                <td className="p-4 font-bold">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editForm.term}
                                                                            onChange={(e) => setEditForm({ ...editForm, term: e.target.value })}
                                                                            className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600"
                                                                            placeholder="מונח..."
                                                                            dir="auto"
                                                                        />
                                                                    ) : (
                                                                        entry.term || <span className="text-amber-500 text-sm">חסר term</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    {isEditing ? (
                                                                        <select
                                                                            value={editForm.dialect}
                                                                            onChange={(e) => setEditForm({ ...editForm, dialect: e.target.value })}
                                                                            className="w-full p-1 border rounded text-xs dark:bg-slate-800 dark:border-slate-600"
                                                                        >
                                                                            {dialects.map(d => (
                                                                                <option key={d.id} value={d.name}>{d.description || d.name}</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : (
                                                                        <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded text-xs">{entry.translations[0]?.dialect || '-'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editForm.hebrew}
                                                                            onChange={(e) => setEditForm({ ...editForm, hebrew: e.target.value })}
                                                                            className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600"
                                                                            placeholder="תרגום עברי..."
                                                                            dir="rtl"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-lg">{entry.translations[0]?.hebrew || <span className="text-amber-500 text-sm">מחכה לתרגום</span>}</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editForm.latin}
                                                                            onChange={(e) => setEditForm({ ...editForm, latin: e.target.value })}
                                                                            className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600"
                                                                            placeholder="Latin..."
                                                                            dir="ltr"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-xs text-slate-500">{entry.translations[0]?.latin || '-'}</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-4">
                                                                    {isEditing ? (
                                                                        <input
                                                                            type="text"
                                                                            value={editForm.cyrillic}
                                                                            onChange={(e) => setEditForm({ ...editForm, cyrillic: e.target.value })}
                                                                            className="w-full p-1 border rounded dark:bg-slate-800 dark:border-slate-600"
                                                                            placeholder="Кириллица..."
                                                                            dir="ltr"
                                                                        />
                                                                    ) : (
                                                                        <span className="text-xs text-slate-500">{entry.translations[0]?.cyrillic || '-'}</span>
                                                                    )}
                                                                </td>
                                                                {isAdmin && (
                                                                    <td className="p-4">
                                                                        {isEditing ? (
                                                                            <div className="flex gap-1">
                                                                                <button onClick={handleSaveEdit} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors" title="שמור"><Save size={16} /></button>
                                                                                <button onClick={handleCancelEdit} className="p-2 text-slate-500 hover:bg-white/10 rounded transition-colors" title="בטל"><X size={16} /></button>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex gap-1">
                                                                                <button onClick={() => handleStartEdit(entry)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors" title="ערוך"><Pencil size={16} /></button>
                                                                                <button onClick={() => handleDelete(entry.term)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors" title="מחק"><Trash2 size={16} /></button>
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                    {entriesLoading && (<tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="inline animate-spin ml-2" size={18} /> טוען...</td></tr>)}
                                                    {!entriesLoading && filteredActive.length === 0 && (<tr><td colSpan={8} className="p-8 text-center text-slate-400">אין נתונים להצגה</td></tr>)}
                                                </tbody>
                                            </table>
                                        </div>
                                        {/* Pagination */}
                                        <div className="p-3 border-t border-white/10 flex items-center justify-between text-sm text-slate-400">
                                            <span>{totalEntries.toLocaleString()} מילים סה"כ</span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => loadEntries(currentPage - 1, searchFilter)}
                                                    disabled={currentPage <= 1 || entriesLoading}
                                                    className="px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:bg-white/10"
                                                >
                                                    הקודם
                                                </button>
                                                <span className="font-medium">{currentPage} / {totalPages}</span>
                                                <button
                                                    onClick={() => loadEntries(currentPage + 1, searchFilter)}
                                                    disabled={currentPage >= totalPages || entriesLoading}
                                                    className="px-3 py-1 rounded border border-white/10 disabled:opacity-30 hover:bg-white/10"
                                                >
                                                    הבא
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Bulk Mode: Excel Grid */}
                                {viewMode === 'bulk' && isAdmin && (
                                    <div className="flex-1 flex flex-col">
                                        {/* Bulk options */}
                                        <div className="mb-4 flex items-center gap-4 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={bulkNoTranslation}
                                                    onChange={(e) => setBulkNoTranslation(e.target.checked)}
                                                    className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                                />
                                                <span className="font-medium text-slate-300">הוסף ללא תרגום</span>
                                                <span className="text-xs text-slate-500">(המילים יוצגו לקהילה לתרגום)</span>
                                            </label>
                                        </div>

                                        <div className="flex-1 overflow-auto bg-[#0d1424]/60 backdrop-blur-xl border border-slate-300 dark:border-slate-700 shadow-inner rounded-lg relative max-h-[calc(100vh-400px)]">
                                            <table className="w-full border-collapse text-sm">
                                                <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm text-slate-600 dark:text-slate-300">
                                                    <tr>
                                                        <th className="border-b border-r dark:border-slate-700 p-2 min-w-[50px] bg-slate-100 dark:bg-slate-900 w-10 text-center">#</th>
                                                        <th className="border-b border-r dark:border-slate-700 p-2 min-w-[150px] text-right">מונח (Term) *</th>
                                                        {!bulkNoTranslation && (
                                                            <>
                                                                <th className="border-b border-r dark:border-slate-700 p-2 min-w-[150px] text-right">תרגום עברי *</th>
                                                                <th className="border-b border-r dark:border-slate-700 p-2 min-w-[150px] text-right">תעתיק לטיני</th>
                                                                <th className="border-b border-r dark:border-slate-700 p-2 min-w-[120px] text-right">ניב</th>
                                                                <th className="border-b border-r dark:border-slate-700 p-2 min-w-[200px] text-right">הגדרה</th>
                                                                <th className="border-b dark:border-slate-700 p-2 min-w-[100px] text-right">קירילית</th>
                                                            </>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-[#0d1424]/60 backdrop-blur-xl">
                                                    {gridData.map((row, rIdx) => (
                                                        <tr key={rIdx} className="hover:bg-white/5">
                                                            <td className="border-b border-r dark:border-slate-700 bg-white/5 text-center text-xs text-slate-400 select-none">{rIdx + 1}</td>
                                                            {row.slice(0, bulkNoTranslation ? 1 : 6).map((cell, cIdx) => (
                                                                <td key={cIdx} className="border-b border-r dark:border-slate-700 p-0 relative focus-within:ring-2 focus-within:ring-indigo-500 focus-within:z-10">
                                                                    <input type="text" value={cell} onChange={(e) => handleGridChange(rIdx, cIdx, e.target.value)} onPaste={(e) => handleGridPaste(e, rIdx, cIdx)} className="w-full h-full px-2 py-2 bg-transparent border-none outline-none text-slate-200" />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="mt-4 flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/10">
                                            <div className="flex gap-2 items-center">
                                                <button onClick={handleAddRows} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"><Plus size={16} /> הוסף</button>
                                                <input type="number" min="1" value={rowsToAdd} onChange={(e) => setRowsToAdd(parseInt(e.target.value) || 1)} className="w-16 p-2 rounded border border-white/10 bg-[#0d1424]/60 backdrop-blur-xl text-center text-sm" />
                                                <span className="text-sm text-slate-500">שורות</span>
                                                <div className="h-6 w-px bg-slate-300 dark:bg-slate-600 mx-2"></div>
                                                <button onClick={handleClearGrid} className="flex items-center gap-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 px-3 py-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"><Eraser size={16} /> נקה טבלה</button>
                                            </div>
                                            <button onClick={() => { bulkNoTranslation ? handleSaveBulkUntranslated() : handleSaveGrid(); }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-lg shadow-green-600/20 transition-all"><Save size={18} /> שמור למאגר</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Dictionary: Pending Approvals */}
                        {activeSection === 'dict_pending' && (
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
                                        <table className="w-full text-sm text-right">
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
                                                        <td className="p-4 font-bold text-lg">{entry.term}</td>
                                                        <td className="p-4">{entry.translations[0]?.hebrew}</td>
                                                        <td className="p-4"><span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded text-xs">{entry.translations[0]?.dialect || '-'}</span></td>
                                                        <td className="p-4 text-xs text-slate-500">{entry.contributorId ? 'משתמש רשום' : 'אורח'}</td>
                                                        <td className="p-4">
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleApprove(entry.term)} className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors" title="אשר"><CheckCircle size={18} /></button>
                                                                <button onClick={() => handleDelete(entry.term)} className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors" title="דחה"><XCircle size={18} /></button>
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
                                        <table className="w-full text-sm text-right">
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
                                                        <td className="p-4 font-bold text-lg">{s.term}</td>
                                                        <td className="p-4">
                                                            {s.field_name ? (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-xs text-slate-400">שדה: <span className="font-bold text-indigo-600 dark:text-indigo-400">{ADMIN_FIELD_LABELS[s.field_name] || s.field_name}</span></span>
                                                                    <span className="font-medium">
                                                                        {s.field_name === 'russian' ? s.suggested_russian :
                                                                         s.field_name === 'latin' ? s.suggested_latin :
                                                                         s.field_name === 'cyrillic' ? s.suggested_cyrillic :
                                                                         s.suggested_hebrew}
                                                                    </span>
                                                                    {s.reason && <span className="text-xs text-slate-400 italic">{s.reason}</span>}
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="font-medium">{s.suggested_hebrew}</span>
                                                                    {s.suggested_latin && <span className="text-xs text-slate-500">{s.suggested_latin}</span>}
                                                                    {s.suggested_russian && <span className="text-xs text-slate-500">{s.suggested_russian}</span>}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-xs text-slate-500">
                                                            {s.contributor_name || s.user_name || (s.user_id ? 'משתמש רשום' : 'אורח')}
                                                        </td>
                                                        <td className="p-4">
                                                            {s.field_name ? (
                                                                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded text-xs flex items-center gap-1 w-fit">
                                                                    <Pencil size={12} />
                                                                    תיקון שדה
                                                                </span>
                                                            ) : s.translation_id ? (
                                                                <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs flex items-center gap-1 w-fit">
                                                                    <Edit3 size={12} />
                                                                    תיקון
                                                                </span>
                                                            ) : (
                                                                <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded text-xs">
                                                                    חדש
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            {s.audio_url ? (
                                                                <button
                                                                    onClick={() => handlePlayAudio(s.id, s.audio_url!)}
                                                                    className={`p-2 rounded-full transition-all ${playingAudioId === s.id
                                                                            ? 'bg-indigo-500 text-white animate-pulse'
                                                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                                                        }`}
                                                                    title={playingAudioId === s.id ? 'עצור' : 'נגן הקלטה'}
                                                                >
                                                                    {playingAudioId === s.id ? <Pause size={16} /> : <Play size={16} />}
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => handleApproveSuggestion(s.id)}
                                                                    className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded transition-colors"
                                                                    title="אשר"
                                                                >
                                                                    <CheckCircle size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleRejectSuggestion(s.id)}
                                                                    className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded transition-colors"
                                                                    title="דחה"
                                                                >
                                                                    <XCircle size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {suggestions.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-12 text-center text-slate-400">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <CheckCircle size={32} className="opacity-20" />
                                                                <span>אין הצעות תרגום ממתינות</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dictionary: AI Fields Confirmation */}
                        {activeSection === 'dict_ai' && (
                            <div className="flex-1 flex flex-col space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                        <Bot size={24} className="text-amber-500" />
                                        אישור שדות AI ({aiFieldsTotal})
                                    </h2>
                                    {selectedAiEntries.size > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleBulkConfirmAi}
                                            disabled={bulkConfirming}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 text-sm font-medium"
                                        >
                                            {bulkConfirming ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                            אשר {selectedAiEntries.size} נבחרים
                                        </button>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    ערכים אלה מכילים שדות שמולאו אוטומטית על ידי AI. בחר ערכים ואשר כדי לשמור אותם כערכים קהילתיים.
                                </p>

                                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                        <table className="w-full text-sm text-right">
                                            <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-3 w-10">
                                                        <input
                                                            type="checkbox"
                                                            checked={aiFieldEntries.length > 0 && selectedAiEntries.size === aiFieldEntries.length}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedAiEntries(new Set(aiFieldEntries.map((en: any) => en.id)));
                                                                } else {
                                                                    setSelectedAiEntries(new Set());
                                                                }
                                                            }}
                                                            title="בחר הכל"
                                                        />
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
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedAiEntries.has(entry.id)}
                                                                onChange={(e) => {
                                                                    const next = new Set(selectedAiEntries);
                                                                    if (e.target.checked) next.add(entry.id);
                                                                    else next.delete(entry.id);
                                                                    setSelectedAiEntries(next);
                                                                }}
                                                                title={`בחר ${entry.term}`}
                                                            />
                                                        </td>
                                                        <td className="p-3 font-bold text-lg">{entry.term}</td>
                                                        <td className="p-3">{entry.hebrew || '—'}</td>
                                                        <td className="p-3 font-mono text-xs">{entry.latin || '—'}</td>
                                                        <td className="p-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                {entry.ai_fields?.split(', ').map((field: string) => (
                                                                    <span key={field} className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[10px] font-medium">
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

                                    {/* Pagination */}
                                    {aiFieldsTotalPages > 1 && (
                                        <div className="flex items-center justify-between p-3 bg-white/5 border-t border-white/10">
                                            <span className="text-xs text-slate-500">עמוד {aiFieldsPage} מתוך {aiFieldsTotalPages} ({aiFieldsTotal} ערכים)</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => loadAiFields(aiFieldsPage - 1)}
                                                    disabled={aiFieldsPage <= 1}
                                                    className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-600 text-xs disabled:opacity-50"
                                                >הקודם</button>
                                                <button
                                                    type="button"
                                                    onClick={() => loadAiFields(aiFieldsPage + 1)}
                                                    disabled={aiFieldsPage >= aiFieldsTotalPages}
                                                    className="px-3 py-1 rounded bg-slate-200 dark:bg-slate-600 text-xs disabled:opacity-50"
                                                >הבא</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Dictionary: Dialects Management */}
                        {activeSection === 'dict_dialects' && isAdmin && (
                            <div className="flex-1 flex flex-col max-w-4xl">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <MapPin size={24} className="text-rose-500" />
                                    ניהול ניבים
                                </h2>

                                <div className="flex gap-4 mb-6 items-end bg-[#0d1424]/60 backdrop-blur-xl p-4 rounded-lg border border-white/10 shadow-sm">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1 text-slate-300">שם הניב (אנגלית/מזהה)</label>
                                        <input type="text" value={newDialectName} onChange={(e) => setNewDialectName(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="למשל: Baku" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-1 text-slate-300">תיאור (לתצוגה)</label>
                                        <input type="text" value={newDialectDesc} onChange={(e) => setNewDialectDesc(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white" placeholder="למשל: באקו (עיר הבירה)" />
                                    </div>
                                    <button onClick={handleAddDialect} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 h-[42px]">
                                        <Plus size={18} /> הוסף
                                    </button>
                                </div>

                                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                                        <table className="w-full text-sm text-right">
                                            <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-4">מזהה / שם</th>
                                                    <th className="p-4">תיאור תצוגה</th>
                                                    <th className="p-4 w-20">פעולות</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {dialects.map((d) => (
                                                    <tr key={d.id} className="hover:bg-white/5 text-slate-200">
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
                            </div>
                        )}

                        {/* Recipes: Tags Management */}
                        {activeSection === 'recipe_tags' && isAdmin && (
                            <div className="flex-1 flex flex-col w-full">
                                <AdminTagsPanel />
                            </div>
                        )}

                        {/* Family: Suggestions and Requests */}
                        {activeSection === 'family_suggestions' && (
                            <div className="flex-1 flex flex-col w-full">
                                <AdminFamilyPanel />
                            </div>
                        )}

                        {/* General: Users Management */}
                        {activeSection === 'gen_users' && isAdmin && (
                            <div className="flex-1 flex flex-col">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <UsersIcon size={24} className="text-cyan-500" />
                                    ניהול משתמשים
                                </h2>

                                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                                    <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
                                        <table className="w-full text-sm text-right">
                                            <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
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
                                                    <tr key={u.id} className="hover:bg-white/5 text-slate-200">
                                                        <td className="p-4 font-bold flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-500">
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
                                                                className="bg-transparent border border-white/10 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
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
                            </div>
                        )}

                        {/* General: System Logs */}
                        {activeSection === 'gen_logs' && isAdmin && (
                            <div className="flex-1 flex flex-col">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity size={24} className="text-slate-600" />
                                    יומן אירועים
                                </h2>

                                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                                    <div className="overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
                                        <table className="w-full text-sm text-right">
                                            <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-4">תאריך ושעה</th>
                                                    <th className="p-4">סוג פעולה</th>
                                                    <th className="p-4">משתמש מבצע</th>
                                                    <th className="p-4">תיאור</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {logs.map((log) => (
                                                    <tr key={log.id} className="hover:bg-white/5 text-slate-200">
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
                            </div>
                        )}

                        {/* General: Feature Flags */}
                        {activeSection === 'seo_management' && isAdmin && (
                            <div className="flex-1 flex flex-col w-full">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Globe size={24} className="text-green-500" />
                                    ניהול SEO
                                </h2>
                                <SectionInfoBar sectionId="seo_management" />
                                <AdminSEOPanel />
                            </div>
                        )}

                        {activeSection === 'seo_analytics' && isAdmin && (
                            <div className="flex-1 flex flex-col w-full">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Activity size={24} className="text-amber-500" />
                                    Google Analytics
                                </h2>
                                <SectionInfoBar sectionId="seo_analytics" />
                                <AdminAnalyticsPanel />
                            </div>
                        )}

                        {activeSection === 'gen_features' && isAdmin && (
                            <div className="flex-1 flex flex-col max-w-4xl">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <ToggleLeft size={24} className="text-purple-500" />
                                    ניהול פיצ'רים
                                </h2>

                                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 p-6">
                                    <FeatureFlagsPanel />
                                </div>
                            </div>
                        )}

                        {/* General: API Settings */}
                        {activeSection === 'gen_settings' && isAdmin && (
                            <div className="flex-1 flex flex-col max-w-4xl">
                                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                                    <KeyRound size={24} className="text-purple-500" />
                                    מפתחות API
                                </h2>

                                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 p-6">
                                    <ApiSettingsPanel />
                                </div>
                            </div>
                        )}

                        {/* Marketplace: Vendors Management */}
                        {activeSection === 'market_vendors' && isAdmin && (
                            <AdminMarketplacePanel />
                        )}

                    </div>
                </main>
            </div>

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
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            הוסף מילה שהקהילה יוכל לתרגם. המילה תופיע בוידג'ט "מחכות לתרגום".
                        </p>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-300">מילה בעברית *</label>
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
                                <label className="block text-sm font-medium mb-1 text-slate-300">מדריך הגייה (אופציונלי)</label>
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
                                    className="flex-1 py-2 bg-slate-100 hover:bg-white/10 dark:hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
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
