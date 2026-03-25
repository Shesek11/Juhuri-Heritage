import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, Search, TrendingUp, FileText, Loader2, RefreshCw,
    MousePointerClick, Eye, Target, ArrowUpDown, ExternalLink, AlertTriangle
} from 'lucide-react';
import apiService from '../../services/apiService';

// ============================================
// TYPES
// ============================================

interface DailyData {
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface PerformanceData {
    totals: { clicks: number; impressions: number; ctr: number; position: number };
    daily: DailyData[];
}

interface QueryRow {
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface PageRow {
    page: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface SitemapInfo {
    path: string;
    lastSubmitted: string;
    lastDownloaded: string;
    isPending: boolean;
    warnings: string;
    errors: string;
    contents: { type: string; submitted: string; indexed: string }[] | null;
}

type Period = '7' | '28' | '90';

// ============================================
// MINI CHART - Sparkline bar chart
// ============================================

const MiniChart: React.FC<{ data: number[]; color: string; height?: number }> = ({ data, color, height = 48 }) => {
    if (!data.length) return null;
    const max = Math.max(...data, 1);
    const barWidth = Math.max(2, Math.min(8, Math.floor(200 / data.length) - 1));

    return (
        <svg width={data.length * (barWidth + 1)} height={height} className="mt-1">
            {data.map((v, i) => {
                const barH = (v / max) * (height - 2);
                return (
                    <rect
                        key={i}
                        x={i * (barWidth + 1)}
                        y={height - barH - 1}
                        width={barWidth}
                        height={Math.max(1, barH)}
                        fill={color}
                        rx={1}
                        opacity={0.8}
                    />
                );
            })}
        </svg>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

const AdminGSCPanel: React.FC = () => {
    const [configured, setConfigured] = useState<boolean | null>(null);
    const [period, setPeriod] = useState<Period>('28');
    const [loading, setLoading] = useState(false);
    const [performance, setPerformance] = useState<PerformanceData | null>(null);
    const [queries, setQueries] = useState<QueryRow[]>([]);
    const [pages, setPages] = useState<PageRow[]>([]);
    const [sitemaps, setSitemaps] = useState<SitemapInfo[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Check if GSC is configured
    useEffect(() => {
        apiService.get('/admin/gsc/status')
            .then((data: { configured: boolean }) => setConfigured(data.configured))
            .catch(() => setConfigured(false));
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [perfData, queryData, pageData, indexData] = await Promise.all([
                apiService.get(`/admin/gsc/performance?days=${period}`),
                apiService.get(`/admin/gsc/queries?days=${period}&limit=15`),
                apiService.get(`/admin/gsc/pages?days=${period}&limit=15`),
                apiService.get('/admin/gsc/index-status'),
            ]);
            setPerformance(perfData);
            setQueries(queryData.queries || []);
            setPages(pageData.pages || []);
            setSitemaps(indexData.sitemaps || []);
        } catch (err: any) {
            setError(err.message || 'שגיאה בטעינת נתונים');
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        if (configured) loadData();
    }, [configured, loadData]);

    // ============================================
    // NOT CONFIGURED STATE
    // ============================================

    if (configured === null) {
        return (
            <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                <Loader2 size={16} className="animate-spin" /> בודק הגדרות...
            </div>
        );
    }

    if (!configured) {
        return (
            <div className="text-center py-12 text-slate-400">
                <AlertTriangle size={40} className="mx-auto mb-3 text-amber-400" />
                <p className="text-lg font-medium text-slate-300 mb-2">Google Search Console לא מוגדר</p>
                <p className="text-sm">חסר קובץ gsc-service-account.json בשרת</p>
            </div>
        );
    }

    // ============================================
    // METRIC CARDS
    // ============================================

    const MetricCard: React.FC<{
        icon: React.ReactNode;
        label: string;
        value: string;
        sub?: string;
        chartData?: number[];
        chartColor?: string;
    }> = ({ icon, label, value, sub, chartData, chartColor }) => (
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                {icon} {label}
            </div>
            <div className="text-2xl font-bold text-slate-100">{value}</div>
            {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
            {chartData && chartColor && <MiniChart data={chartData} color={chartColor} />}
        </div>
    );

    // ============================================
    // RENDER
    // ============================================

    const t = performance?.totals;

    return (
        <div className="space-y-5">
            {/* Header with period selector */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Search size={18} className="text-blue-400" />
                    <span className="text-sm font-medium text-slate-300">Google Search Console</span>
                </div>
                <div className="flex items-center gap-2">
                    {(['7', '28', '90'] as Period[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-3 py-1 text-xs rounded-md transition-colors ${
                                period === p
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700/50 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {p} ימים
                        </button>
                    ))}
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="p-1.5 rounded-md bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-900/30 text-red-300 text-sm px-3 py-2 rounded-lg border border-red-800/50">
                    {error}
                </div>
            )}

            {loading && !performance && (
                <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
                    <Loader2 size={16} className="animate-spin" /> טוען נתונים מ-Google...
                </div>
            )}

            {/* Metric Cards */}
            {t && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MetricCard
                        icon={<MousePointerClick size={14} />}
                        label="קליקים"
                        value={t.clicks.toLocaleString('he-IL')}
                        chartData={performance!.daily.map(d => d.clicks)}
                        chartColor="#3b82f6"
                    />
                    <MetricCard
                        icon={<Eye size={14} />}
                        label="חשיפות"
                        value={t.impressions.toLocaleString('he-IL')}
                        chartData={performance!.daily.map(d => d.impressions)}
                        chartColor="#a855f7"
                    />
                    <MetricCard
                        icon={<Target size={14} />}
                        label="CTR ממוצע"
                        value={`${(t.ctr * 100).toFixed(1)}%`}
                    />
                    <MetricCard
                        icon={<ArrowUpDown size={14} />}
                        label="מיקום ממוצע"
                        value={t.position.toFixed(1)}
                    />
                </div>
            )}

            {/* Tables */}
            {(queries.length > 0 || pages.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top Queries */}
                    {queries.length > 0 && (
                        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center gap-2">
                                <TrendingUp size={14} className="text-blue-400" />
                                <span className="text-sm font-medium text-slate-300">שאילתות מובילות</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-400 border-b border-slate-700/30">
                                        <tr>
                                            <th className="text-right px-4 py-2 font-medium">שאילתה</th>
                                            <th className="text-center px-2 py-2 font-medium">קליקים</th>
                                            <th className="text-center px-2 py-2 font-medium">חשיפות</th>
                                            <th className="text-center px-2 py-2 font-medium">מיקום</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {queries.map((q, i) => (
                                            <tr key={i} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                                                <td className="px-4 py-2 text-slate-200 truncate max-w-[200px]" dir="auto">{q.query}</td>
                                                <td className="text-center px-2 py-2 text-blue-400 font-medium">{q.clicks}</td>
                                                <td className="text-center px-2 py-2 text-slate-400">{q.impressions.toLocaleString()}</td>
                                                <td className="text-center px-2 py-2 text-slate-400">{q.position.toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Top Pages */}
                    {pages.length > 0 && (
                        <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 overflow-hidden">
                            <div className="px-4 py-2.5 border-b border-slate-700/50 flex items-center gap-2">
                                <FileText size={14} className="text-green-400" />
                                <span className="text-sm font-medium text-slate-300">דפים מובילים</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-slate-400 border-b border-slate-700/30">
                                        <tr>
                                            <th className="text-right px-4 py-2 font-medium">דף</th>
                                            <th className="text-center px-2 py-2 font-medium">קליקים</th>
                                            <th className="text-center px-2 py-2 font-medium">חשיפות</th>
                                            <th className="text-center px-2 py-2 font-medium">CTR</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pages.map((p, i) => (
                                            <tr key={i} className="border-b border-slate-700/20 hover:bg-slate-700/20">
                                                <td className="px-4 py-2 text-slate-200 truncate max-w-[200px]" dir="ltr">
                                                    <a
                                                        href={`https://jun-juhuri.com${p.page}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:text-blue-400 transition-colors flex items-center gap-1"
                                                    >
                                                        {decodeURIComponent(p.page) || '/'}
                                                        <ExternalLink size={10} className="shrink-0 opacity-50" />
                                                    </a>
                                                </td>
                                                <td className="text-center px-2 py-2 text-green-400 font-medium">{p.clicks}</td>
                                                <td className="text-center px-2 py-2 text-slate-400">{p.impressions.toLocaleString()}</td>
                                                <td className="text-center px-2 py-2 text-slate-400">{(p.ctr * 100).toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Sitemap Status */}
            {sitemaps.length > 0 && (
                <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={14} className="text-amber-400" />
                        <span className="text-sm font-medium text-slate-300">סטטוס Sitemaps</span>
                    </div>
                    <div className="space-y-2">
                        {sitemaps.map((s, i) => (
                            <div key={i} className="flex items-center justify-between text-sm bg-slate-700/20 rounded-md px-3 py-2">
                                <span className="text-slate-300 text-xs" dir="ltr">
                                    {s.path.replace('https://jun-juhuri.com/', '/')}
                                </span>
                                <div className="flex items-center gap-3 text-xs">
                                    {s.contents && s.contents.map((c, j) => (
                                        <span key={j} className="text-slate-400">
                                            {c.submitted} הוגשו / {c.indexed} נוספו לאינדקס
                                        </span>
                                    ))}
                                    <span className={`px-2 py-0.5 rounded ${
                                        s.errors === '0' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                                    }`}>
                                        {s.errors === '0' ? 'תקין' : `${s.errors} שגיאות`}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {!loading && performance && t && t.clicks === 0 && t.impressions === 0 && (
                <div className="text-center py-8 text-slate-400">
                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                    <p>אין נתונים עדיין. גוגל מתחיל לסרוק - חזור בעוד כמה ימים.</p>
                </div>
            )}

            {/* Link to GSC */}
            <div className="text-center">
                <a
                    href="https://search.google.com/search-console?resource_id=https://jun-juhuri.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1"
                >
                    פתח ב-Google Search Console <ExternalLink size={10} />
                </a>
            </div>
        </div>
    );
};

export default AdminGSCPanel;
