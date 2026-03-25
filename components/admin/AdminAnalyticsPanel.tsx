import React, { useState, useEffect, useCallback } from 'react';
import {
    BarChart3, Users, Eye, Clock, ArrowDownUp, Loader2, RefreshCw,
    Smartphone, Monitor, Tablet, Globe, TrendingUp, Zap, AlertTriangle
} from 'lucide-react';
import apiService from '../../services/apiService';

// ============================================
// TYPES
// ============================================

interface DailyOverview {
    date: string;
    sessions: number;
    users: number;
    pageviews: number;
    avgDuration: number;
    bounceRate: number;
}

interface OverviewData {
    totals: { sessions: number; users: number; pageviews: number; avgDuration: number; bounceRate: number };
    daily: DailyOverview[];
}

interface PageRow {
    path: string;
    pageviews: number;
    users: number;
    avgDuration: number;
}

interface SourceRow {
    channel: string;
    sessions: number;
    users: number;
}

interface DeviceRow {
    device: string;
    sessions: number;
    users: number;
}

type Period = '7' | '28' | '90';

// ============================================
// MINI CHART
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
// STAT CARD
// ============================================

const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtitle?: string;
    chart?: number[];
    chartColor?: string;
}> = ({ icon, label, value, subtitle, chart, chartColor = '#f59e0b' }) => (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
            {icon}
            <span>{label}</span>
        </div>
        <div className="text-2xl font-bold text-white">{value}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        {chart && chart.length > 0 && <MiniChart data={chart} color={chartColor} />}
    </div>
);

// ============================================
// HELPERS
// ============================================

const fmtDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
};

const fmtNumber = (n: number): string => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toLocaleString();
};

const deviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
        case 'mobile': return <Smartphone className="w-4 h-4" />;
        case 'tablet': return <Tablet className="w-4 h-4" />;
        default: return <Monitor className="w-4 h-4" />;
    }
};

const channelColor = (channel: string): string => {
    const colors: Record<string, string> = {
        'Organic Search': '#22c55e',
        'Direct': '#3b82f6',
        'Referral': '#f59e0b',
        'Social': '#ec4899',
        'Email': '#8b5cf6',
        'Paid Search': '#ef4444',
    };
    return colors[channel] || '#6b7280';
};

// ============================================
// MAIN COMPONENT
// ============================================

