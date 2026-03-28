'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Zap, Check, AlertTriangle, ExternalLink, ToggleLeft, ToggleRight, RotateCcw } from 'lucide-react';

interface Template {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
}

interface Trigger {
  slug: string;
  name: string;
  description: string;
  recipient: string;
  trigger: string;
  wired: boolean;
  hasTemplate: boolean;
  isActive: boolean;
  templateName: string | null;
  templateSlug: string | null;
  templateId: number | null;
  isCustomMapping: boolean;
  defaultTemplateSlug: string;
  lastUpdated: string | null;
}

const recipientLabels: Record<string, string> = {
  admin: 'אדמין',
  user: 'המשתמש',
  subscribers: 'מנויים',
};

export default function AdminEmailTriggersPage() {
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email-templates/triggers', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTriggers(data.triggers);
        setTemplates(data.templates || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (t: Trigger) => {
    if (!t.templateId) return;
    setSaving(t.slug);
    try {
      await fetch(`/api/admin/email-templates/${t.templateId}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !t.isActive }),
      });
      await load();
    } catch {} finally { setSaving(null); }
  };

  const changeMapping = async (eventSlug: string, templateId: number | null) => {
    setSaving(eventSlug);
    try {
      await fetch('/api/admin/email-templates/triggers', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventSlug, templateId }),
      });
      await load();
    } catch {} finally { setSaving(null); }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-amber-400" size={32} /></div>;
  }

  const activeCount = triggers.filter(t => t.isActive).length;
  const wiredCount = triggers.filter(t => t.wired).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap size={20} className="text-amber-400" />
          טריגרים — אירועי מייל
        </h2>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{activeCount} פעילים מתוך {triggers.length}</span>
          <span>•</span>
          <span>{wiredCount} מחוברים בקוד</span>
        </div>
      </div>

      <p className="text-sm text-slate-400">
        כל אירוע מחפש תבנית מחוברת. אם התבנית פעילה — המייל יישלח. אפשר לחבר תבנית אחרת מהרשימה.
      </p>

      <div className="space-y-2">
        {triggers.map(t => (
          <div key={t.slug} className={`bg-slate-800/50 rounded-xl border p-4 transition-colors ${t.isActive ? 'border-green-500/30' : 'border-white/10'}`}>
            <div className="flex items-start gap-4">
              {/* Status dot */}
              <div className="mt-1.5">
                {t.isActive ? (
                  <div className="w-3 h-3 rounded-full bg-green-400 shadow-lg shadow-green-400/30" />
                ) : t.hasTemplate ? (
                  <div className="w-3 h-3 rounded-full bg-yellow-400/50" />
                ) : (
                  <div className="w-3 h-3 rounded-full bg-slate-600" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium">{t.name}</span>
                  <code className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-mono">{t.slug}</code>
                  {t.wired ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center gap-1">
                      <Check size={10} /> מחובר
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-500 flex items-center gap-1">
                      <AlertTriangle size={10} /> לא מחובר
                    </span>
                  )}
                  {t.isCustomMapping && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                      מיפוי מותאם
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>טריגר: {t.trigger}</span>
                  <span>•</span>
                  <span>נשלח ל: {recipientLabels[t.recipient] || t.recipient}</span>
                </div>
              </div>

              {/* Template selector + actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Template dropdown */}
                <div className="flex items-center gap-1">
                  <select
                    value={t.templateId || ''}
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '') {
                        changeMapping(t.slug, null);
                      } else {
                        changeMapping(t.slug, parseInt(val));
                      }
                    }}
                    disabled={saving === t.slug}
                    className="bg-slate-700 text-white text-xs px-2 py-1.5 rounded-lg border border-white/10 max-w-[180px]"
                    title="בחר תבנית"
                  >
                    <option value="">ללא תבנית</option>
                    {templates.map(tpl => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name} ({tpl.slug})
                      </option>
                    ))}
                  </select>
                  {t.isCustomMapping && (
                    <button
                      onClick={() => changeMapping(t.slug, null)}
                      className="p-1 text-slate-500 hover:text-amber-400 transition-colors"
                      title="החזר לברירת מחדל"
                    >
                      <RotateCcw size={12} />
                    </button>
                  )}
                </div>

                {/* Toggle */}
                {t.hasTemplate && (
                  <button
                    onClick={() => toggleActive(t)}
                    disabled={saving === t.slug}
                    className="p-1"
                    title={t.isActive ? 'כיבוי' : 'הפעלה'}
                  >
                    {saving === t.slug ? (
                      <Loader2 size={20} className="animate-spin text-slate-400" />
                    ) : t.isActive ? (
                      <ToggleRight size={24} className="text-green-400" />
                    ) : (
                      <ToggleLeft size={24} className="text-slate-500" />
                    )}
                  </button>
                )}

                {/* Edit template */}
                {t.hasTemplate && (
                  <button
                    onClick={() => router.push('/admin/email-templates')}
                    className="p-1.5 text-slate-500 hover:text-amber-400 transition-colors"
                    title="עריכת תבנית"
                  >
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
