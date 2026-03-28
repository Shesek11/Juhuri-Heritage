'use client';

import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, KeyRound, Trash2, Activity, Clock, Shield, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsers, updateUserRole, deleteUser, updateUser } from '../../services/authService';
import { User, UserRole } from '../../types';

const roleLabels: Record<string, string> = {
    admin: 'מנהל מערכת',
    approver: 'מאשר תוכן',
    user: 'משתמש',
};

const roleColors: Record<string, string> = {
    admin: 'bg-red-500/20 text-red-400 border-red-500/30',
    approver: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    user: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

function formatDate(dateStr: string | number | null): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatDateTime(dateStr: string | number | null): string {
    if (!dateStr) return 'טרם התחבר/ה';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'טרם התחבר/ה';
    return d.toLocaleString('he-IL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
    if (days < 30) return `לפני ${days} ימים`;
    const months = Math.floor(days / 30);
    return `לפני ${months} חודשים`;
}

export default function AdminUsersPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [usersList, setUsersList] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        getAllUsers().then(users => setUsersList(users || []));
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!user) return;
        await updateUserRole(userId, newRole as UserRole, user);
        const users = await getAllUsers();
        setUsersList(users || []);
    };

    const handleDeleteUser = async (userId: string) => {
        if (!user) return;
        if (userId === user.id) { alert("אינך יכול למחוק את עצמך."); return; }
        if (confirm("האם למחוק משתמש זה? פעולה זו היא בלתי הפיכה.")) {
            await deleteUser(userId, user);
            const users = await getAllUsers();
            setUsersList(users || []);
            if (selectedUser?.id === userId) setSelectedUser(null);
        }
    };

    const handleResetPassword = (userId: string) => {
        const newPassword = prompt("הזן סיסמה חדשה למשתמש זה:");
        if (newPassword && newPassword.trim()) {
            updateUser(userId, { password: newPassword });
            alert("הסיסמה שונתה בהצלחה.");
        }
    };

    const admins = usersList.filter(u => u.role === 'admin');
    const approvers = usersList.filter(u => u.role === 'approver');
    const regularUsers = usersList.filter(u => u.role === 'user');

    return (
        <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <UsersIcon size={24} className="text-cyan-500" />
                ניהול משתמשים
            </h2>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg border border-white/10 p-4 text-center">
                    <div className="text-2xl font-bold text-white">{usersList.length}</div>
                    <div className="text-xs text-slate-400 mt-1">סה״כ משתמשים</div>
                </div>
                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg border border-white/10 p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">{admins.length + approvers.length}</div>
                    <div className="text-xs text-slate-400 mt-1">מנהלים ומאשרים</div>
                </div>
                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg border border-white/10 p-4 text-center">
                    <div className="text-2xl font-bold text-green-400">{usersList.filter(u => {
                        const last = (u as any).lastLoginDate;
                        if (!last) return false;
                        return (Date.now() - new Date(last).getTime()) < 7 * 24 * 60 * 60 * 1000;
                    }).length}</div>
                    <div className="text-xs text-slate-400 mt-1">פעילים השבוע</div>
                </div>
            </div>

            {/* Users table */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow border border-white/10 overflow-hidden">
                <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
                    <table className="w-full text-sm text-start">
                        <thead className="bg-slate-800 text-slate-300 font-medium sticky top-0 z-10">
                            <tr>
                                <th className="p-3">שם משתמש</th>
                                <th className="p-3">אימייל</th>
                                <th className="p-3">הרשמה</th>
                                <th className="p-3">התחברות אחרונה</th>
                                <th className="p-3">תרומות</th>
                                <th className="p-3">תפקיד</th>
                                <th className="p-3 w-28">פעולות</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {usersList.map((u) => (
                                <tr key={u.id} className={`hover:bg-white/5 text-slate-200 cursor-pointer transition-colors ${selectedUser?.id === u.id ? 'bg-white/5' : ''}`}
                                    onClick={() => setSelectedUser(selectedUser?.id === u.id ? null : u)}>
                                    <td className="p-3 font-bold">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                                u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                                                u.role === 'approver' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-slate-500/20 text-slate-400'
                                            }`}>
                                                {u.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                {u.name}
                                                {u.id === user?.id && <span className="text-xs text-indigo-400 ms-1">(אני)</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-400 text-xs font-mono">{u.email}</td>
                                    <td className="p-3 text-slate-400 text-xs">{formatDate(u.joinedAt as any)}</td>
                                    <td className="p-3 text-xs">
                                        <span className={(u as any).lastLoginDate ? 'text-green-400' : 'text-slate-500'}>
                                            {timeAgo((u as any).lastLoginDate) || 'טרם התחבר/ה'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs border border-green-500/30">
                                            {u.contributionsCount || 0}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <select value={u.role} onChange={(e) => { e.stopPropagation(); handleRoleChange(u.id, e.target.value); }}
                                            onClick={(e) => e.stopPropagation()}
                                            title="שנה תפקיד"
                                            className={`text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent ${roleColors[u.role] || ''}`}
                                            disabled={u.id === user?.id}>
                                            <option value="user" className="bg-slate-800">משתמש</option>
                                            <option value="approver" className="bg-slate-800">מאשר תוכן</option>
                                            <option value="admin" className="bg-slate-800">מנהל מערכת</option>
                                        </select>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                            <button type="button" onClick={() => router.push(`/admin/logs?userId=${u.id}&userName=${encodeURIComponent(u.name)}`)}
                                                className="p-1.5 text-cyan-400 hover:bg-cyan-500/20 rounded transition-colors" title="צפה בלוגים">
                                                <FileText size={14} />
                                            </button>
                                            <button type="button" onClick={() => handleResetPassword(u.id)} className="p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded transition-colors" title="אפס סיסמה">
                                                <KeyRound size={14} />
                                            </button>
                                            <button type="button" onClick={() => handleDeleteUser(u.id)} disabled={u.id === user?.id}
                                                className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="מחק משתמש">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Selected user detail panel */}
            {selectedUser && (
                <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg border border-white/10 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Shield size={18} className="text-cyan-500" />
                            {selectedUser.name}
                        </h3>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => router.push(`/admin/logs?userId=${selectedUser.id}&userName=${encodeURIComponent(selectedUser.name)}`)}
                                className="text-cyan-400 hover:text-cyan-300 text-xs flex items-center gap-1">
                                <FileText size={12} /> צפה בלוגים
                            </button>
                            <button type="button" onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white text-xs">סגור</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                            <div className="text-slate-500 text-xs mb-1">אימייל</div>
                            <div className="text-slate-200 font-mono text-xs">{selectedUser.email}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">תפקיד</div>
                            <span className={`text-xs px-2 py-0.5 rounded border ${roleColors[selectedUser.role]}`}>
                                {roleLabels[selectedUser.role]}
                            </span>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">הרשמה</div>
                            <div className="text-slate-200 text-xs">{formatDateTime(selectedUser.joinedAt as any)}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">התחברות אחרונה</div>
                            <div className="text-slate-200 text-xs">{formatDateTime((selectedUser as any).lastLoginDate)}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">תרומות</div>
                            <div className="text-slate-200 text-xs">{selectedUser.contributionsCount || 0}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">XP</div>
                            <div className="text-slate-200 text-xs">{selectedUser.xp || 0}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">רמה</div>
                            <div className="text-slate-200 text-xs">{selectedUser.level || 1}</div>
                        </div>
                        <div>
                            <div className="text-slate-500 text-xs mb-1">רצף ימים</div>
                            <div className="text-slate-200 text-xs">{selectedUser.currentStreak || 0}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
