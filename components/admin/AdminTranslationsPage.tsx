'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Save, Check, X, Filter, Languages, AlertCircle } from 'lucide-react';

interface TranslationEntry {
  key: string;
  he: string;
  en: string;
  ru: string;
}

export default function AdminTranslationsPage() {
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState('all');
  const [editingCell, setEditingCell] = useState<{ key: string; locale: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [missingOnly, setMissingOnly] = useState(false);

  useEffect(() => {
    loadTranslations();
  }, []);

  const loadTranslations = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/translations', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();

      const entries: TranslationEntry[] = Object.entries(data.translations).map(
        ([key, locales]: [string, any]) => ({
          key,
          he: locales.he || '',
          en: locales.en || '',
          ru: locales.ru || '',
        })
      );
      setTranslations(entries);
    } catch (err) {
      setError('Failed to load translations');
    } finally {
      setLoading(false);
    }
  };

  const namespaces = useMemo(() => {
    const ns = new Set<string>();
    translations.forEach(t => {
      const parts = t.key.split('.');
      if (parts.length > 1) ns.add(parts[0]);
    });
    return ['all', ...Array.from(ns).sort()];
  }, [translations]);

  const filtered = useMemo(() => {
    return translations.filter(t => {
      // Namespace filter
      if (namespaceFilter !== 'all' && !t.key.startsWith(namespaceFilter + '.')) return false;

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.key.toLowerCase().includes(q) &&
          !t.he.toLowerCase().includes(q) &&
          !t.en.toLowerCase().includes(q) &&
          !t.ru.toLowerCase().includes(q)
        )
          return false;
      }

      // Missing only
      if (missingOnly && t.en && t.ru) return false;

      return true;
    });
  }, [translations, namespaceFilter, search, missingOnly]);

  const startEdit = (key: string, locale: string, currentValue: string) => {
    setEditingCell({ key, locale });
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEdit = useCallback(async () => {
    if (!editingCell) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/translations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          key: editingCell.key,
          locale: editingCell.locale,
          value: editValue,
        }),
      });
      if (!res.ok) throw new Error('Save failed');

      // Update local state
      setTranslations(prev =>
        prev.map(t =>
          t.key === editingCell.key
            ? { ...t, [editingCell.locale]: editValue }
            : t
        )
      );
      setSavedKey(editingCell.key + editingCell.locale);
      setTimeout(() => setSavedKey(null), 2000);
      setEditingCell(null);
      setEditValue('');
    } catch {
      setError('Failed to save translation');
    } finally {
      setSaving(false);
    }
  }, [editingCell, editValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const missingCount = useMemo(() => {
    return translations.filter(t => !t.en || !t.ru).length;
  }, [translations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages size={24} className="text-amber-400" />
          <div>
            <h1 className="text-xl font-bold text-white">Translation Editor</h1>
            <p className="text-sm text-slate-400">
              {translations.length} keys &middot; {missingCount > 0 && (
                <span className="text-amber-400">{missingCount} missing translations</span>
              )}
              {missingCount === 0 && <span className="text-green-400">All translated</span>}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm">
          <AlertCircle size={14} />
          {error}
          <button type="button" onClick={() => setError('')} className="ms-auto text-red-400 hover:text-red-300">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search key, Hebrew, English, Russian..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg ps-10 pe-4 py-2 text-sm text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <select
            value={namespaceFilter}
            onChange={e => setNamespaceFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
          >
            {namespaces.map(ns => (
              <option key={ns} value={ns}>
                {ns === 'all' ? 'All namespaces' : ns}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setMissingOnly(!missingOnly)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            missingOnly
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
          }`}
        >
          <AlertCircle size={14} />
          Missing only
          {missingOnly && ` (${filtered.length})`}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/80">
              <th className="text-start px-4 py-3 text-slate-300 font-medium w-[22%] border-b border-slate-700">Key</th>
              <th className="text-start px-4 py-3 text-slate-300 font-medium w-[26%] border-b border-slate-700">
                <span className="inline-flex items-center gap-1">🇮🇱 עברית</span>
              </th>
              <th className="text-start px-4 py-3 text-slate-300 font-medium w-[26%] border-b border-slate-700">
                <span className="inline-flex items-center gap-1">🇺🇸 English</span>
              </th>
              <th className="text-start px-4 py-3 text-slate-300 font-medium w-[26%] border-b border-slate-700">
                <span className="inline-flex items-center gap-1">🇷🇺 Русский</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry, idx) => {
              const ns = entry.key.split('.')[0];
              const shortKey = entry.key.slice(ns.length + 1);

              return (
                <tr
                  key={entry.key}
                  className={`border-b border-slate-800 hover:bg-slate-800/40 transition-colors ${
                    idx % 2 === 0 ? 'bg-slate-900/30' : ''
                  }`}
                >
                  {/* Key column */}
                  <td className="px-4 py-2 align-top">
                    <span className="text-amber-500/70 text-xs">{ns}.</span>
                    <span className="text-slate-300 text-xs break-all">{shortKey}</span>
                  </td>

                  {/* Language columns */}
                  {(['he', 'en', 'ru'] as const).map(locale => {
                    const isEditing = editingCell?.key === entry.key && editingCell?.locale === locale;
                    const isSaved = savedKey === entry.key + locale;
                    const isEmpty = !entry[locale];

                    if (isEditing) {
                      return (
                        <td key={locale} className="px-2 py-1 align-top">
                          <div className="flex flex-col gap-1">
                            <textarea
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              autoFocus
                              rows={Math.max(2, Math.ceil(editValue.length / 40))}
                              className="w-full bg-slate-700 border border-amber-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none resize-y"
                              dir={locale === 'he' ? 'rtl' : 'ltr'}
                            />
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="p-1 rounded hover:bg-slate-700 text-slate-400"
                                title="Cancel (Esc)"
                              >
                                <X size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={saveEdit}
                                disabled={saving}
                                className="p-1 rounded hover:bg-green-500/20 text-green-400"
                                title="Save (Enter)"
                              >
                                {saving ? (
                                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-green-400" />
                                ) : (
                                  <Save size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={locale}
                        onClick={() => startEdit(entry.key, locale, entry[locale])}
                        className={`px-4 py-2 align-top cursor-pointer hover:bg-slate-700/30 transition-colors ${
                          isEmpty ? 'bg-red-500/5' : ''
                        }`}
                        dir={locale === 'he' ? 'rtl' : 'ltr'}
                      >
                        {isSaved ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-xs">
                            <Check size={12} /> Saved
                          </span>
                        ) : isEmpty ? (
                          <span className="text-red-400/50 text-xs italic">missing</span>
                        ) : (
                          <span className="text-slate-200 text-xs leading-relaxed line-clamp-3">
                            {entry[locale]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            {search || missingOnly ? 'No matching translations found' : 'No translations loaded'}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 text-center">
        Click any cell to edit. Press Enter to save, Esc to cancel.
      </p>
    </div>
  );
}
