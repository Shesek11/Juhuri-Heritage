import React, { useState, useEffect } from 'react';
import {
    Globe, FileText, ArrowRightLeft, BarChart3, Search, RefreshCw, Loader2,
    Save, Plus, Trash2, CheckCircle, XCircle, ExternalLink, Copy, Eye,
    AlertTriangle, Bot, Map, Upload, Image, Palette, Cpu
} from 'lucide-react';
import apiService from '../../services/apiService';
import AdminGSCPanel from './AdminGSCPanel';

// ============================================
// TYPES
// ============================================

interface IndexStats {
    staticPages: number;
    dictionaryEntries: number;
    recipes: number;
    vendors: number;
    totalUrls: number;
}

interface MetaDefaults {
    [pageType: string]: {
        titleTemplate: string;
        description: string;
    };
}

interface Redirect {
    id: number;
    from_path: string;
    to_path: string;
    status_code: number;
    hits: number;
    is_active: boolean;
    created_at: string;
}

type SEOTab = 'overview' | 'gsc' | 'meta' | 'robots' | 'llms' | 'branding' | 'redirects' | 'preview';

const PAGE_TYPE_LABELS: Record<string, string> = {
    home: 'דף הבית',
    word: 'מילה בודדת (/word/:term)',
    recipes: 'עמוד מתכונים',
    recipe: 'מתכון בודד (/recipes/:id)',
    marketplace: 'עמוד השוק',
    vendor: 'חנות בודדת (/marketplace/:slug)',
    tutor: 'מורה פרטי AI',
    family: 'שורשים / רשת קהילתית',
};

const PAGE_TYPE_VARS: Record<string, string[]> = {
    word: ['{term}'],
    recipe: ['{title}'],
    vendor: ['{name}'],
};

// ============================================
// MAIN COMPONENT
// ============================================

