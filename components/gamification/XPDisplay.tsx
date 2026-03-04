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

const XPDisplay: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const [stats, setStats] = useState<GamificationStats | null>(null);
    const [badges, setBadges] = useState<Badge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showBadges, setShowBadges] = useState(false);

    useEffect(() => {
        if (!isAuthenticated || !user?.id) return;

        const fetchData = async () => {
            try {
                const [statsRes, badgesRes] = await Promise.all([
                    apiService.get<GamificationStats>(`/gamification/stats/${user.sub}`),
                    apiService.get<{ badges: Badge[] }>(`/gamification/badges/${user.sub}`)
                ]);
                setStats(statsRes);
                setBadges(badgesRes.badges || []);
            } catch (err) {
                console.error('Failed to fetch gamification data:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();

        // Check login streak on mount
        apiService.post('/gamification/check-login-streak', {})
            .catch(err => console.error('Failed to check login streak:', err));

    }, [isAuthenticated, user?.id]);

    if (!isAuthenticated || isLoading || !stats) return null;

    const earnedBadges = badges.filter(b => b.earned);

    return (
        <div className="relative">
            {/* Compact Display */}
            <button
                onClick={() => setShowBadges(!showBadges)}
                className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-xl border border-amber-500/30 hover:border-amber-500/50 transition-colors"
            >
                {/* Level Badge */}
                <div className="flex items-center gap-1 text-amber-500">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold text-sm">{stats.level}</span>
                </div>

                {/* XP Progress Bar */}
                <div className="w-20 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${stats.progressPercent}%` }}
                    />
                </div>

                {/* Streak */}
                {stats.streak > 0 && (
                    <div className="flex items-center gap-1 text-orange-400">
                        <Flame size={14} fill="currentColor" />
                        <span className="text-xs font-bold">{stats.streak}</span>
                    </div>
                )}

                {/* Badges Count */}
                {earnedBadges.length > 0 && (
                    <div className="flex items-center gap-1 text-purple-400">
                        <Trophy size={14} />
                        <span className="text-xs font-bold">{earnedBadges.length}</span>
                    </div>
                )}
            </button>

            {/* Badges Popup */}
            {showBadges && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                        <Award size={18} className="text-amber-500" />
                        הישגים שלי
                    </h3>

                    {/* Stats Summary */}
                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                        <div className="bg-slate-700/50 rounded-lg p-2">
                            <div className="text-lg font-bold text-amber-400">{stats.xp}</div>
                            <div className="text-[10px] text-slate-400">XP</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2">
                            <div className="text-lg font-bold text-orange-400">{stats.streak}</div>
                            <div className="text-[10px] text-slate-400">רצף</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2">
                            <div className="text-lg font-bold text-green-400">{stats.contributions}</div>
                            <div className="text-[10px] text-slate-400">תרומות</div>
                        </div>
                    </div>

                    {/* Badges Grid */}
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
                                <div className="text-[9px] text-slate-300 truncate">
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
