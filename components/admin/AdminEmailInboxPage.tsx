'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Inbox, Archive, ArrowRight } from 'lucide-react';

interface InboundEmail {
  id: number;
  from_address: string;
  from_name: string | null;
  to_address: string;
  subject: string;
  html_body?: string;
  text_body?: string;
  is_read: boolean;
  spam_score: number | null;
  created_at: string;
}

export default function AdminEmailInboxPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<InboundEmail | null>(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/inbound-emails?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails);
        setTotal(data.total);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  const viewEmail = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/inbound-emails/${id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setViewing(data.email);
        setEmails(prev => prev.map(e => e.id === id ? { ...e, is_read: true } : e));
      }
    } catch (err) { console.error(err); }
  };

  const archiveEmail = async (id: number) => {
    await fetch(`/api/admin/inbound-emails/${id}`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: true }),
    });
    setEmails(prev => prev.filter(e => e.id !== id));
    if (viewing?.id === id) setViewing(null);
  };

  if (viewing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => setViewing(null)}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowRight size={14} /> חזרה לתיבת הדואר
          </button>
          <button onClick={() => archiveEmail(viewing.id)}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-red-400 transition-colors">
            <Archive size={14} /> ארכיון
          </button>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-white/10 p-6 space-y-4">
          <h3 className="text-white font-bold text-lg">{viewing.subject}</h3>
          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <span>מאת: {viewing.from_name ? `${viewing.from_name} <${viewing.from_address}>` : viewing.from_address}</span>
            <span>אל: {viewing.to_address}</span>
            <span>{new Date(viewing.created_at).toLocaleString('he-IL')}</span>
            {viewing.spam_score != null && <span>ציון ספאם: {viewing.spam_score}</span>}
          </div>
          <div className="border-t border-white/10 pt-4">
            {viewing.html_body ? (
              <iframe
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0;padding:16px;font-family:Arial,sans-serif;">${viewing.html_body}</body></html>`}
                title="Email content"
                className="w-full min-h-[400px] bg-white rounded"
                sandbox="allow-same-origin allow-popups"
              />
            ) : (
              <pre className="text-slate-300 whitespace-pre-wrap text-sm">{viewing.text_body || '(ריק)'}</pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Inbox size={20} className="text-amber-400" />
          דואר נכנס
          <span className="text-sm font-normal text-slate-400">({total})</span>
        </h2>
      </div>

      <div className="relative w-64">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש..."
          className="bg-slate-800 text-white text-sm pe-3 ps-9 py-2 rounded-lg border border-white/10 w-full" />
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-amber-400" size={24} /></div>
      ) : emails.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Inbox size={48} className="mx-auto mb-4 opacity-30" />
          <p>אין מיילים נכנסים</p>
          <p className="text-xs mt-2">מיילים נכנסים יופיעו כאן כשיוגדר webhook או סנכרון</p>
        </div>
      ) : (
        <div className="space-y-1">
          {emails.map(email => (
            <div key={email.id} onClick={() => viewEmail(email.id)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-white/5 border ${!email.is_read ? 'bg-slate-800/50 border-amber-500/20' : 'border-transparent'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {!email.is_read && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                  <span className={`text-sm truncate ${!email.is_read ? 'text-white font-bold' : 'text-slate-300'}`}>
                    {email.from_name || email.from_address}
                  </span>
                  <span className="text-xs text-slate-500 shrink-0 ms-auto">{new Date(email.created_at).toLocaleString('he-IL')}</span>
                </div>
                <p className={`text-sm truncate ${!email.is_read ? 'text-slate-200' : 'text-slate-500'}`}>{email.subject}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); archiveEmail(email.id); }}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors" title="ארכיון">
                <Archive size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
