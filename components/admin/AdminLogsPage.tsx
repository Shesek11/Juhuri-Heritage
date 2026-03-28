'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, UserCheck, Filter, Search, Calendar, ChevronDown, ChevronUp, Globe, RefreshCw, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { getSystemLogs } from '../../services/storageService';
import { SystemEvent } from '../../types';

// --- Event type config ---

const eventTypeLabels: Record<string, string> = {
    ENTRY_ADDED: 'ערך נוסף',
    ENTRY_APPROVED: 'ערך אושר',
    ENTRY_DELETED: 'ערך נמחק',
    ENTRY_REJECTED: 'ערך נדחה',
    ENTRY_MERGED: 'מיזוג ערכים',
    ENTRY_UPDATED: 'ערך עודכן',
    ENTRY_SUBMITTED: 'ערך הוגש לבדיקה',
    USER_LOGIN: 'התחברות',
    USER_LOGIN_OAUTH: 'התחברות (Google)',
    USER_REGISTER: 'הרשמה',
    USER_REGISTER_OAUTH: 'הרשמה (Google)',
    USER_ROLE_CHANGE: 'שינוי תפקיד',
    USER_DELETED: 'משתמש נמחק',
    USER_PASSWORD_RESET: 'איפוס סיסמה',
    DIALECT_ADDED: 'ניב נוסף',
    FEATURE_FLAG_CHANGED: 'שינוי פיצ\'ר',
    SETTING_CHANGED: 'שינוי הגדרה',
    SEO_SETTINGS_CHANGED: 'SEO הגדרות',
    SEO_ROBOTS_CHANGED: 'robots.txt',
    SEO_LLMS_CHANGED: 'llms.txt',
    SEO_META_CHANGED: 'Meta ברירות',
    SEO_REDIRECTS_CHANGED: 'הפניות',
    APPROVAL: 'אישור',
    EMAIL_TEMPLATE_CHANGED: 'תבנית מייל',
    RECIPE_ADDED: 'מתכון נוסף',
    RECIPE_APPROVED: 'מתכון אושר',
    RECIPE_DELETED: 'מתכון נמחק',
    RECIPE_SUBMITTED: 'מתכון הוגש לבדיקה',
    CONTACT_FORM: 'טופס יצירת קשר',
    FEEDBACK_SENT: 'משוב נשלח',
    FEEDBACK_STATUS_CHANGED: 'סטטוס משוב שונה',
    ENTRIES_BATCH_ADDED: 'הוספה מרובה',
    TRANSLATION_UPDATED: 'תרגום עודכן',
    AI_FIELDS_CONFIRMED: 'אישור שדות AI',
    SUGGESTION_APPROVED: 'הצעה אושרה',
    SUGGESTION_REJECTED: 'הצעה נדחתה',
    EXAMPLE_APPROVED: 'דוגמה אושרה',
    EXAMPLE_REJECTED: 'דוגמה נדחתה',
    RECIPE_UPDATED: 'מתכון עודכן',
    SEO_ASSET_CHANGED: 'קובץ SEO',
};

