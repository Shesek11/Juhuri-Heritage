'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Link } from '@/src/i18n/navigation';
import { Database, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';
import { useTranslations, useLocale } from 'next-intl';
import AdminSidebar from '../../../../components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const t = useTranslations('shell');
    const locale = useLocale();
    const dir = locale === 'he' ? 'rtl' : 'ltr';

    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('admin-sidebar-collapsed') === 'true';
        }
        return false;
    });

    const toggleSidebar = () => {
        const next = !sidebarCollapsed;
        setSidebarCollapsed(next);
        localStorage.setItem('admin-sidebar-collapsed', String(next));
    };

    useEffect(() => {
        if (!isLoading && (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'approver'))) {
            router.replace('/');
        }
    }, [isLoading, isAuthenticated, user, router]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 bg-[#050B14] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-400 text-sm">{t('adminPanel')}...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'approver')) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#050B14] overflow-hidden font-rubik flex flex-col" dir={dir}>
            {/* Header */}
            <header className="bg-[#0d1424]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={toggleSidebar}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                    >
                        {sidebarCollapsed
                            ? (dir === 'rtl' ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />)
                            : (dir === 'rtl' ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />)
                        }
                    </button>
                    <Database size={20} className="text-amber-500" />
                    <h1 className="text-lg font-bold text-white">{t('adminPanel')}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">
                        {user.name || user.email}
                        <span className="text-xs text-slate-500 ms-2">({user.role})</span>
                    </span>
                    <Link
                        href="/"
                        className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    >
                        {t('logout')} ←
                    </Link>
                </div>
            </header>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                <AdminSidebar userRole={user.role} isCollapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
