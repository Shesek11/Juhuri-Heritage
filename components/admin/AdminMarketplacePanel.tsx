import React, { useState, useEffect } from 'react';
import { Vendor, Report, marketplaceService } from '../../services/marketplaceService';
import {
    Store,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Loader2,
    Eye,
    EyeOff,
    Ban,
    Play
} from 'lucide-react';

const AdminMarketplacePanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'pending' | 'reports' | 'all'>('pending');
    const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [allVendors, setAllVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'pending') {
                const vendors = await marketplaceService.getPendingVendors();
                setPendingVendors(vendors);
            } else if (activeTab === 'reports') {
                const reportData = await marketplaceService.getReports('pending');
                setReports(reportData);
            } else {
                const vendors = await marketplaceService.getVendors({});
                setAllVendors(vendors);
            }
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setLoading(false);
        }
    };

    const approveVendor = async (vendorId: number) => {
        setActionLoading(vendorId);
        try {
            await marketplaceService.approveVendor(vendorId);
            alert('✅ החנות אושרה בהצלחה!');
            loadData();
        } catch (err) {
            console.error('Failed to approve vendor:', err);
            alert('שגיאה באישור החנות');
        } finally {
            setActionLoading(null);
        }
    };

    const suspendVendor = async (vendorId: number) => {
        if (!confirm('האם אתה בטוח שברצונך להשעות חנות זו?')) return;

        setActionLoading(vendorId);
        try {
            await marketplaceService.suspendVendor(vendorId);
            alert('✅ החנות הושעתה בהצלחה!');
            loadData();
        } catch (err) {
            console.error('Failed to suspend vendor:', err);
            alert('שגיאה בהשעיית החנות');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReport = async (reportId: number, status: 'approved' | 'rejected') => {
        setActionLoading(reportId);
        try {
            await marketplaceService.updateReportStatus(reportId, { status });
            alert(`✅ הדיווח ${status === 'approved' ? 'אושר' : 'נדחה'} בהצלחה!`);
            loadData();
        } catch (err) {
            console.error('Failed to update report:', err);
            alert('שגיאה בעדכון הדיווח');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="flex-1 flex flex-col w-full">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Store size={24} className="text-orange-500" />
                ניהול שוק הקהילתי
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                        activeTab === 'pending'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-500'
                    }`}
                >
                    חנויות ממתינות ({pendingVendors.length})
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                        activeTab === 'reports'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-500'
                    }`}
                >
                    דיווחים קהילתיים ({reports.length})
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 font-bold border-b-2 transition-colors ${
                        activeTab === 'all'
                            ? 'border-orange-500 text-orange-600'
                            : 'border-transparent text-slate-500'
                    }`}
                >
                    כל החנויות
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="animate-spin text-orange-600" size={48} />
                    </div>
                ) : (
                    <>
                        {/* PENDING VENDORS */}
                        {activeTab === 'pending' && (
                            <div className="space-y-4">
                                {pendingVendors.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        אין חנויות ממתינות לאישור
                                    </div>
                                ) : (
                                    pendingVendors.map(vendor => (
                                        <div
                                            key={vendor.id}
                                            className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                                        {vendor.name}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">{vendor.address}</p>
                                                    {vendor.owner_name && (
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                            בעלים: {vendor.owner_name}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-bold">
                                                    ממתין לאישור
                                                </span>
                                            </div>

                                            {vendor.about_text && (
                                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                                                    {vendor.about_text}
                                                </p>
                                            )}

                                            <div className="flex gap-3 mt-4">
                                                <button
                                                    onClick={() => approveVendor(vendor.id)}
                                                    disabled={actionLoading === vendor.id}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {actionLoading === vendor.id ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <CheckCircle size={16} />
                                                    )}
                                                    אשר
                                                </button>
                                                <button
                                                    onClick={() => suspendVendor(vendor.id)}
                                                    disabled={actionLoading === vendor.id}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {actionLoading === vendor.id ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <XCircle size={16} />
                                                    )}
                                                    דחה
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* REPORTS */}
                        {activeTab === 'reports' && (
                            <div className="space-y-4">
                                {reports.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        אין דיווחים ממתינים
                                    </div>
                                ) : (
                                    reports.map(report => (
                                        <div
                                            key={report.id}
                                            className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex items-start gap-3 mb-4">
                                                <AlertTriangle className="text-orange-500 shrink-0" size={24} />
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                                        {report.vendor_name}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">{report.vendor_address}</p>
                                                    {report.vendor_phone && (
                                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                                            טלפון: {report.vendor_phone}
                                                        </p>
                                                    )}
                                                    {report.description && (
                                                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                                                            {report.description}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400 mt-2">
                                                        דווח על ידי: {report.reporter_name} •{' '}
                                                        {new Date(report.created_at).toLocaleDateString('he-IL')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handleReport(report.id, 'approved')}
                                                    disabled={actionLoading === report.id}
                                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {actionLoading === report.id ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <CheckCircle size={16} />
                                                    )}
                                                    אשר ויצור חנות
                                                </button>
                                                <button
                                                    onClick={() => handleReport(report.id, 'rejected')}
                                                    disabled={actionLoading === report.id}
                                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    {actionLoading === report.id ? (
                                                        <Loader2 className="animate-spin" size={16} />
                                                    ) : (
                                                        <XCircle size={16} />
                                                    )}
                                                    דחה
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* ALL VENDORS */}
                        {activeTab === 'all' && (
                            <div className="space-y-4">
                                {allVendors.length === 0 ? (
                                    <div className="text-center py-10 text-slate-400">
                                        אין חנויות במערכת
                                    </div>
                                ) : (
                                    allVendors.map(vendor => (
                                        <div
                                            key={vendor.id}
                                            className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                                        {vendor.name}
                                                        {vendor.is_verified && (
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                                                מאומת
                                                            </span>
                                                        )}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">{vendor.address}</p>
                                                    {vendor.owner_name && (
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                            בעלים: {vendor.owner_name}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span
                                                        className={`px-3 py-1 rounded-lg text-sm font-bold ${
                                                            vendor.status === 'active'
                                                                ? 'bg-green-100 text-green-700'
                                                                : vendor.status === 'pending'
                                                                ? 'bg-yellow-100 text-yellow-700'
                                                                : 'bg-red-100 text-red-700'
                                                        }`}
                                                    >
                                                        {vendor.status === 'active'
                                                            ? 'פעיל'
                                                            : vendor.status === 'pending'
                                                            ? 'ממתין'
                                                            : 'מושעה'}
                                                    </span>
                                                    {vendor.status === 'active' && (
                                                        <button
                                                            onClick={() => suspendVendor(vendor.id)}
                                                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1"
                                                        >
                                                            <Ban size={14} />
                                                            השעה
                                                        </button>
                                                    )}
                                                    {vendor.status === 'suspended' && (
                                                        <button
                                                            onClick={() => approveVendor(vendor.id)}
                                                            className="text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1"
                                                        >
                                                            <Play size={14} />
                                                            הפעל
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminMarketplacePanel;
