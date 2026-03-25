'use client';

import React, { useState, useEffect } from 'react';
import { Activity, UserCheck } from 'lucide-react';
import { getSystemLogs } from '../../services/storageService';
import { SystemEvent } from '../../types';

export default function AdminLogsPage() {
    const [logs, setLogs] = useState<SystemEvent[]>([]);

    useEffect(() => {
        getSystemLogs().then(data => setLogs(data || []));
    }, []);

    return (
        <div className="flex-1 flex flex-col">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Activity size={24} className="text-slate-400" />
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
                                    <td className="p-4 text-slate-400 font-mono text-xs">
                                        {new Date(log.timestamp).toLocaleString('he-IL')}
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-bold ${
                                            log.type?.includes('DELETED') || log.type?.includes('REJECTED') ? 'bg-red-50 text-red-600 border-red-200' :
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
                            {logs.length === 0 && (
                                <tr><td colSpan={4} className="p-12 text-center text-slate-400">אין רישומים ביומן</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
