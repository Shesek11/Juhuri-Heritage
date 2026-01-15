import React, { useEffect, useState, useRef } from 'react';
import { Activity, User, Heart, MessageCircle, BookOpen } from 'lucide-react';

interface ActivityItem {
    id: string;
    user: string;
    action: 'like' | 'comment' | 'translate' | 'join';
    target?: string; // e.g., the word "Apple"
    time: string;
}

const CommunityTicker: React.FC = () => {
    // Simulated initial data - in real app, fetch from websocket or polling API
    const [activities, setActivities] = useState<ActivityItem[]>([
        { id: '1', user: 'דניאל', action: 'translate', target: 'לחם (Non)', time: 'לפני 2 דק\'' },
        { id: '2', user: 'שרה', action: 'like', target: 'בית (Khune)', time: 'לפני 5 דק\'' },
        { id: '3', user: 'מיכאל', action: 'join', time: 'לפני 10 דק\'' },
        { id: '4', user: 'רחלי', action: 'comment', target: 'שבת (Shabat)', time: 'לפני 15 דק\'' },
        { id: '5', user: 'יוסי', action: 'translate', target: 'מים (Ov)', time: 'לפני 20 דק\'' },
    ]);

    const scrollRef = useRef<HTMLDivElement>(null);

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
            case 'join': return <User size={14} className="text-amber-500" />;
            default: return <Activity size={14} />;
        }
    };

    const getText = (item: ActivityItem) => {
        switch (item.action) {
            case 'like': return <span>אהב/ה את <b>{item.target}</b></span>;
            case 'comment': return <span>הגיב/ה על <b>{item.target}</b></span>;
            case 'translate': return <span>תרגמ/ה את <b>{item.target}</b></span>;
            case 'join': return <span>הצטרף/ה לקהילה! ברוכים הבאים 👋</span>;
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
                {/* Vertical Marquee or List */}
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
                {/* Fade overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-slate-800 to-transparent pointer-events-none" />
            </div>
        </div>
    );
};

export default CommunityTicker;
