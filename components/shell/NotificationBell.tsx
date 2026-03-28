'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';
import type { Notification } from '../../types';

const LOCALE_MAP: Record<string, string> = { he: 'he-IL', en: 'en-US', ru: 'ru-RU' };

const NotificationBell: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const t = useTranslations('marketplace');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCount = async () => {
      try {
        const res = await apiService.get<{ unreadCount: number }>('/dictionary/notifications?unread=true&limit=1');
        setUnreadCount(res.unreadCount);
      } catch { /* ignore */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const openDropdown = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setLoading(true);
      try {
        const res = await apiService.get<{ notifications: Notification[]; unreadCount: number }>('/dictionary/notifications?limit=10');
        setNotifications(res.notifications);
        setUnreadCount(res.unreadCount);
      } catch { /* ignore */ }
      setLoading(false);
    }
  };

  const markRead = async (id: number) => {
    try {
      await apiService.put(`/dictionary/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await apiService.put('/dictionary/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  if (!isAuthenticated) return null;

  const typeEmoji: Record<string, string> = {
    suggestion_approved: '✅',
    suggestion_rejected: '❌',
    entry_approved: '🎉',
    example_approved: '📝',
    upvote_received: '👍',
    comment_reply: '💬',
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={openDropdown}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
        title={t('notifications')}
        aria-label={t('notifications')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-5 h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-lg animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full start-0 mt-2 w-80 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-900/50 border-b border-slate-700">
            <h3 className="font-bold text-sm text-white">{t('notifications')}</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <CheckCheck size={12} />
                {t('markAllRead')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">{tc('loading')}</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">{t('noNotifications')}</div>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    if (!n.is_read) markRead(n.id);
                    if (n.link) window.location.href = n.link;
                    setIsOpen(false);
                  }}
                  className={`w-full text-start px-4 py-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${
                    !n.is_read ? 'bg-indigo-500/5' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg shrink-0 mt-0.5">{typeEmoji[n.type] || '🔔'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>
                          {n.title}
                        </span>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
                      </div>
                      {n.message && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</p>
                      )}
                      <p className="text-[11px] text-slate-400 mt-1">
                        {new Date(n.created_at).toLocaleDateString(LOCALE_MAP[locale] || 'he-IL')}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
