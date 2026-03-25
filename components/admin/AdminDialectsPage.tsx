'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDialects, addDialect, deleteDialect } from '../../services/storageService';
import { DialectItem } from '../../types';

export default function AdminDialectsPage() {
    const { user } = useAuth();
    const [dialects, setDialects] = useState<DialectItem[]>([]);
    const [newDialectName, setNewDialectName] = useState('');
    const [newDialectDesc, setNewDialectDesc] = useState('');

    const loadDialects = async () => {
        const data = await getDialects();
        setDialects(data || []);
    };

    useEffect(() => { loadDialects(); }, []);

    const handleAddDialect = (e: React.FormEvent) => {
        e.preventDefault();
        if (newDialectName.trim() && user) {
            addDialect(newDialectName, newDialectDesc, user);
            setNewDialectName('');
            setNewDialectDesc('');
            loadDialects();
        }
    };

    const handleDeleteDialect = (id: string) => {
        if (confirm('למחוק ניב זה?')) {
            deleteDialect(id);
            loadDialects();
        }
    };

    return (
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
    );
}
