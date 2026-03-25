'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import AdminSidebar from '../../../components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated, isLoading } = useAuth();
    const router = useRouter();

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
                    <span className="text-slate-400 text-sm">טוען ממשק ניהול...</span>
                </div>
            </div>
        );
    }

    if (!isAuthenticated || !user || (user.role !== 'admin' && user.role !== 'approver')) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 bg-[#050B14] overflow-hidden font-rubik flex flex-col" dir="rtl">
            {/* Header */}
            <header className="bg-[#0d1424]/80 backdrop-blur-xl border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <Database size={20} className="text-amber-500" />
                    <h1 className="text-lg font-bold text-white">ממשק ניהול</h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">
                        {user.name || user.email}
                        <span className="text-xs text-slate-500 mr-2">({user.role})</span>
                    </span>
                    <Link
                        href="/"
                        className="text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    >
                        יציאה לאתר ←
                    </Link>
                </div>
            </header>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
                <AdminSidebar userRole={user.role} />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