export const AdminSEOPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<SEOTab>('overview');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Data
    const [indexStats, setIndexStats] = useState<IndexStats | null>(null);
    const [metaDefaults, setMetaDefaults] = useState<MetaDefaults>({});
    const [robotsTxt, setRobotsTxt] = useState('');
    const [robotsSource, setRobotsSource] = useState('');
    const [redirects, setRedirects] = useState<Redirect[]>([]);

    // New redirect form
    const [newFrom, setNewFrom] = useState('');
    const [newTo, setNewTo] = useState('');
    const [newCode, setNewCode] = useState(301);

    // llms.txt
    const [llmsTxt, setLlmsTxt] = useState('');
    const [llmsSource, setLlmsSource] = useState('');

    // Branding assets
    const [assets, setAssets] = useState<Record<string, string>>({});
    const [uploading, setUploading] = useState<string | null>(null);

    // Preview
    const [previewUrl, setPreviewUrl] = useState('');

    const tabs: { id: SEOTab; label: string; icon: React.ReactNode }[] = [
        { id: 'overview', label: 'סקירה', icon: <BarChart3 size={16} /> },
        { id: 'gsc', label: 'Search Console', icon: <Search size={16} /> },
        { id: 'branding', label: 'מיתוג', icon: <Palette size={16} /> },
        { id: 'meta', label: 'Meta תבניות', icon: <FileText size={16} /> },
        { id: 'robots', label: 'robots.txt', icon: <Bot size={16} /> },
        { id: 'llms', label: 'llms.txt', icon: <Cpu size={16} /> },
        { id: 'redirects', label: 'הפניות (301)', icon: <ArrowRightLeft size={16} /> },
        { id: 'preview', label: 'תצוגה מקדימה', icon: <Eye size={16} /> },
    ];

    // Clear messages after 4s
    useEffect(() => {
        if (success || error) {
            const t = setTimeout(() => { setSuccess(null); setError(null); }, 4000);
            return () => clearTimeout(t);
        }
    }, [success, error]);

    // Load data on tab change
    useEffect(() => {
        if (activeTab === 'overview') { loadStats(); loadAssets(); loadLlms(); }
        if (activeTab === 'meta') loadMeta();
        if (activeTab === 'robots') loadRobots();
        if (activeTab === 'llms') loadLlms();
        if (activeTab === 'branding') loadAssets();
        if (activeTab === 'redirects') loadRedirects();
    }, [activeTab]);

    // ============================================
    // API CALLS
    // ============================================

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/admin/seo/index-stats');
            setIndexStats(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadMeta = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/admin/seo/meta-defaults');
            setMetaDefaults(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const saveMeta = async () => {
        try {
            setSaving(true);
            await apiService.put('/admin/seo/meta-defaults', metaDefaults);
            setSuccess('תבניות Meta נשמרו בהצלחה');
        } catch (err) {
            setError('שגיאה בשמירת תבניות Meta');
        } finally {
            setSaving(false);
        }
    };

    const loadRobots = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/admin/seo/robots');
            setRobotsTxt(data.content || '');
            setRobotsSource(data.source || 'none');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const saveRobots = async () => {
        try {
            setSaving(true);
            await apiService.put('/admin/seo/robots', { content: robotsTxt });
            setRobotsSource('database');
            setSuccess('robots.txt עודכן בהצלחה');
        } catch (err) {
            setError('שגיאה בעדכון robots.txt');
        } finally {
            setSaving(false);
        }
    };

    const loadRedirects = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/admin/seo/redirects');
            setRedirects(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addRedirect = async () => {
        if (!newFrom.trim() || !newTo.trim()) return;
        try {
            setSaving(true);
            await apiService.post('/admin/seo/redirects', {
                from_path: newFrom.trim(),
                to_path: newTo.trim(),
                status_code: newCode
            });
            setNewFrom('');
            setNewTo('');
            setSuccess('הפניה נוספה');
            loadRedirects();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'שגיאה בהוספת הפניה');
        } finally {
            setSaving(false);
        }
    };

    const deleteRedirect = async (id: number) => {
        try {
            await apiService.delete(`/admin/seo/redirects/${id}`);
            setRedirects(prev => prev.filter(r => r.id !== id));
            setSuccess('הפניה נמחקה');
        } catch (err) {
            setError('שגיאה במחיקת הפניה');
        }
    };

    const toggleRedirect = async (id: number) => {
        try {
            await apiService.put(`/admin/seo/redirects/${id}/toggle`, {});
            setRedirects(prev => prev.map(r =>
                r.id === id ? { ...r, is_active: !r.is_active } : r
            ));
        } catch (err) {
            setError('שגיאה בעדכון הפניה');
        }
    };

    // ============================================
    // LLMS.TXT API
    // ============================================

    const loadLlms = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/admin/seo/llms');
            setLlmsTxt(data.content || '');
            setLlmsSource(data.source || 'none');
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const saveLlms = async () => {
        try {
            setSaving(true);
            await apiService.put('/admin/seo/llms', { content: llmsTxt });
            setLlmsSource('database');
            setSuccess('llms.txt עודכן בהצלחה');
        } catch (err) {
            setError('שגיאה בעדכון llms.txt');
        } finally {
            setSaving(false);
        }
    };

    // ============================================
    // BRANDING ASSETS API
    // ============================================

    const loadAssets = async () => {
        try {
            setLoading(true);
            const data = await apiService.get('/admin/seo/assets');
            setAssets(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const uploadAsset = async (type: string, file: File) => {
        try {
            setUploading(type);
            const formData = new FormData();
            formData.append('file', file);
            const resp = await fetch(`/api/admin/seo/assets/${type}`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error);
            setAssets(prev => ({
                ...prev,
                [type === 'og-image' ? 'og_image' : type === 'logo' ? 'site_logo' : 'favicon']: data.url
            }));
            setSuccess(`${type} עודכן בהצלחה`);
        } catch (err: any) {
            setError(err.message || `שגיאה בהעלאת ${type}`);
        } finally {
            setUploading(null);
        }
    };

    // ============================================
    // RENDER HELPERS
    // ============================================

    const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode; color: string }> = ({ label, value, icon, color }) => (
        <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-lg ${color}`}>{icon}</div>
                <div>
                    <div className="text-2xl font-bold text-slate-800 dark:text-white">{value.toLocaleString()}</div>
                    <div className="text-sm text-slate-400 dark:text-slate-400">{label}</div>
                </div>
            </div>
        </div>
    );

    // ============================================
    // TAB CONTENT
    // ============================================

    const renderOverview = () => (
        <div className="space-y-6">
            {/* Index Stats */}
            <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3">URLs ב-Sitemap</h4>
                {indexStats ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <StatCard label="עמודים סטטיים" value={indexStats.staticPages} icon={<Globe size={18} />} color="bg-blue-100 dark:bg-blue-900/30 text-blue-600" />
                        <StatCard label="מילים" value={indexStats.dictionaryEntries} icon={<Search size={18} />} color="bg-amber-100 dark:bg-amber-900/30 text-amber-600" />
                        <StatCard label="מתכונים" value={indexStats.recipes} icon={<FileText size={18} />} color="bg-green-100 dark:bg-green-900/30 text-green-600" />
                        <StatCard label="חנויות" value={indexStats.vendors} icon={<Map size={18} />} color="bg-purple-100 dark:bg-purple-900/30 text-purple-600" />
                        <StatCard label="סה״כ URLs" value={indexStats.totalUrls} icon={<BarChart3 size={18} />} color="bg-white/10 text-slate-600 dark:text-slate-300" />
                    </div>
                ) : loading ? (
                    <div className="flex items-center gap-2 text-slate-400"><Loader2 size={16} className="animate-spin" /> טוען...</div>
                ) : null}
            </div>

            {/* SEO Checklist */}
            <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3">מצב SEO</h4>
                <div className="space-y-2">
                    {[
                        { label: 'React Router - URLs ייחודיים', done: true },
                        { label: 'Meta tags דינמיים (react-helmet-async)', done: true },
                        { label: 'Open Graph + Twitter Cards', done: true },
                        { label: 'JSON-LD Structured Data (Recipe, LocalBusiness, DefinedTerm)', done: true },
                        { label: 'Sitemap.xml דינמי', done: true },
                        { label: 'robots.txt עם AI crawlers', done: true },
                        { label: 'Crawler meta injection (שיתוף חברתי)', done: true },
                        { label: 'Canonical URLs', done: true },
                        { label: 'תמונת OG ממותגת (1200x630)', done: !!assets.og_image, note: assets.og_image ? undefined : 'העלה בטאב "מיתוג"' },
                        { label: 'hreflang (עברית/אנגלית)', done: false, note: 'אופציונלי - אם יתווסף תוכן באנגלית' },
                        { label: 'llms.txt', done: llmsSource === 'database' || llmsSource === 'file', note: llmsSource === 'none' || !llmsSource ? 'ערוך בטאב "llms.txt"' : undefined },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-white/5/50">
                            {item.done
                                ? <CheckCircle size={18} className="text-green-500 mt-0.5 shrink-0" />
                                : <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                            }
                            <div>
                                <span className={`text-sm ${item.done ? 'text-slate-300' : 'text-amber-700 dark:text-amber-300 font-medium'}`}>
                                    {item.label}
                                </span>
                                {item.note && (
                                    <span className="text-xs text-slate-400 dark:text-slate-400 block">{item.note}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Links */}
            <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3">קישורים מהירים</h4>
                <div className="flex flex-wrap gap-2">
                    {[
                        { label: 'Sitemap', url: '/sitemap.xml' },
                        { label: 'robots.txt', url: '/robots.txt' },
                        { label: 'Google Rich Results Test', url: 'https://search.google.com/test/rich-results' },
                        { label: 'OG Tag Tester', url: 'https://www.opengraph.xyz/' },
                    ].map(link => (
                        <a
                            key={link.label}
                            href={link.url.startsWith('/') ? `https://jun-juhuri.com${link.url}` : link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 text-slate-300 rounded-lg text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            <ExternalLink size={14} />
                            {link.label}
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderMeta = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400 dark:text-slate-400">
                    תבניות כותרת ותיאור לכל סוג עמוד. משתנים: <code className="bg-white/10 px-1 rounded">{'{term}'}</code>, <code className="bg-white/10 px-1 rounded">{'{title}'}</code>, <code className="bg-white/10 px-1 rounded">{'{name}'}</code>
                </p>
                <button
                    onClick={saveMeta}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    שמור
                </button>
            </div>

            <div className="space-y-4">
                {Object.entries(metaDefaults).map(([pageType, meta]) => (
                    <div key={pageType} className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-semibold text-slate-200 text-sm">
                                {PAGE_TYPE_LABELS[pageType] || pageType}
                            </h4>
                            {PAGE_TYPE_VARS[pageType] && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                                    משתנים: {PAGE_TYPE_VARS[pageType].join(', ')}
                                </span>
                            )}
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-slate-400 dark:text-slate-400 block mb-1">
                                    Title ({meta.titleTemplate?.length || 0}/60 תווים)
                                </label>
                                <input
                                    type="text"
                                    value={meta.titleTemplate || ''}
                                    onChange={(e) => setMetaDefaults(prev => ({
                                        ...prev,
                                        [pageType]: { ...prev[pageType], titleTemplate: e.target.value }
                                    }))}
                                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white dark:bg-slate-700 text-slate-200 text-sm"
                                    dir="rtl"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-400 dark:text-slate-400 block mb-1">
                                    Description ({meta.description?.length || 0}/160 תווים)
                                </label>
                                <textarea
                                    value={meta.description || ''}
                                    onChange={(e) => setMetaDefaults(prev => ({
                                        ...prev,
                                        [pageType]: { ...prev[pageType], description: e.target.value }
                                    }))}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white dark:bg-slate-700 text-slate-200 text-sm resize-none"
                                    dir="rtl"
                                />
                            </div>
                        </div>

                        {/* Google Preview */}
                        <div className="mt-3 p-3 bg-white/5 rounded-lg">
                            <div className="text-xs text-slate-400 mb-1">תצוגה מקדימה בגוגל:</div>
                            <div className="text-blue-700 dark:text-blue-400 text-sm font-medium truncate">
                                {meta.titleTemplate || 'ללא כותרת'}
                            </div>
                            <div className="text-green-700 dark:text-green-500 text-xs truncate">
                                jun-juhuri.com/{pageType === 'home' ? '' : pageType}
                            </div>
                            <div className="text-slate-400 text-xs line-clamp-2 mt-0.5">
                                {meta.description || 'ללא תיאור'}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderRobots = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-400 dark:text-slate-400">
                        ערוך את robots.txt ישירות. שינויים חלים מיד.
                    </p>
                    {robotsSource && (
                        <span className="text-xs text-slate-400">
                            מקור: {robotsSource === 'database' ? 'מסד נתונים' : robotsSource === 'file' ? 'קובץ' : 'ברירת מחדל'}
                        </span>
                    )}
                </div>
                <button
                    onClick={saveRobots}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    שמור
                </button>
            </div>

            <textarea
                value={robotsTxt}
                onChange={(e) => setRobotsTxt(e.target.value)}
                rows={18}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0d1424]/60 backdrop-blur-xl text-slate-200 font-mono text-sm leading-relaxed resize-none"
                dir="ltr"
                spellCheck={false}
            />

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <strong>טיפ:</strong> הוסף <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">User-agent: GPTBot</code> + <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Allow: /</code> כדי לאפשר ל-ChatGPT לסרוק את האתר.
            </div>
        </div>
    );

    const renderRedirects = () => (
        <div className="space-y-4">
            <p className="text-sm text-slate-400 dark:text-slate-400">
                הפניות 301 אוטומטיות. שימושי להעברת URLים ישנים לחדשים.
            </p>

            {/* Add new */}
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl border border-white/10 p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-slate-400 block mb-1">מנתיב</label>
                        <input
                            type="text"
                            value={newFrom}
                            onChange={(e) => setNewFrom(e.target.value)}
                            placeholder="/old-page"
                            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white dark:bg-slate-700 text-sm"
                            dir="ltr"
                        />
                    </div>
                    <div className="flex items-end">
                        <ArrowRightLeft size={20} className="text-slate-400 mb-2.5" />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs font-medium text-slate-400 block mb-1">לנתיב</label>
                        <input
                            type="text"
                            value={newTo}
                            onChange={(e) => setNewTo(e.target.value)}
                            placeholder="/new-page"
                            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white dark:bg-slate-700 text-sm"
                            dir="ltr"
                        />
                    </div>
                    <div className="w-24">
                        <label className="text-xs font-medium text-slate-400 block mb-1">קוד</label>
                        <select
                            value={newCode}
                            onChange={(e) => setNewCode(Number(e.target.value))}
                            className="w-full px-2 py-2 rounded-lg border border-white/10 bg-white dark:bg-slate-700 text-sm"
                        >
                            <option value={301}>301</option>
                            <option value={302}>302</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={addRedirect}
                            disabled={saving || !newFrom.trim() || !newTo.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            הוסף
                        </button>
                    </div>
                </div>
            </div>

            {/* List */}
            {redirects.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                    אין הפניות. הוסף הפניה ראשונה למעלה.
                </div>
            ) : (
                <div className="space-y-2">
                    {redirects.map(r => (
                        <div
                            key={r.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                                r.is_active
                                    ? 'bg-[#0d1424]/60 backdrop-blur-xl border-white/10'
                                    : 'bg-white/5 border-slate-100 dark:border-slate-800 opacity-60'
                            }`}
                        >
                            <button
                                onClick={() => toggleRedirect(r.id)}
                                className={`shrink-0 ${r.is_active ? 'text-green-500' : 'text-slate-400'}`}
                                title={r.is_active ? 'פעיל - לחץ לכיבוי' : 'כבוי - לחץ להפעלה'}
                            >
                                {r.is_active ? <CheckCircle size={18} /> : <XCircle size={18} />}
                            </button>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 text-sm">
                                    <code className="text-red-600 dark:text-red-400 truncate">{r.from_path}</code>
                                    <ArrowRightLeft size={14} className="text-slate-400 shrink-0" />
                                    <code className="text-green-600 dark:text-green-400 truncate">{r.to_path}</code>
                                </div>
                            </div>

                            <span className="text-xs bg-white/10 text-slate-400 px-2 py-0.5 rounded shrink-0">
                                {r.status_code}
                            </span>

                            <span className="text-xs text-slate-400 shrink-0" title="כניסות">
                                {r.hits} hits
                            </span>

                            <button
                                onClick={() => deleteRedirect(r.id)}
                                className="text-red-400 hover:text-red-600 shrink-0"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    const renderLlms = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-slate-400 dark:text-slate-400">
                        קובץ <code className="bg-white/10 px-1 rounded">llms.txt</code> מספק מידע מובנה למנועי AI (ChatGPT, Claude, Perplexity).
                    </p>
                    {llmsSource && (
                        <span className="text-xs text-slate-400">
                            מקור: {llmsSource === 'database' ? 'מסד נתונים' : llmsSource === 'file' ? 'קובץ' : 'לא קיים'}
                        </span>
                    )}
                </div>
                <button
                    onClick={saveLlms}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    שמור
                </button>
            </div>

            <textarea
                value={llmsTxt}
                onChange={(e) => setLlmsTxt(e.target.value)}
                rows={20}
                placeholder={`# Juhuri Heritage\n> Interactive Juhuri-Hebrew dictionary for preserving the Mountain Jewish language.\n\n## About\nJuhuri Heritage is a community-driven platform...\n\n## Main Features\n- Dictionary: ...\n- AI Tutor: ...\n- Recipes: ...\n- Marketplace: ...\n\n## API\n- /api/dictionary/search?q={query}\n- /sitemap.xml`}
                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0d1424]/60 backdrop-blur-xl text-slate-200 font-mono text-sm leading-relaxed resize-none"
                dir="ltr"
                spellCheck={false}
            />

            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                <strong>מה זה llms.txt?</strong> קובץ שמסביר למנועי AI מה האתר שלך, מה הוא מציע, ואיך להשתמש בו. זה עוזר ל-AI להציג את האתר שלך בתשובות.
                <a href="https://llmstxt.org" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mr-2 underline">
                    מידע נוסף <ExternalLink size={12} />
                </a>
            </div>
        </div>
    );

    const AssetUploadCard: React.FC<{
        type: string;
        label: string;
        desc: string;
        currentUrl?: string;
        accept: string;
        recommended?: string;
    }> = ({ type, label, desc, currentUrl, accept, recommended }) => {
        const fileInputRef = React.useRef<HTMLInputElement>(null);
        const siteUrl = 'https://jun-juhuri.com';

        return (
            <div className="bg-[#0d1424]/60 backdrop-blur-xl rounded-xl border border-white/10 p-5">
                <div className="flex items-start gap-4">
                    {/* Preview */}
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center bg-white/5 overflow-hidden shrink-0">
                        {currentUrl ? (
                            <img src={`${siteUrl}${currentUrl}`} alt={label} className="w-full h-full object-contain" />
                        ) : (
                            <Image size={32} className="text-slate-300 dark:text-slate-600" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-200 text-sm">{label}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">{desc}</p>
                        {recommended && (
                            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">מומלץ: {recommended}</p>
                        )}
                        {currentUrl && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-mono truncate">{currentUrl}</p>
                        )}

                        <div className="mt-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={accept}
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadAsset(type, file);
                                    e.target.value = '';
                                }}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading === type}
                                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm"
                            >
                                {uploading === type ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                {currentUrl ? 'החלף' : 'העלה'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderBranding = () => (
        <div className="space-y-4">
            <p className="text-sm text-slate-400 dark:text-slate-400">
                העלה תמונות מיתוג עבור מנועי חיפוש ורשתות חברתיות.
            </p>

            <AssetUploadCard
                type="og-image"
                label="תמונת OG (שיתוף חברתי)"
                desc="תמונה שמופיעה כששומים לינק לאתר בפייסבוק, ווצאפ, טלגרם ועוד."
                currentUrl={assets.og_image}
                accept="image/png,image/jpeg,image/webp"
                recommended="1200x630 פיקסלים, PNG או JPG"
            />

            <AssetUploadCard
                type="logo"
                label="לוגו האתר"
                desc="לוגו שמופיע ב-Schema.org (Google Knowledge Panel) ובתוצאות חיפוש."
                currentUrl={assets.site_logo}
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                recommended="512x512 פיקסלים, PNG או SVG"
            />

            <AssetUploadCard
                type="favicon"
                label="Favicon (אייקון הטאב)"
                desc="אייקון קטן שמופיע בטאב של הדפדפן."
                currentUrl={assets.favicon}
                accept="image/png,image/svg+xml,image/x-icon"
                recommended="32x32 או 64x64 פיקסלים, PNG, SVG או ICO"
            />
        </div>
    );

    const renderPreview = () => {
        const siteUrl = 'https://jun-juhuri.com';
        const testUrls = [
            { label: 'דף הבית', path: '/' },
            { label: 'מילה (דוגמה)', path: '/word/%D7%A9%D7%9C%D7%95%D7%9D' },
            { label: 'מתכונים', path: '/recipes' },
            { label: 'שוק', path: '/marketplace' },
        ];

        return (
            <div className="space-y-4">
                <p className="text-sm text-slate-400 dark:text-slate-400">
                    בדוק איך העמודים שלך נראים ברשתות חברתיות ובגוגל.
                </p>

                {/* Quick test links */}
                <div className="flex flex-wrap gap-2">
                    {testUrls.map(u => (
                        <button
                            key={u.path}
                            onClick={() => setPreviewUrl(`${siteUrl}${u.path}`)}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                previewUrl === `${siteUrl}${u.path}`
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium'
                                    : 'bg-white/10 text-slate-400 hover:bg-slate-200'
                            }`}
                        >
                            {u.label}
                        </button>
                    ))}
                </div>

                {/* Custom URL */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={previewUrl}
                        onChange={(e) => setPreviewUrl(e.target.value)}
                        placeholder="https://jun-juhuri.com/word/שלום"
                        className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-white dark:bg-slate-700 text-sm"
                        dir="ltr"
                    />
                    <button
                        onClick={() => {
                            if (previewUrl) {
                                window.open(`https://www.opengraph.xyz/url/${encodeURIComponent(previewUrl)}`, '_blank');
                            }
                        }}
                        disabled={!previewUrl}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                        <Eye size={16} />
                        בדוק OG Tags
                    </button>
                </div>

                {/* External tools */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        {
                            title: 'Google Rich Results Test',
                            desc: 'בדיקת structured data (JSON-LD)',
                            url: `https://search.google.com/test/rich-results?url=${encodeURIComponent(previewUrl || siteUrl)}`,
                            color: 'border-blue-200 dark:border-blue-800'
                        },
                        {
                            title: 'Facebook Sharing Debugger',
                            desc: 'תצוגה מקדימה של שיתוף בפייסבוק',
                            url: `https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(previewUrl || siteUrl)}`,
                            color: 'border-indigo-200 dark:border-indigo-800'
                        },
                        {
                            title: 'Twitter Card Validator',
                            desc: 'תצוגה מקדימה של שיתוף בטוויטר',
                            url: `https://cards-dev.twitter.com/validator`,
                            color: 'border-sky-200 dark:border-sky-800'
                        },
                        {
                            title: 'Google Search Console',
                            desc: 'ניתוח ביצועים בחיפוש גוגל',
                            url: 'https://search.google.com/search-console',
                            color: 'border-green-200 dark:border-green-800'
                        },
                    ].map(tool => (
                        <a
                            key={tool.title}
                            href={tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-start gap-3 p-4 bg-[#0d1424]/60 backdrop-blur-xl rounded-xl border ${tool.color} hover:shadow-md transition-shadow`}
                        >
                            <ExternalLink size={18} className="text-slate-400 mt-0.5 shrink-0" />
                            <div>
                                <div className="font-medium text-sm text-slate-200">{tool.title}</div>
                                <div className="text-xs text-slate-400 dark:text-slate-400">{tool.desc}</div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        );
    };

    // ============================================
    // MAIN RENDER
    // ============================================

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                            activeTab === tab.id
                                ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-sm'
                                : 'text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Status messages */}
            {success && (
                <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">
                    <CheckCircle size={16} /> {success}
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                    <XCircle size={16} /> {error}
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 size={16} className="animate-spin" /> טוען...
                </div>
            )}

            {/* Tab Content */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'gsc' && <AdminGSCPanel />}
            {activeTab === 'branding' && renderBranding()}
            {activeTab === 'meta' && renderMeta()}
            {activeTab === 'robots' && renderRobots()}
            {activeTab === 'llms' && renderLlms()}
            {activeTab === 'redirects' && renderRedirects()}
            {activeTab === 'preview' && renderPreview()}
        </div>
    );
};

export default AdminSEOPanel;
