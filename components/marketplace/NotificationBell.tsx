import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, Check, CheckCheck, X, ShoppingBag, Star, Package } from 'lucide-react';
import { Notification, marketplaceService } from '../../services/marketplaceService';
import { useAuth } from '../../contexts/AuthContext';

export const NotificationBell: React.FC = () => {
    const t = useTranslations('marketplace');
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (user) {
            loadNotifications();
            // Poll for new notifications every 30 seconds
            const interval = setInterval(loadNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    const loadNotifications = async () => {
        if (!user) return;

        try {
            const data = await marketplaceService.getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        }
    };

    const markAsRead = async (notificationId: number) => {
        try {
            await marketplaceService.markNotificationRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark notification as read:', err);
        }
    };

    const markAllAsRead = async () => {
        setLoading(true);
        try {
            await marketplaceService.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        } finally {
            setLoading(false);
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'new_order':
                return <ShoppingBag size={16} className="text-orange-500" />;
            case 'order_confirmed':
            case 'order_ready':
            case 'order_completed':
                return <Package size={16} className="text-green-500" />;
            case 'order_cancelled':
                return <X size={16} className="text-red-500" />;
            case 'new_review':
                return <Star size={16} className="text-amber-500" />;
            default:
                return <Bell size={16} className="text-slate-400" />;
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return t('now');
        if (diffMins < 60) return t('minutesAgo', { count: diffMins });
        if (diffHours < 24) return t('hoursAgo', { count: diffHours });
        if (diffDays < 7) return t('daysAgo', { count: diffDays });
        return date.toLocaleDateString('he-IL');
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative bg-white/10 text-slate-700 dark:text-slate-300 p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute left-0 mt-2 w-80 bg-[#0d1424]/60 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 z-50 max-h-[500px] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-white/10 flex justify-between items-center">
                        <h3 className="font-bold text-slate-100">{t('notifications')}</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                disabled={loading}
                                className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 disabled:opacity-50"
                            >
                                <CheckCheck size={14} />
                                {t('markAllRead')}
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10 text-slate-400">
                                <Bell size={48} className="mx-auto mb-4 opacity-30" />
                                <p className="text-sm">{t('noNotifications')}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => !notification.is_read && markAsRead(notification.id)}
                                        className={`p-4 cursor-pointer transition-colors ${
                                            !notification.is_read
                                                ? 'bg-orange-50 dark:bg-orange-900/10 hover:bg-orange-100 dark:hover:bg-orange-900/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="shrink-0 mt-1">
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className={`text-sm font-bold ${
                                                        !notification.is_read ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {notification.title}
                                                    </h4>
                                                    {!notification.is_read && (
                                                        <div className="w-2 h-2 bg-orange-600 rounded-full shrink-0 mt-1" />
                                                    )}
                                                </div>
                                                {notification.message && (
                                                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                )}
                                                <p className="text-xs text-slate-400">
                                                    {formatTime(notification.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