const eventCategories: Record<string, { label: string; types: string[] }> = {
    user: {
        label: 'משתמשים',
        types: ['USER_LOGIN', 'USER_LOGIN_OAUTH', 'USER_REGISTER', 'USER_REGISTER_OAUTH', 'USER_ROLE_CHANGE', 'USER_DELETED', 'USER_PASSWORD_RESET'],
    },
    content: {
        label: 'תוכן',
        types: ['ENTRY_ADDED', 'ENTRY_APPROVED', 'ENTRY_DELETED', 'ENTRY_REJECTED', 'ENTRY_MERGED', 'ENTRY_UPDATED', 'ENTRY_SUBMITTED', 'ENTRIES_BATCH_ADDED', 'TRANSLATION_UPDATED', 'AI_FIELDS_CONFIRMED', 'SUGGESTION_APPROVED', 'SUGGESTION_REJECTED', 'EXAMPLE_APPROVED', 'EXAMPLE_REJECTED', 'DIALECT_ADDED'],
    },
    recipes: {
        label: 'מתכונים',
        types: ['RECIPE_ADDED', 'RECIPE_APPROVED', 'RECIPE_DELETED', 'RECIPE_SUBMITTED', 'RECIPE_UPDATED', 'APPROVAL'],
    },
    settings: {
        label: 'הגדרות',
        types: ['FEATURE_FLAG_CHANGED', 'SETTING_CHANGED', 'SEO_SETTINGS_CHANGED', 'SEO_ROBOTS_CHANGED', 'SEO_LLMS_CHANGED', 'SEO_META_CHANGED', 'SEO_REDIRECTS_CHANGED', 'EMAIL_TEMPLATE_CHANGED'],
    },
    other: {
        label: 'אחר',
        types: ['CONTACT_FORM', 'FEEDBACK_SENT', 'FEEDBACK_STATUS_CHANGED'],
    },
};

