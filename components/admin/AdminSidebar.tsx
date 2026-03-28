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
    Mail,
    ChevronUp,
    ChevronDown,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

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

function buildMenuSections(t: (key: string) => string): MenuSection[] {
    return [
        {
            id: 'dictionary',
            label: t('dictionary'),
            icon: <BookOpen size={18} />,
            items: [
                { label: t('activeRepo'), href: '/admin/dictionary' },
                { label: t('approvals'), href: '/admin/dictionary/pending', badgeKey: 'pending' },
                { label: t('aiApproval'), href: '/admin/dictionary/ai' },
                { label: t('dialects'), href: '/admin/dictionary/dialects' },
                { label: t('duplicates'), href: '/admin/dictionary/duplicates' },
            ],
        },
        {
            id: 'recipes',
            label: t('recipes'),
            icon: <Tag size={18} />,
            items: [
                { label: t('tagManagement'), href: '/admin/recipes' },
            ],
        },
        {
            id: 'marketplace',
            label: t('market'),
            icon: <ShoppingCart size={18} />,
            items: [
                { label: t('storeManagement'), href: '/admin/marketplace' },
            ],
        },
        {
            id: 'family',
            label: t('familyTree'),
            icon: <GitBranch size={18} />,
            items: [
                { label: t('suggestionsRequests'), href: '/admin/family' },
            ],
        },
        {
            id: 'seo',
            label: 'SEO',
            icon: <Globe size={18} />,
            items: [
                { label: t('seoManagement'), href: '/admin/seo' },
                { label: 'Analytics', href: '/admin/analytics' },
            ],
        },
        {
            id: 'email',
            label: t('emails'),
            icon: <Mail size={18} />,
            adminOnly: true,
            items: [
                { label: t('triggers'), href: '/admin/email-triggers' },
                { label: t('templates'), href: '/admin/email-templates' },
                { label: t('sendLog'), href: '/admin/email-logs' },
                { label: t('inbox'), href: '/admin/email-inbox' },
            ],
        },
        {
            id: 'general',
            label: t('general'),
            icon: <Settings size={18} />,
            adminOnly: true,
            items: [
                { label: t('users'), href: '/admin/users' },
                { label: t('eventLog'), href: '/admin/logs' },
                { label: t('featureManagement'), href: '/admin/features' },
                { label: t('translations'), href: '/admin/translations' },
                { label: t('apiKeys'), href: '/admin/settings' },
            ],
        },
    ];
}

interface AdminSidebarProps {
    userRole: string;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function AdminSidebar({ userRole, isCollapsed = false, onToggleCollapse }: AdminSidebarProps) {
    const pathname = usePathname();
    const t = useTranslations('admin');
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [badges, setBadges] = useState<Record<string, number>>({});
    const MENU_SECTIONS = buildMenuSections(t);

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

    useEffect(() => {
        const activeSection = MENU_SECTIONS.find((section) =>
            section.items.some((item) => pathname === item.href)
        );
        if (activeSection) {
            setExpanded((prev) => ({ ...prev, [activeSection.id]: true }));
        }
    }, [pathname]);

    const toggleSection = (id: string) => {
        if (isCollapsed) {
            onToggleCollapse?.();
            setExpanded((prev) => ({ ...prev, [id]: true }));
        } else {
            setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
        }
    };

    const visibleSections = MENU_SECTIONS.filter(
        (section) => !section.adminOnly || userRole === 'admin'
    );

    return (
        <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-[#0d1424]/60 backdrop-blur-xl border-e border-white/10 overflow-y-auto shrink-0 transition-all duration-300 flex flex-col`}>
            <nav className="py-4 flex-1">
                {visibleSections.map((section) => {
                    const isExpanded = expanded[section.id] ?? false;
                    const hasActiveChild = section.items.some((item) => pathname === item.href);

                    return (
                        <div key={section.id} className="mb-1">
                            {/* Section header */}
                            <button
                                onClick={() => toggleSection(section.id)}
                                title={isCollapsed ? section.label : undefined}
                                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} py-2.5 text-sm transition-colors ${
                                    hasActiveChild
                                        ? 'text-amber-400'
                                        : 'text-slate-300 hover:text-white'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <span className={hasActiveChild ? 'text-amber-400' : 'text-slate-500'}>
                                        {section.icon}
                                    </span>
                                    {!isCollapsed && <span className="font-medium">{section.label}</span>}
                                </div>
                                {!isCollapsed && (
                                    isExpanded ? (
                                        <ChevronUp size={14} className="text-slate-500" />
                                    ) : (
                                        <ChevronDown size={14} className="text-slate-500" />
                                    )
                                )}
                            </button>

                            {/* Section items — hidden when collapsed */}
                            {!isCollapsed && isExpanded && (
                                <div className="ms-4 border-s border-white/5">
                                    {section.items.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center justify-between ps-6 pe-4 py-2 text-sm transition-colors rounded-e-lg mx-2 mb-0.5 ${
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
