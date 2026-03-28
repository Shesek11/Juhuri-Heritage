import React, { useState, useEffect } from 'react';
import { Star, Flame, Trophy, Award } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

interface Badge {
    id: string;
    name: string;
    description: string;
    earned: boolean;
    earnedAt?: string;
}

interface GamificationStats {
    xp: number;
    level: number;
    streak: number;
    contributions: number;
    xpForNextLevel: number;
    progressPercent: number;
}

// Shared hook for gamification data
function useGamificationData() {
    const { user, isAuthenticated } = useAuth();
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;

        const fetchData = async () => {
            try {
                const [statsRes, badgesRes] = await Promise.all([
                    apiService.get<GamificationStats>(`/gamification/stats/${user.id}`),
                    apiService.get<{ badges: Badge[] }>(`/gamification/badges/${user.id}`)
                ]);
                setStats(statsRes);
                setBadges(badgesRes.badges || []);
            } catch (err) {
                if (process.env.NODE_ENV === 'development') console.error('Failed to fetch gamification data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        apiService.post('/gamification/check-login-streak', {})
            .catch(() => {});

    }, [isAuthenticated, user?.id]);

    return { stats, badges, isLoading, isAuthenticated };
}

/** Small notification bubble showing the star level — sits on the avatar */
export const XPNotificationBubble: React.FC = () => {
    const { stats, isLoading, isAuthenticated } = useGamificationData();

    if (!isAuthenticated || isLoading || !stats) return null;

    return (
        <div className="absolute -bottom-1 -left-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center gap-0.5 border-2 border-[#050B14] shadow-lg">
            <Star size={8} fill="white" className="text-white" />
            <span className="text-[11px] font-bold text-white leading-none">{stats.level}</span>
        </div>
    );
};

/** Inline stats display for the user dropdown menu */
const XPDisplay: React.FC<{ variant?: 'menu' }> = ({ variant }) => {
    const { stats, badges, isLoading, isAuthenticated } = useGamificationData();
    const [showBadges, setShowBadges] = useState(false);

    if (!isAuthenticated || isLoading || !stats) return null;

    const earnedBadges = badges.filter(b => b.earned);

    if (variant === 'menu') {
        return (
            <div>
                {/* Stats row */}
                <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-1.5 text-amber-500">
                        <Star size={14} fill="currentColor" />
                        <span className="font-bold text-sm">{stats.level}</span>
                    </div>

                    {stats.streak > 0 && (
                        <div className="flex items-center gap-1 text-orange-400">
                            <Flame size={14} fill="currentColor" />
                            <span className="text-xs font-bold">{stats.streak}</span>
                        </div>
                    )}

                    {earnedBadges.length > 0 && (
                        <div className="flex items-center gap-1 text-purple-400">
                            <Trophy size={14} />
                            <span className="text-xs font-bold">{earnedBadges.length}</span>
                        </div>
                    )}

                    <div className="text-xs text-slate-400">
                        {stats.xp} XP
                    </div>
                </div>

                {/* XP Progress Bar */}
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${stats.progressPercent}%` }}
                    />
                </div>

                {/* Badges preview */}
                {earnedBadges.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowBadges(!showBadges)}
                        className="mt-2 text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                        <Award size={12} />
                        {showBadges ? 'הסתר הישגים' : `${earnedBadges.length} הישגים`}
                    </button>
                )}

                {showBadges && (
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {badges.filter(b => b.earned).map((badge) => (
                            <div
                                key={badge.id}
                                className="p-1.5 rounded-lg text-center bg-amber-500/20 border border-amber-500/30"
                                title={badge.description}
                            >
                                <div className="text-lg">{badge.name.split(' ')[0]}</div>
                                <div className="text-[8px] text-slate-300 truncate">
                                    {badge.name.split(' ').slice(1).join(' ')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Default: original compact button (kept as fallback)
    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setShowBadges(!showBadges)}
                className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30 hover:border-amber-500/50 transition-colors"
            >
                <div className="flex items-center gap-1 text-amber-500">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold text-sm">{stats.level}</span>
                </div>
                <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${stats.progressPercent}%` }}
                    />
                </div>
                {stats.streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-400">
                        <Flame size={14} fill="currentColor" />
                        <span className="text-xs font-bold">{stats.streak}</span>
                    </div>
                )}
                {earnedBadges.length > 0 && (
                    <div className="flex items-center gap-1 text-purple-400">
                        <Trophy size={14} />
                        <span className="text-xs font-bold">{earnedBadges.length}</span>
                    </div>
                )}
            </button>

            {showBadges && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Award size={18} className="text-amber-500" />
                        הישגים שלי
                    </h3>
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div className="bg-slate-700/50 rounded-lg p-2">
                            <div className="text-lg font-bold text-amber-400">{stats.xp}</div>
                            <div className="text-[11px] text-slate-400">XP</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2">
                            <div className="text-lg font-bold text-orange-400">{stats.streak}</div>
                            <div className="text-[11px] text-slate-400">רצף</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2">
                            <div className="text-lg font-bold text-green-400">{stats.contributions}</div>
                            <div className="text-[11px] text-slate-400">תרומות</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        {badges.map((badge) => (
                            <div
                                key={badge.id}
                                className={`p-2 rounded-lg text-center transition-all ${badge.earned
                                        ? 'bg-amber-500/20 border border-amber-500/30'
                                        : 'bg-slate-700/30 opacity-50 grayscale'
                                    }`}
                                title={badge.description}
                            >
                                <div className="text-2xl">{badge.name.split(' ')[0]}</div>
                                <div className="text-[11px] text-slate-300 truncate">
                                    {badge.name.split(' ').slice(1).join(' ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default XPDisplay;
