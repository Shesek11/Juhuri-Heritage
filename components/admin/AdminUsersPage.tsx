'use client';

import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, KeyRound, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllUsers, updateUserRole, deleteUser, updateUser } from '../../services/authService';
import { User, UserRole } from '../../types';

export default function AdminUsersPage() {
    const { user } = useAuth();
    const [usersList, setUsersList] = useState<User[]>([]);

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
        }
    };

    const handleResetPassword = (userId: string) => {
        const newPassword = prompt("הזן סיסמה חדשה למשתמש זה:");
        if (newPassword && newPassword.trim()) {
            updateUser(userId, { password: newPassword });
            alert("הסיסמה שונתה בהצלחה.");
        }
    };

    return (
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
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-400">
                                            <UsersIcon size={14} />
                                        </div>
                                        {u.name} {u.id === user?.id && <span className="text-xs text-indigo-500">(אני)</span>}
                                    </td>
                                    <td className="p-4 text-slate-400">{u.email}</td>
                                    <td className="p-4 text-slate-400">{new Date(u.joinedAt).toLocaleDateString('he-IL')}</td>
                                    <td className="p-4">
                                        <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs border border-green-200">
                                            {u.contributionsCount || 0}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                            className="bg-transparent border border-white/10 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500"
                                            disabled={u.id === user?.id}>
                                            <option value="user">משתמש</option>
                                            <option value="approver">מאשר תוכן</option>
                                            <option value="admin">מנהל מערכת</option>
                                        </select>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            <button onClick={() => handleResetPassword(u.id)} className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors" title="אפס סיסמה">
                                                <KeyRound size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteUser(u.id)} disabled={u.id === user?.id}
                                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="מחק משתמש">
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
    );
}