const eventTypeColors: Record<string, string> = {
    ENTRY_ADDED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    ENTRY_APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
    ENTRY_DELETED: 'bg-red-500/20 text-red-400 border-red-500/30',
    ENTRY_REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    ENTRY_MERGED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    ENTRY_UPDATED: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    ENTRY_SUBMITTED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    USER_LOGIN: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    USER_LOGIN_OAUTH: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    USER_REGISTER: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    USER_REGISTER_OAUTH: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    USER_ROLE_CHANGE: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    USER_DELETED: 'bg-red-500/20 text-red-400 border-red-500/30',
    USER_PASSWORD_RESET: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    DIALECT_ADDED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    FEATURE_FLAG_CHANGED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    SETTING_CHANGED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    SEO_SETTINGS_CHANGED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    SEO_ROBOTS_CHANGED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    SEO_LLMS_CHANGED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    SEO_META_CHANGED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    SEO_REDIRECTS_CHANGED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    APPROVAL: 'bg-green-500/20 text-green-400 border-green-500/30',
    EMAIL_TEMPLATE_CHANGED: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    RECIPE_ADDED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    RECIPE_APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
    RECIPE_DELETED: 'bg-red-500/20 text-red-400 border-red-500/30',
    RECIPE_SUBMITTED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    CONTACT_FORM: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    FEEDBACK_SENT: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    FEEDBACK_STATUS_CHANGED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    ENTRIES_BATCH_ADDED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    TRANSLATION_UPDATED: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    AI_FIELDS_CONFIRMED: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    SUGGESTION_APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
    SUGGESTION_REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    EXAMPLE_APPROVED: 'bg-green-500/20 text-green-400 border-green-500/30',
    EXAMPLE_REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
    RECIPE_UPDATED: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    SEO_ASSET_CHANGED: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

// --- Helpers ---

function formatDateTime(dateStr: string | number | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function timeAgo(dateStr: string | number | null): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'עכשיו';
    if (minutes < 60) return `לפני ${minutes} דק׳`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `לפני ${hours} שע׳`;
    const days = Math.floor(hours / 24);
    return `לפני ${days} ימים`;
}

function MetadataDisplay({ metadata }: { metadata: Record<string, any> | null }) {
    if (!metadata || Object.keys(metadata).length === 0) return null;
    return (
        <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(metadata).map(([key, value]) => (
                <span key={key} className="text-[10px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded">
                    {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
            ))}
        </div>
    );
}

// --- Searchable Combobox ---

interface ComboboxUser { id: string; name: string; email: string }

function UserCombobox({ users, value, onChange }: {
    users: ComboboxUser[];
    value: string;
    onChange: (userId: string, userName: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedUser = users.find(u => u.id === value);

    const filtered = search
        ? users.filter(u =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()))
        : users;

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            {value && selectedUser ? (
                <div className="flex items-center gap-1.5 bg-indigo-500/15 border border-indigo-500/30 rounded px-2 py-1.5 text-sm text-indigo-300">
                    <UserCheck size={13} />
                    <span className="font-medium">{selectedUser.name}</span>
                    <button type="button" onClick={() => { onChange('', ''); setSearch(''); }}
                        title="נקה סינון משתמש"
                        className="ms-1 p-0.5 hover:bg-white/10 rounded">
                        <X size={12} />
                    </button>
                </div>
            ) : (
                <div className="flex items-center gap-1.5">
                    <UserCheck size={14} className="text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder="חפש משתמש..."
                        className="bg-transparent border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 w-40"
                    />
                </div>
            )}

            {open && !value && (
                <div className="absolute top-full mt-1 right-0 w-64 max-h-48 overflow-y-auto bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50">
                    {filtered.length === 0 ? (
                        <div className="p-3 text-xs text-slate-500 text-center">לא נמצאו משתמשים</div>
                    ) : (
                        filtered.map(u => (
                            <button
                                key={u.id}
                                type="button"
                                onClick={() => { onChange(u.id, u.name); setOpen(false); setSearch(''); }}
                                className="w-full text-start px-3 py-2 hover:bg-white/5 transition-colors flex items-center gap-2"
                            >
                                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                    {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm text-slate-200 truncate">{u.name}</div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate">{u.email}</div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// --- Main Component ---

export default function AdminLogsPage() {
    const searchParams = useSearchParams();
    const [logs, setLogs] = useState<SystemEvent[]>([]);
    const [allUsers, setAllUsers] = useState<ComboboxUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    // Filters — init from URL params
    const [filterType, setFilterType] = useState<string>(searchParams.get('type') || '');
    const [filterCategory, setFilterCategory] = useState<string>('');
    const [filterUser, setFilterUser] = useState<string>(searchParams.get('userId') || '');
    const [filterUserName, setFilterUserName] = useState<string>(searchParams.get('userName') || '');
    const [searchText, setSearchText] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const params: Record<string, string | number> = { limit: 500 };
        if (filterType) params.eventType = filterType;
        if (filterUser) params.userId = filterUser;
        if (dateFrom) params.from = dateFrom;
        if (dateTo) params.to = dateTo;
        if (searchText) params.search = searchText;

        const result = await getSystemLogs(params as any);
        setLogs(result.logs);
        if (result.users.length > 0) setAllUsers(result.users);
        setLoading(false);
    }, [filterType, filterUser, dateFrom, dateTo, searchText]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Apply category filter client-side
    const filtered = logs.filter(log => {
        if (filterCategory) {
            const cat = eventCategories[filterCategory];
            if (cat && !cat.types.includes(log.type)) return false;
        }
        return true;
    });

    const clearFilters = () => {
        setFilterType('');
        setFilterCategory('');
        setFilterUser('');
        setFilterUserName('');
        setSearchText('');
        setDateFrom('');
        setDateTo('');
    };

    const hasFilters = filterType || filterCategory || filterUser || searchText || dateFrom || dateTo;

    return (
        <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Activity size={24} className="text-slate-400" />
                    יומן אירועים
                </h2>
                <button type="button" onClick={fetchLogs} className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors" title="רענן">
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Filters */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg border border-white/10 p-3 relative z-20">
                <div className="flex gap-3 items-center flex-wrap">
                    {/* Category filter */}
                    <div className="flex items-center gap-1.5">
                        <Filter size={14} className="text-slate-400" />
                        <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setFilterType(''); }}
                            title="סנן לפי קטגוריה"
                            className="bg-transparent border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500">
                            <option value="" className="bg-slate-800">כל הקטגוריות</option>
                            {Object.entries(eventCategories).map(([key, cat]) => (
                                <option key={key} value={key} className="bg-slate-800">{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Type filter */}
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}
                        title="סנן לפי סוג פעולה"
                        className="bg-transparent border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500">
                        <option value="" className="bg-slate-800">כל הפעולות</option>
                        {(filterCategory ? eventCategories[filterCategory]?.types || [] : Object.keys(eventTypeLabels)).map(t => (
                            <option key={t} value={t} className="bg-slate-800">{eventTypeLabels[t] || t}</option>
                        ))}
                    </select>

                    {/* User combobox */}
                    <UserCombobox
                        users={allUsers}
                        value={filterUser}
                        onChange={(id, name) => { setFilterUser(id); setFilterUserName(name); }}
                    />

                    {/* Date range */}
                    <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                            title="מתאריך"
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500" />
                        <span className="text-slate-500 text-xs">עד</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                            title="עד תאריך"
                            className="bg-transparent border border-white/10 rounded px-2 py-1 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>

                    {/* Search */}
                    <div className="flex items-center gap-1.5">
                        <Search size={14} className="text-slate-400" />
                        <input type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
                            placeholder="חיפוש בתיאור..."
                            onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                            className="bg-transparent border border-white/10 rounded px-2 py-1.5 text-sm text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500 w-40" />
                    </div>

                    {hasFilters && (
                        <button type="button" onClick={clearFilters} className="text-xs text-red-400 hover:text-red-300 px-2 py-1">
                            נקה הכל
                        </button>
                    )}

                    <span className="text-xs text-slate-500 ms-auto">{filtered.length} רשומות</span>
                </div>
            </div>

            {/* Logs table */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-380px)] overflow-y-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-3 w-44">תאריך ושעה</th>
                                <th className="p-3 w-32">סוג פעולה</th>
                                <th className="p-3 w-40">משתמש מבצע</th>
                                <th className="p-3">תיאור</th>
                                <th className="p-3 w-28">IP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {filtered.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr className="hover:bg-white/5 text-slate-200 cursor-pointer transition-colors"
                                        onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}>
                                        <td className="p-3 text-xs whitespace-nowrap">
                                            <div className="text-slate-300 font-mono">{formatDateTime(log.timestamp)}</div>
                                            <div className="text-slate-500 text-[10px]">{timeAgo(log.timestamp)}</div>
                                        </td>
                                        <td className="p-3">
                                            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold whitespace-nowrap ${
                                                eventTypeColors[log.type] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                                            }`}>
                                                {eventTypeLabels[log.type] || log.type || '—'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <UserCheck size={14} className="text-slate-400 flex-shrink-0" />
                                                <span className="font-bold text-sm">{log.userName || 'מערכת'}</span>
                                            </div>
                                            {log.userEmail && (
                                                <div className="text-[10px] text-slate-500 font-mono ms-6">{log.userEmail}</div>
                                            )}
                                        </td>
                                        <td className="p-3 text-slate-300 text-xs">
                                            <div>{log.description}</div>
                                            {log.metadata && expandedRow !== log.id && (
                                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                    <ChevronDown size={10} />
                                                    פרטים נוספים
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-3 text-xs font-mono text-slate-500">
                                            {log.ipAddress ? (
                                                <div className="flex items-center gap-1">
                                                    <Globe size={10} />
                                                    {log.ipAddress}
                                                </div>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                    {expandedRow === log.id && log.metadata && (
                                        <tr className="bg-slate-800/30">
                                            <td colSpan={5} className="p-3 ps-12">
                                                <div className="text-xs text-slate-400">
                                                    <div className="flex items-center gap-1 mb-2 text-slate-500">
                                                        <ChevronUp size={12} />
                                                        מידע נוסף
                                                    </div>
                                                    <MetadataDisplay metadata={log.metadata} />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                            {filtered.length === 0 && !loading && (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">
                                    {hasFilters ? 'אין רשומות התואמות לסינון' : 'אין רישומים ביומן'}
                                </td></tr>
                            )}
                            {loading && (
                                <tr><td colSpan={5} className="p-12 text-center text-slate-400">טוען...</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
