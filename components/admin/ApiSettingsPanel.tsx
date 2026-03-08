import React, { useState, useEffect } from 'react';
import { Key, Save, RefreshCw, Loader2, CheckCircle, XCircle, Trash2, FlaskConical } from 'lucide-react';
import apiService from '../../services/apiService';

interface Setting {
  setting_key: string;
  masked_value: string;
  description: string | null;
  updated_at: string;
}

interface TestResult {
  success: boolean;
  source: string;
  error?: string;
}

const ApiSettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [showInput, setShowInput] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.get<Setting[]>('/admin/settings');
      setSettings(data);
    } catch (err) {
      setError('שגיאה בטעינת הגדרות');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSettings(); }, []);

  const handleSaveKey = async () => {
    if (!newApiKey.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);
    try {
      await apiService.put('/admin/settings/gemini_api_key', {
        value: newApiKey.trim(),
        description: 'Gemini AI API Key',
      });
      setSuccess('מפתח API נשמר בהצלחה (מוצפן)');
      setNewApiKey('');
      setShowInput(false);
      await loadSettings();
    } catch (err: any) {
      setError(err.message || 'שגיאה בשמירת המפתח');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!confirm('האם למחוק את מפתח ה-API מהמאגר?\nהמערכת תשתמש בערך מקובץ .env.')) return;
    setError(null);
    setSuccess(null);
    try {
      await apiService.delete('/admin/settings/gemini_api_key');
      setSuccess('המפתח נמחק. המערכת תשתמש ב-.env.');
      setTestResult(null);
      await loadSettings();
    } catch (err: any) {
      setError(err.message || 'שגיאה במחיקת המפתח');
    }
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    setSuccess(null);
    try {
      const result = await apiService.post<TestResult>('/admin/settings/test-gemini');
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, source: 'unknown', error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const geminiSetting = settings.find(s => s.setting_key === 'gemini_api_key');

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        <span className="text-slate-400">טוען הגדרות...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-200">
            מפתחות API
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ניהול מפתחות API מוצפנים. המפתחות מאוחסנים מוצפנים במסד הנתונים ולא נחשפים בדפדפן.
          </p>
        </div>
        <button
          onClick={loadSettings}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="רענן"
        >
          <RefreshCw className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </div>
      )}

      {/* Gemini API Key Card */}
      <div className="p-5 rounded-xl border border-white/10 bg-[#0d1424]/60 backdrop-blur-xl/50 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-slate-200">Gemini API Key</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">מפתח לשירותי Google Gemini AI (חיפוש, תרגום, TTS)</p>
          </div>
          {geminiSetting ? (
            <code className="text-sm bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded font-mono text-slate-400">
              {geminiSetting.masked_value}
            </code>
          ) : (
            <span className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded">
              משתמש ב-.env
            </span>
          )}
        </div>

        {/* Update form */}
        {showInput ? (
          <div className="space-y-3 pt-3 border-t border-white/10">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">
                מפתח API חדש
              </label>
              <input
                type="password"
                value={newApiKey}
                onChange={e => setNewApiKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white font-mono text-sm"
                placeholder="AIza..."
                dir="ltr"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-1">
                המפתח יוצפן באמצעות AES-256-GCM ויאוחסן במסד הנתונים
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowInput(false); setNewApiKey(''); }}
                className="px-4 py-2 bg-slate-100 hover:bg-white/10 dark:hover:bg-slate-600 rounded-lg text-sm transition-colors text-slate-300"
              >
                ביטול
              </button>
              <button
                onClick={handleSaveKey}
                disabled={saving || !newApiKey.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'שומר...' : 'שמור מוצפן'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10">
            <button
              onClick={() => setShowInput(true)}
              className="px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Key className="w-4 h-4" />
              {geminiSetting ? 'עדכן מפתח' : 'הגדר מפתח'}
            </button>
            <button
              onClick={handleTestKey}
              disabled={testing}
              className="px-4 py-2 bg-white/10 text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              בדוק חיבור
            </button>
            {geminiSetting && (
              <button
                onClick={handleDeleteKey}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                מחק (חזרה ל-.env)
              </button>
            )}
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            testResult.success
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {testResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {testResult.success
              ? `המפתח תקין (מקור: ${testResult.source === 'database' ? 'מסד נתונים' : 'קובץ .env'})`
              : `שגיאה: ${testResult.error || 'המפתח לא תקין'}`}
          </div>
        )}

        {/* Last update */}
        {geminiSetting && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            עודכן לאחרונה: {new Date(geminiSetting.updated_at).toLocaleString('he-IL')}
          </p>
        )}
      </div>
    </div>
  );
};

export default ApiSettingsPanel;
