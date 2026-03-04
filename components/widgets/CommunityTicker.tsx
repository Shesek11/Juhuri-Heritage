import React, { useEffect, useState, useRef } from 'react';
import { Activity, User, Heart, MessageCircle, BookOpen, CheckCircle } from 'lucide-react';
import apiService from '../../services/apiService';

interface ActivityItem {
    id: string;
    user: string;
    action: 'like' | 'comment' | 'translate' | 'join' | 'approve';
    target?: string;
    time: string;
}

interface ApiActivity {
    event_type: string;
    description: string;
    user_name: string;
    created_at: string;
    metadata: string | null;
}

// Helper to format relative time in Hebrew
const formatRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'עכשיו';
    if (diffMins < 60) return `לפני ${diffMins} דק'`;
    if (diffHours < 24) return `לפני ${diffHours} שע'`;
    if (diffDays === 1) return 'אתמול';
    return `לפני ${diffDays} ימים`;
};

// Map API event_type to our action types
const mapEventToAction = (eventType: string): ActivityItem['action'] => {
    switch (eventType) {
        case 'ENTRY_ADDED': return 'translate';
        case 'ENTRY_APPROVED': return 'approve';
        case 'USER_REGISTER': return 'join';
        default: return 'translate';
    }
};

const CommunityTicker: React.FC = () => {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchActivities = async () => {
            try {
                const res = await apiService.get<{ activities: ApiActivity[] }>('/dictionary/community-activity?limit=10');
                if (res.activities && res.activities.length > 0) {
                    const mapped: ActivityItem[] = res.activities.map((a, idx) => {
                        let target: string | undefined;
                        if (a.metadata) {
                            try {
                                const meta = typeof a.metadata === 'string' ? JSON.parse(a.metadata) : a.metadata;
                                target = meta.term;
                            } catch {}
                        }
                        return {
                            id: String(idx),
                            user: a.user_name || 'אורח',
                            action: mapEventToAction(a.event_type),
                            target,
                            time: formatRelativeTime(a.created_at)
                        };
                    });
                    setActivities(mapped);
                }
            } catch (err) {
                console.error("Failed to fetch community activity", err);
            } finally {
                setLoading(false);
            }
        };
        fetchActivities();
    }, []);

    // Auto scroll effect
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        let animationId: number;

        const scroll = () => {
            if (el.scrollTop >= el.scrollHeight / 2) {
                el.scrollTop = 0;
            } else {
                el.scrollTop += 0.5; // Speed
            }
            animationId = requestAnimationFrame(scroll);
        };

        // Start scrolling
        // animationId = requestAnimationFrame(scroll);

        // return () => cancelAnimationFrame(animationId);
        // Note: Disabling auto-scroll for now as CSS animation is smoother for ticker usually, 
        // or just static list for this layout style
    }, []);

    const getIcon = (action: string) => {
        switch (action) {
            case 'like': return <Heart size={14} className="text-pink-500" fill="currentColor" />;
            case 'comment': return <MessageCircle size={14} className="text-indigo-500" />;
            case 'translate': return <BookOpen size={14} className="text-green-500" />;
            case 'approve': return <CheckCircle size={14} className="text-emerald-500" />;
            case 'join': return <User size={14} className="text-amber-500" />;
            default: return <Activity size={14} />;
        }
    };

    const getText = (item: ActivityItem) => {
        switch (item.action) {
            case 'like': return <span>אהב/ה את <b>{item.target}</b></span>;
            case 'comment': return <span>הגיב/ה על <b>{item.target}</b></span>;
            case 'translate': return item.target ? <span>הוסיפ/ה את <b>{item.target}</b></span> : <span>הוסיפ/ה מילה חדשה</span>;
            case 'approve': return item.target ? <span>אישר/ה את <b>{item.target}</b></span> : <span>אישר/ה מילה</span>;
            case 'join': return <span>הצטרף/ה לקהילה! ברוכים הבאים</span>;
            default: return <span>ביצע/ה פעולה</span>;
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden font-rubik h-full flex flex-col">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Activity size={20} /> קורה עכשיו
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded-full">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-[10px] font-medium">LIVE</span>
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative p-2">
                {loading ? (
                    <div className="space-y-2 p-2">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse" />)}
                    </div>
                ) : activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 p-4">
                        <Activity size={32} className="mb-2 opacity-50" />
                        <p className="text-sm text-center">אין פעילות עדיין</p>
                        <p className="text-xs text-center mt-1">תרמו מילים כדי להתחיל!</p>
                    </div>
                ) : (
                    <div className="space-y-2 p-2" ref={scrollRef}>
                        {activities.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/30 border border-slate-100 dark:border-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-600 flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-500 text-xs font-bold text-slate-700 dark:text-slate-200">
                                    {item.user[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.user}</p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate flex items-center gap-1">
                                        {getIcon(item.action)}
                                        {getText(item)}
                                    </p>
                                </div>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap">{item.time}</span>
                            </div>
                        ))}
                    </div>
                )}
                {/* Fade overlay at bottom */}
                {activities.length > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none" />
                )}
            </div>
        </div>
    );
};

export default CommunityTicker;
