'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    BookOpen,
    Tag,
    ShoppingCart,
    GitBranch,
    Globe,
    Settings,
    ChevronUp,
    ChevronDown,
} from 'lucide-react';

interface MenuItem {
    label: string;
    href: string;
    badgeKey?: string;
}

interface MenuSection {
    id: string;
    label: string;
    icon: React.ReactNode;
    items: MenuItem[];
    adminOnly?: boolean;
}

const MENU_SECTIONS: MenuSection[] = [
    {
        id: 'dictionary',
        label: 'מילון',
        icon: <BookOpen size={18} />,
        items: [
            { label: 'מאגר פעיל', href: '/admin/dictionary' },
            { label: 'אישורים', href: '/admin/dictionary/pending', badgeKey: 'pending' },
            { label: 'אישור AI', href: '/admin/dictionary/ai' },
            { label: 'ניהול ניבים', href: '/admin/dictionary/dialects' },
            { label: 'כפילויות', href: '/admin/dictionary/duplicates' },
        ],
    },
    {
        id: 'recipes',
        label: 'מתכונים',
        icon: <Tag size={18} />,
        items: [
            { label: 'ניהול תגיות', href: '/admin/recipes' },
        ],
    },
    {
        id: 'marketplace',
        label: 'שוק',
        icon: <ShoppingCart size={18} />,
        items: [
            { label: 'ניהול חנויות', href: '/admin/marketplace' },
        ],
    },
    {
        id: 'family',
        label: 'אילן יוחסין',
        icon: <GitBranch size={18} />,
        items: [
            { label: 'הצעות ובקשות', href: '/admin/family' },
        ],
    },
    {
        id: 'seo',
        label: 'SEO',
        icon: <Globe size={18} />,
        items: [
            { label: 'ניהול SEO', href: '/admin/seo' },
            { label: 'Analytics', href: '/admin/analytics' },
        ],
    },
    {
        id: 'general',
        label: 'כללי',
        icon: <Settings size={18} />,
        adminOnly: true,
        items: [
            { label: 'משתמשים', href: '/admin/users' },
            { label: 'יומן אירועים', href: '/admin/logs' },
            { label: 'ניהול פיצ\'רים', href: '/admin/features' },
            { label: 'מפתחות API', href: '/admin/settings' },
        ],
    },
];

interface AdminSidebarProps {
    userRole: string;
}

export default function AdminSidebar({ userRole }: AdminSidebarProps) {
    const pathname = usePathname();
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [badges, setBadges] = useState<Record<string, number>>({});

    // Fetch pending counts on mount
    useEffect(() => {
        (async () => {
            try {
                const res = await fetch('/api/dictionary/pending-suggestions', {
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    const count = Array.isArray(data.suggestions) ? data.suggestions.length : 0;
                    setBadges((prev) => ({ ...prev, pending: count }));
                }
            } catch {
                // silently ignore
            }
        })();
    }, []);

    // Auto-expand the section that contains the active link
    useEffect(() => {
        const activeSection = MENU_SECTIONS.find((section) =>
            section.items.some((item) => pathname === item.href)
        );
        if (activeSection) {
            setExpanded((prev) => ({ ...prev, [activeSection.id]: true }));
        }
    }, [pathname]);

    const toggleSection = (id: string) => {
        setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const visibleSections = MENU_SECTIONS.filter(
        (section) => !section.adminOnly || userRole === 'admin'
    );

    return (
        <aside className="w-64 bg-[#0d1424]/60 backdrop-blur-xl border-l border-white/10 overflow-y-auto shrink-0">
            <nav className="py-4">
                {visibleSections.map((section) => {
                    const isExpanded = expanded[section.id] ?? false;
                    const hasActiveChild = section.items.some((item) => pathname === item.href);

                    return (
                        <div key={section.id} className="mb-1">
                            {/* Section header */}
                            <button
                                onClick={() => toggleSection(section.id)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                                    hasActiveChild
                                        ? 'text-amber-400'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className={hasActiveChild ? 'text-amber-400' : 'text-slate-500'}>
                                        {section.icon}
                                    </span>
                                    <span className="font-medium">{section.label}</span>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp size={14} className="text-slate-500" />
                                ) : (
                                    <ChevronDown size={14} className="text-slate-500" />
                                )}
                            </button>

                            {/* Section items */}
                            {isExpanded && (
                                <div className="mr-4 border-r border-white/5">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center justify-between pr-6 pl-4 py-2 text-sm transition-colors rounded-l-lg mx-2 mb-0.5 ${
                                                    isActive
                                                        ? 'bg-amber-500 text-white font-medium'
                                                        : 'text-slate-400 hover:bg-white/10'
                                                }`}
                                            >
                                                {item.label}
                                                {item.badgeKey && badges[item.badgeKey] > 0 && (
                                                    <span className="bg-indigo-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                                                        {badges[item.badgeKey]}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
}