const AdminAnalyticsPanel: React.FC = () => {
    const [period, setPeriod] = useState<Period>('28');
    const [loading, setLoading] = useState(true);
    const [configured, setConfigured] = useState(false);
    const [overview, setOverview] = useState<OverviewData | null>(null);
    const [pages, setPages] = useState<PageRow[]>([]);
    const [sources, setSources] = useState<SourceRow[]>([]);
    const [devices, setDevices] = useState<DeviceRow[]>([]);
    const [activeUsers, setActiveUsers] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const status = await apiService.get<{ configured: boolean }>('/admin/analytics/status');
            setConfigured(status.configured);

            if (!status.configured) {
                setLoading(false);
                return;
            }

            const [overviewRes, pagesRes, sourcesRes, devicesRes, realtimeRes] = await Promise.allSettled([
                apiService.get<OverviewData>(`/admin/analytics/overview?days=${period}`),
                apiService.get<{ pages: PageRow[] }>(`/admin/analytics/pages?days=${period}`),
                apiService.get<{ sources: SourceRow[] }>(`/admin/analytics/sources?days=${period}`),
                apiService.get<{ devices: DeviceRow[] }>(`/admin/analytics/devices?days=${period}`),
                apiService.get<{ activeUsers: number }>('/admin/analytics/realtime'),
            ]);

            if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
            if (pagesRes.status === 'fulfilled') setPages(pagesRes.value.pages);
            if (sourcesRes.status === 'fulfilled') setSources(sourcesRes.value.sources);
            if (devicesRes.status === 'fulfilled') setDevices(devicesRes.value.devices);
            if (realtimeRes.status === 'fulfilled') setActiveUsers(realtimeRes.value.activeUsers);
        } catch (err: any) {
            console.error('Analytics fetch error:', err);
            setError(err.message || 'Failed to load analytics');
        }
        setLoading(false);
    }, [period]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // === Not configured state ===
    if (!loading && !configured) {
        return (
            <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Google Analytics</h3>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-amber-200 font-medium mb-2">Analytics לא מוגדר</p>
                    <p className="text-slate-400 text-sm mb-3">
                        הגדר GA_MEASUREMENT_ID ו-GA_PROPERTY_ID בקובץ .env בשרת
                    </p>
                    <div className="bg-slate-800 rounded-lg p-3 text-left text-xs font-mono text-slate-300 space-y-1">
                        <p>GA_MEASUREMENT_ID=G-XXXXXXXXXX</p>
                        <p>GA_PROPERTY_ID=123456789</p>
                    </div>
                    <p className="text-slate-400 text-xs mt-3">
                        הוסף את juhuri-gsc@juhuri-heritage.iam.gserviceaccount.com כ-Viewer ב-GA4 Property
                    </p>
                </div>
            </div>
        );
    }

    const totalSessions = sources.reduce((s, r) => s + r.sessions, 0) || 1;

    return (
        <div className="bg-slate-900/50 rounded-2xl p-6 border border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Google Analytics</h3>
                        {activeUsers !== null && (
                            <div className="flex items-center gap-1.5 text-xs">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <span className="text-green-400 font-medium">{activeUsers} פעילים עכשיו</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-800 rounded-lg p-0.5 text-xs">
                        {(['7', '28', '90'] as Period[]).map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p)}
                                className={`px-3 py-1.5 rounded-md transition-colors ${
                                    period === p
                                        ? 'bg-amber-500/20 text-amber-400'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {p}d
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-sm text-red-300">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
                    <span className="mr-2 text-slate-400">טוען נתוני Analytics...</span>
                </div>
            ) : overview ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <StatCard
                            icon={<Users className="w-3.5 h-3.5" />}
                            label="משתמשים"
                            value={fmtNumber(overview.totals.users)}
                            chart={overview.daily.map(d => d.users)}
                            chartColor="#3b82f6"
                        />
                        <StatCard
                            icon={<Eye className="w-3.5 h-3.5" />}
                            label="צפיות"
                            value={fmtNumber(overview.totals.pageviews)}
                            chart={overview.daily.map(d => d.pageviews)}
                            chartColor="#f59e0b"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-3.5 h-3.5" />}
                            label="סשנים"
                            value={fmtNumber(overview.totals.sessions)}
                            chart={overview.daily.map(d => d.sessions)}
                            chartColor="#22c55e"
                        />
                        <StatCard
                            icon={<Clock className="w-3.5 h-3.5" />}
                            label="זמן ממוצע"
                            value={fmtDuration(overview.totals.avgDuration)}
                            subtitle={`Bounce: ${(overview.totals.bounceRate * 100).toFixed(1)}%`}
                            chartColor="#8b5cf6"
                        />
                    </div>

                    {/* Two columns: Sources + Devices */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        {/* Traffic Sources */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                                <Globe className="w-4 h-4 text-amber-400" />
                                <span>מקורות תנועה</span>
                            </div>
                            {sources.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-4">אין נתונים</p>
                            ) : (
                                <div className="space-y-2">
                                    {sources.map((s, i) => (
                                        <div key={i}>
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-slate-300">{s.channel}</span>
                                                <span className="text-slate-400">{s.sessions} ({Math.round(s.sessions / totalSessions * 100)}%)</span>
                                            </div>
                                            <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                                                <div
                                                    className="h-1.5 rounded-full transition-all"
                                                    style={{
                                                        width: `${Math.round(s.sessions / totalSessions * 100)}%`,
                                                        backgroundColor: channelColor(s.channel),
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Devices */}
                        <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                                <Smartphone className="w-4 h-4 text-amber-400" />
                                <span>מכשירים</span>
                            </div>
                            {devices.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-4">אין נתונים</p>
                            ) : (
                                <div className="space-y-3">
                                    {devices.map((d, i) => {
                                        const totalDevices = devices.reduce((s, r) => s + r.sessions, 0) || 1;
                                        const pct = Math.round(d.sessions / totalDevices * 100);
                                        return (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="text-slate-400">{deviceIcon(d.device)}</div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-slate-300 capitalize">{d.device}</span>
                                                        <span className="text-slate-400">{pct}%</span>
                                                    </div>
                                                    <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                                                        <div
                                                            className="h-1.5 rounded-full bg-blue-500 transition-all"
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-xs text-slate-400 w-12 text-left">{d.sessions}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Pages */}
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
                        <div className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span>דפים מובילים</span>
                        </div>
                        {pages.length === 0 ? (
                            <p className="text-slate-400 text-sm text-center py-4">אין נתונים</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-slate-400 border-b border-white/5">
                                            <th className="text-right pb-2 font-medium">נתיב</th>
                                            <th className="text-left pb-2 font-medium">צפיות</th>
                                            <th className="text-left pb-2 font-medium">משתמשים</th>
                                            <th className="text-left pb-2 font-medium hidden sm:table-cell">זמן ממוצע</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pages.map((p, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                                                <td className="py-2 text-slate-300 font-mono max-w-[200px] truncate" dir="ltr">{p.path}</td>
                                                <td className="py-2 text-amber-400 font-medium">{fmtNumber(p.pageviews)}</td>
                                                <td className="py-2 text-blue-400">{fmtNumber(p.users)}</td>
                                                <td className="py-2 text-slate-400 hidden sm:table-cell">{fmtDuration(p.avgDuration)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : null}
        </div>
    );
};

export default AdminAnalyticsPanel;
