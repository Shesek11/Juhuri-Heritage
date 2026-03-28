'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Plus, Edit, Trash2, Save, X, Loader2, Send, Code, Columns,
  ToggleLeft, ToggleRight, Copy, Search, Settings, Image, Brush
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy-load GrapesJS editor — remove this import to revert to basic editor
const GrapesEmailEditor = dynamic(() => import('./GrapesEmailEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] bg-slate-900 rounded-lg">
      <Loader2 className="animate-spin text-amber-400" size={24} />
    </div>
  ),
});

interface EmailTemplate {
  id: number;
  slug: string;
  name: string;
  subject: string;
  html_body: string;
  from_name: string;
  from_email: string;
  to_type: 'admin' | 'user' | 'custom';
  to_address: string | null;
  variables: string[] | string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmailConfig {
  logoUrl: string;
  adminEmail: string;
}

const EMPTY_TEMPLATE: Partial<EmailTemplate> = {
  slug: '',
  name: '',
  subject: '',
  html_body: '',
  from_name: 'Juhuri Heritage',
  from_email: 'info@jun-juhuri.com',
  to_type: 'admin',
  to_address: '',
  variables: [],
  is_active: true,
};

const TO_TYPE_LABELS: Record<string, string> = {
  admin: 'אדמין',
  user: 'משתמש',
  custom: 'מותאם',
};

const CONFIG_ENDPOINT = '/api/admin/email-templates/config';

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<EmailTemplate> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'visual' | 'split' | 'builder'>('builder');
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [variableInput, setVariableInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<EmailConfig>({ logoUrl: '', adminEmail: '' });
  const [savingConfig, setSavingConfig] = useState(false);
  const [triggers, setTriggers] = useState<any[]>([]);
  const [showTriggers, setShowTriggers] = useState(false);


  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/email-templates', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch(CONFIG_ENDPOINT, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
      }
    } catch {
      // config endpoint may not exist yet
    }
  }, []);

  const loadTriggers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/email-templates/triggers', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTriggers(data.triggers);
      }
    } catch {}
  }, []);

  useEffect(() => { loadTemplates(); loadConfig(); loadTriggers(); }, [loadTemplates, loadConfig, loadTriggers]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const parseVariables = (v: string[] | string | null): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    try { return JSON.parse(v); } catch { return []; }
  };

  const handleNew = () => {
    setEditing({ ...EMPTY_TEMPLATE });
    setIsNew(true);
    setViewMode('split');
    setVariableInput('');
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditing({ ...template });
    setIsNew(false);
    setViewMode('split');
    setVariableInput(parseVariables(template.variables).join(', '));
  };

  const handleCancel = () => {
    setEditing(null);
    setIsNew(false);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const vars = variableInput.split(',').map(v => v.trim()).filter(Boolean);
      const payload = { ...editing, variables: vars, to_address: editing.to_address || null };
      const url = isNew ? '/api/admin/email-templates' : `/api/admin/email-templates/${editing.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMsg('success', isNew ? 'תבנית נוצרה בהצלחה' : 'תבנית עודכנה');
      setEditing(null);
      setIsNew(false);
      await loadTemplates();
    } catch (err: any) {
      showMsg('error', err.message || 'שגיאה');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('למחוק את התבנית?')) return;
    try {
      const res = await fetch(`/api/admin/email-templates/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('שגיאה במחיקה');
      showMsg('success', 'תבנית נמחקה');
      await loadTemplates();
    } catch (err: any) {
      showMsg('error', err.message);
    }
  };

  const handleToggleActive = async (template: EmailTemplate) => {
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...template, is_active: !template.is_active }),
      });
      if (!res.ok) throw new Error('שגיאה');
      await loadTemplates();
    } catch (err: any) {
      showMsg('error', err.message);
    }
  };

  const handleSendTest = async () => {
    if (!editing?.id || !testEmail) return;
    setSendingTest(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${editing.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ testEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg('success', data.message);
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch(CONFIG_ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showMsg('success', 'הגדרות נשמרו');
    } catch (err: any) {
      showMsg('error', err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const insertVariable = (varName: string) => {
    if (!editing) return;
    const placeholder = `{{${varName}}}`;
    setEditing({ ...editing, html_body: (editing.html_body || '') + placeholder });
  };

  // In split mode, update preview iframe when code changes (debounced)
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const updatePreviewTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSplitPreview = useCallback((html: string) => {
    if (updatePreviewTimeout.current) clearTimeout(updatePreviewTimeout.current);
    updatePreviewTimeout.current = setTimeout(() => {
      const iframe = previewIframeRef.current;
      if (!iframe?.contentDocument) return;
      const doc = iframe.contentDocument;
      doc.open(); // eslint-disable-line
      doc.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body { margin: 0; padding: 16px; font-family: Arial, sans-serif; }
</style></head>
<body>${html || ''}</body></html>`);
      doc.close();
    }, 300);
  }, []);


  const filteredTemplates = templates.filter(t =>
    !search || t.name.includes(search) || t.slug.includes(search)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-amber-400" size={32} />
      </div>
    );
  }

  // Settings panel
  const SettingsPanel = () => (
    <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Settings size={16} className="text-amber-400" />
          הגדרות מייל גלובליות
        </h3>
        <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white" title="סגור הגדרות">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-slate-400 block mb-1 flex items-center gap-1.5">
            <Image size={12} />
            כתובת לוגו (URL)
          </label>
          <input
            value={config.logoUrl}
            onChange={e => setConfig({ ...config, logoUrl: e.target.value })}
            placeholder="https://jun-juhuri.com/logo.png"
            className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10 font-mono text-sm"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 mt-1">
            {'השתמש ב-{{logoUrl}} בתבניות'}
          </p>
        </div>
        <div>
          <label className="text-sm text-slate-400 block mb-1 flex items-center gap-1.5">
            <Mail size={12} />
            מייל אדמין (לקבלת התראות)
          </label>
          <input
            value={config.adminEmail}
            onChange={e => setConfig({ ...config, adminEmail: e.target.value })}
            placeholder="jun.juhuri@gmail.com"
            className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10 font-mono text-sm"
            dir="ltr"
          />
          <p className="text-xs text-slate-500 mt-1">
            {'לשם נשלחות הודעות יצירת קשר + {{adminEmail}} בתבניות'}
          </p>
        </div>
      </div>
      {config.logoUrl && (
        <div className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
          <img
            src={config.logoUrl}
            alt="Logo preview"
            className="h-12 max-w-[200px] object-contain"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-xs text-slate-500">תצוגה מקדימה</span>
        </div>
      )}
      <div className="flex justify-end">
        <button
          onClick={handleSaveConfig}
          disabled={savingConfig}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-medium rounded-lg text-sm transition-colors"
        >
          {savingConfig ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          שמור הגדרות
        </button>
      </div>
    </div>
  );

  // Editor view
  if (editing) {
    const vars = variableInput.split(',').map(v => v.trim()).filter(Boolean);

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Mail size={20} className="text-amber-400" />
            {isNew ? 'תבנית חדשה' : `עריכת: ${editing.name}`}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && (
              <div className="flex items-center gap-2 me-4">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="מייל לבדיקה..."
                  className="bg-slate-700 text-white text-sm px-3 py-1.5 rounded-lg border border-white/10 w-48"
                />
                <button
                  onClick={handleSendTest}
                  disabled={sendingTest || !testEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
                >
                  {sendingTest ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  שלח בדיקה
                </button>
              </div>
            )}
            <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-white" title="סגור">
              <X size={18} />
            </button>
          </div>
        </div>

        {message && (
          <div className={`px-4 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {message.text}
          </div>
        )}

        {/* Form fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">שם התבנית</label>
            <input
              value={editing.name || ''}
              onChange={e => setEditing({ ...editing, name: e.target.value })}
              className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">Slug (מזהה)</label>
            <input
              value={editing.slug || ''}
              onChange={e => setEditing({ ...editing, slug: e.target.value })}
              className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10 font-mono text-sm"
              dir="ltr"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-slate-400 block mb-1">נושא (Subject)</label>
            <input
              value={editing.subject || ''}
              onChange={e => setEditing({ ...editing, subject: e.target.value })}
              className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">שם שולח</label>
            <input
              value={editing.from_name || ''}
              onChange={e => setEditing({ ...editing, from_name: e.target.value })}
              className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">אימייל שולח</label>
            <input
              value={editing.from_email || ''}
              onChange={e => setEditing({ ...editing, from_email: e.target.value })}
              className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10 font-mono text-sm"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">נשלח ל</label>
            <select
              value={editing.to_type || 'admin'}
              onChange={e => setEditing({ ...editing, to_type: e.target.value as any })}
              title="סוג נמען"
              className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10"
            >
              <option value="admin">אדמין</option>
              <option value="user">משתמש (דינמי)</option>
              <option value="custom">כתובת מותאמת</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">כתובת יעד</label>
            <input
              value={editing.to_address || ''}
              onChange={e => setEditing({ ...editing, to_address: e.target.value })}
              placeholder={editing.to_type === 'user' ? 'נקבע דינמית' : 'email@example.com'}
              disabled={editing.to_type === 'user'}
              className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10 font-mono text-sm disabled:opacity-40"
              dir="ltr"
            />
          </div>
          <div className="col-span-2">
            <label className="text-sm text-slate-400 block mb-1">משתנים (מופרדים בפסיקים)</label>
            <input
              value={variableInput}
              onChange={e => setVariableInput(e.target.value)}
              placeholder="userName, category, message..."
              className="w-full bg-slate-800 text-white px-3 py-2 rounded-lg border border-white/10 font-mono text-sm"
              dir="ltr"
            />
            {vars.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {vars.map(v => (
                  <button
                    key={v}
                    onClick={() => insertVariable(v)}
                    className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-md hover:bg-amber-500/30 font-mono"
                    title="לחץ להוספה לגוף ההודעה"
                  >
                    <Copy size={10} />
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* HTML Editor with mode toggle */}
        <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
            <span className="text-sm text-slate-400">גוף ההודעה (HTML)</span>
            <div className="flex items-center gap-1 bg-slate-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('builder')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'builder' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Brush size={12} />
                בילדר
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'code' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Code size={12} />
                קוד
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-md transition-colors ${viewMode === 'split' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                <Columns size={12} />
                מפוצל
              </button>
            </div>
          </div>

          {/* GrapesJS Builder */}
          {viewMode === 'builder' && (
            <GrapesEmailEditor
              initialHtml={editing.html_body || ''}
              onChange={(html) => setEditing(prev => prev ? { ...prev, html_body: html } : prev)}
              key={`grapes-${editing.id || 'new'}`}
            />
          )}

          {/* Code / Split editors */}
          {viewMode !== 'builder' && (
            <div className={`${viewMode === 'split' ? 'grid grid-cols-2' : ''}`}>
              {/* Code editor */}
              <textarea
                value={editing.html_body || ''}
                onChange={e => {
                  const val = e.target.value;
                  setEditing({ ...editing, html_body: val });
                  if (viewMode === 'split') updateSplitPreview(val);
                }}
                className={`w-full bg-slate-900 text-green-400 p-4 font-mono text-sm resize-y focus:outline-none ${viewMode === 'split' ? 'h-[500px] border-e border-white/10' : 'h-96'}`}
                dir="ltr"
                spellCheck={false}
              />
              {/* Read-only preview — only in split mode */}
              {viewMode === 'split' && (
                <iframe
                  ref={previewIframeRef}
                  className="w-full h-[500px] bg-white border-0"
                  sandbox="allow-same-origin"
                  title="תצוגה מקדימה"
                  onLoad={() => updateSplitPreview(editing.html_body || '')}
                  src="about:blank"
                  key={`iframe-split-${editing.id || 'new'}`}
                />
              )}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3">
          <button onClick={handleCancel} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">
            ביטול
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !editing.name || !editing.slug || !editing.subject}
            className="flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-medium rounded-lg transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {isNew ? 'צור תבנית' : 'שמור שינויים'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Mail size={20} className="text-amber-400" />
          תבניות מייל
          <span className="text-sm font-normal text-slate-400">({templates.length})</span>
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="חיפוש..."
              className="bg-slate-800 text-white text-sm pe-3 ps-9 py-2 rounded-lg border border-white/10 w-48"
            />
          </div>
          <button
            onClick={() => { setShowTriggers(!showTriggers); setShowSettings(false); }}
            className={`p-2 rounded-lg border transition-colors ${showTriggers ? 'border-amber-500/50 text-amber-400' : 'border-white/10 text-slate-400 hover:text-white'}`}
            title="אירועים וטריגרים"
          >
            <Send size={18} />
          </button>
          <button
            onClick={() => { setShowSettings(!showSettings); setShowTriggers(false); }}
            className={`p-2 rounded-lg border transition-colors ${showSettings ? 'border-amber-500/50 text-amber-400' : 'border-white/10 text-slate-400 hover:text-white'}`}
            title="הגדרות"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={handleNew}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-medium rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            תבנית חדשה
          </button>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {showSettings && <SettingsPanel />}

      {showTriggers && (
        <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4 space-y-3">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Send size={16} className="text-amber-400" />
            אירועי מייל — חיבור תבניות לאירועים
          </h3>
          <p className="text-xs text-slate-500">כל אירוע מחפש תבנית לפי ה-slug. אם התבנית פעילה — המייל יישלח. אם לא — האירוע יתעלם בשקט.</p>
          <table className="w-full text-sm text-start">
            <thead className="text-xs text-slate-400 border-b border-white/10">
              <tr>
                <th className="p-2">אירוע</th>
                <th className="p-2">טריגר</th>
                <th className="p-2">נשלח ל</th>
                <th className="p-2">תבנית</th>
                <th className="p-2">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {triggers.map(t => (
                <tr key={t.slug} className="hover:bg-white/5">
                  <td className="p-2">
                    <div className="text-white text-sm">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.description}</div>
                  </td>
                  <td className="p-2 text-slate-400 text-xs">{t.trigger}</td>
                  <td className="p-2 text-slate-400 text-xs">{t.recipient === 'admin' ? 'אדמין' : t.recipient === 'user' ? 'משתמש' : t.recipient}</td>
                  <td className="p-2">
                    {t.hasTemplate ? (
                      <button onClick={() => { const tpl = templates.find(x => x.slug === t.slug); if (tpl) handleEdit(tpl); }}
                        className="text-xs text-cyan-400 hover:underline font-mono">{t.slug}</button>
                    ) : (
                      <span className="text-xs text-red-400">חסרה</span>
                    )}
                  </td>
                  <td className="p-2">
                    {!t.hasTemplate ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-500">אין תבנית</span>
                    ) : t.isActive ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">פעיל</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">מושבת</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filteredTemplates.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Mail size={48} className="mx-auto mb-4 opacity-30" />
          <p>אין תבניות</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTemplates.map(template => {
            const vars = parseVariables(template.variables);
            return (
              <div
                key={template.id}
                className="bg-slate-800/50 rounded-xl border border-white/10 p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-white font-medium">{template.name}</h3>
                      <span className="text-xs font-mono text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
                        {template.slug}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${template.is_active ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/30 text-slate-500'}`}>
                        {template.is_active ? 'פעיל' : 'כבוי'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 mb-2 truncate">
                      נושא: {template.subject}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>מאת: {template.from_name} &lt;{template.from_email}&gt;</span>
                      <span>•</span>
                      <span>אל: {TO_TYPE_LABELS[template.to_type]}{template.to_address ? ` (${template.to_address})` : ''}</span>
                      {vars.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="font-mono">{vars.length} משתנים</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleActive(template)}
                      className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
                      title={template.is_active ? 'כיבוי' : 'הפעלה'}
                    >
                      {template.is_active ? <ToggleRight size={20} className="text-green-400" /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
                      title="עריכה"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      title="מחיקה"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
