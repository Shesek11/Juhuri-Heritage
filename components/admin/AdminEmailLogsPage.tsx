'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ArrowUpRight, ArrowDownLeft, Clock, RefreshCw } from 'lucide-react';

interface EmailLog {
  id: number;
  direction: 'outgoing' | 'incoming';
  from_address: string;
  to_address: string;
  subject: string;
  template_slug: string | null;
  status: string;
  emailit_id: string | null;
  error_message: string | null;
  created_at: string;
}

export default function AdminEmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [direction, setDirection] = useState('all');
  const [search, setSearch] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (direction !== 'all') params.set('direction', direction);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/email-logs?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, direction, search]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/email-logs', { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.synced > 0) loadLogs();
      }
    } catch {} finally { setSyncing(false); }
  };

  const statusColor = (status: string) => {
    if (status === 'accepted' || status === 'delivered') return 'bg-green-500/20 text-green-400';
    if (status === 'received') return 'bg-blue-500/20 text-blue-400';
    return 'bg-red-500/20 text-red-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock size={20} className="text-amber-400" />
          לוג שליחות
          <span className="text-sm font-normal text-slate-400">({total})</span>
        </h2>
        <button onClick={handleSync} disabled={syncing}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          סנכרון מ-EmailIt
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="חיפוש לפי כתובת/נושא..."
            className="bg-slate-800 text-white text-sm pe-3 ps-9 py-2 rounded-lg border border-white/10 w-64" />
        </div>
        <select value={direction} onChange={e => { setDirection(e.target.value); setPage(1); }}
          className="bg-slate-800 text-white text-sm px-3 py-2 rounded-lg border border-white/10">
          <option value="all">הכל</option>
          <option value="outgoing">יוצא</option>
          <option value="incoming">נכנס</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-400" size={24} /></div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">אין לוגים</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-800/80 text-slate-400 text-xs">
              <tr>
                <th className="p-3">כיוון</th>
                <th className="p-3">מאת</th>
                <th className="p-3">אל</th>
                <th className="p-3">נושא</th>
                <th className="p-3">תבנית</th>
                <th className="p-3">סטטוס</th>
                <th className="p-3">תאריך</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-white/5">
                  <td className="p-3">
                    {log.direction === 'outgoing'
                      ? <ArrowUpRight size={14} className="text-blue-400" />
                      : <ArrowDownLeft size={14} className="text-green-400" />}
                  </td>
                  <td className="p-3 text-slate-300 truncate max-w-[150px]">{log.from_address}</td>
                  <td className="p-3 text-slate-300 truncate max-w-[150px]">{log.to_address}</td>
                  <td className="p-3 text-white truncate max-w-[200px]">{log.subject}</td>
                  <td className="p-3 text-slate-500 font-mono text-xs">{log.template_slug || '-'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(log.status)}`}>{log.status}</span>
                  </td>
                  <td className="p-3 text-slate-500 text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString('he-IL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 text-sm bg-slate-800 text-slate-300 rounded disabled:opacity-30">הקודם</button>
          <span className="text-xs text-slate-500">עמוד {page} מתוך {Math.ceil(total / 50)}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}
            className="px-3 py-1 text-sm bg-slate-800 text-slate-300 rounded disabled:opacity-30">הבא</button>
        </div>
      )}
    </div>
  );
}
