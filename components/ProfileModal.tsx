import React, { useState, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import { X, User as UserIcon, Lock, Save, Loader2, CheckCircle, AlertCircle, Award, Flame, Edit3, Star, TrendingUp, MessageSquare, Heart, ChevronDown, ChevronUp } from 'lucide-react';
import { User } from '../types';
import apiService from '../services/apiService';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onUpdate: (updatedUser: User) => void;
}

// Level thresholds
const getLevelInfo = (xp: number) => {
    const levels = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500, 7500, 10000];
    let currentLevel = 1;
    let xpForCurrentLevel = 0;
    let xpForNextLevel = 100;

    for (let i = 0; i < levels.length - 1; i++) {
        if (xp >= levels[i]) {
            currentLevel = i + 1;
            xpForCurrentLevel = levels[i];
            xpForNextLevel = levels[i + 1];
        }
    }

    const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
    return { level: currentLevel, progress: Math.min(progress, 100), xpToNext: xpForNextLevel - xp };
};

// Level title based on level number
const getLevelTitle = (level: number): string => {
    const titles = ['מתחיל', 'לומד', 'מתקדם', 'בקיא', 'מומחה', 'אמן', 'למדן', 'חכם', 'רב', 'גאון', 'אגדה'];
    return titles[Math.min(level - 1, titles.length - 1)] || 'אגדה';
};

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [feedback, setFeedback] = useState('');
    const [showEditSection, setShowEditSection] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            setName(user.name);
            setPassword('');
            setConfirmPassword('');
            setStatus('idle');
            setFeedback('');
            setShowEditSection(false);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const levelInfo = getLevelInfo(user.xp || 0);
    const levelTitle = getLevelTitle(levelInfo.level);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('idle');
        setFeedback('');

        if (!name.trim()) {
            setStatus('error');
            setFeedback('שם לא יכול להיות ריק');
            setLoading(false);
            return;
        }

        if (password && password !== confirmPassword) {
            setStatus('error');
            setFeedback('הסיסמאות אינן תואמות');
            setLoading(false);
            return;
        }

        try {
            const updates: { name: string; password?: string } = { name };
            if (password) {
                updates.password = password;
            }

            await apiService.put('/auth/profile', updates);
            onUpdate({ ...user, name });

            setStatus('success');
            setFeedback('הפרטים עודכנו בהצלחה!');

            setTimeout(() => {
                setShowEditSection(false);
            }, 1500);

        } catch (err) {
            setStatus('error');
            setFeedback('אירעה שגיאה בעדכון הפרטים.');
        } finally {
            setLoading(false);
        }
    };

    // Generate avatar initials
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Role badge color
    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return { text: 'מנהל', bg: 'bg-red-500', icon: '👑' };
            case 'approver': return { text: 'מאשר', bg: 'bg-amber-500', icon: '✓' };
            default: return { text: 'חבר קהילה', bg: 'bg-indigo-500', icon: '👤' };
        }
    };

    const roleBadge = getRoleBadge(user.role);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 font-rubik"
            onClick={onClose}
        >
            <FocusTrap focusTrapOptions={{ allowOutsideClick: true, escapeDeactivates: true }}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="profile-modal-title"
                className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Avatar */}
                <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 pb-16">
                    <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                        <X size={18} />
                    </button>

                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                {/* Avatar - Overlapping header */}
                <div className="relative -mt-12 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white dark:border-slate-800">
                        {getInitials(user.name)}
                    </div>

                    <h2 id="profile-modal-title" className="mt-3 text-xl font-bold text-slate-800 dark:text-white">{user.name}</h2>
                    <p className="text-sm text-slate-400 dark:text-slate-400">{user.email}</p>

                    <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold text-white ${roleBadge.bg} flex items-center gap-1`}>
                        <span>{roleBadge.icon}</span>
                        {roleBadge.text}
                    </span>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3 p-5">
                    {/* XP Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl p-3 text-center border border-indigo-100 dark:border-indigo-800/50">
                        <div className="flex justify-center mb-1">
                            <Star className="text-indigo-500" size={20} />
                        </div>
                        <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{(user.xp || 0).toLocaleString()}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-400">נקודות XP</div>
                    </div>

                    {/* Level Card */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-800/50">
                        <div className="flex justify-center mb-1">
                            <Award className="text-amber-500" size={20} />
                        </div>
                        <div className="text-xl font-bold text-amber-600 dark:text-amber-400">Lv.{levelInfo.level}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-400">{levelTitle}</div>
                    </div>

                    {/* Streak Card */}
                    <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/30 dark:to-pink-900/30 rounded-xl p-3 text-center border border-red-100 dark:border-red-800/50">
                        <div className="flex justify-center mb-1">
                            <Flame className="text-red-500" size={20} />
                        </div>
                        <div className="text-xl font-bold text-red-500 dark:text-red-400">{user.currentStreak || 0}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-400">ימים רצופים</div>
                    </div>
                </div>

                {/* XP Progress Bar */}
                <div className="px-5 pb-4">
                    <div className="flex justify-between text-xs text-slate-400 dark:text-slate-400 mb-1">
                        <span>התקדמות לרמה {levelInfo.level + 1}</span>
                        <span>{levelInfo.xpToNext} XP נותרו</span>
                    </div>
                    <div className="h-2.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${levelInfo.progress}%` }}
                        />
                    </div>
                </div>

                {/* Contributions Stats */}
                <div className="mx-5 mb-4 p-4 bg-white/5/50 rounded-xl border border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-slate-800 dark:text-white">{user.contributionsCount || 0}</div>
                                <div className="text-xs text-slate-400">תרומות למילון</div>
                            </div>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                            הצטרף ב-{new Date(user.joinedAt).toLocaleDateString('he-IL')}
                        </div>
                    </div>
                </div>

                {/* Edit Profile Collapsible */}
                <div className="border-t border-white/10">
                    <button
                        onClick={() => setShowEditSection(!showEditSection)}
                        className="w-full p-4 flex items-center justify-between text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <span className="flex items-center gap-2 font-medium">
                            <Edit3 size={18} />
                            עריכת פרטים אישיים
                        </span>
                        {showEditSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>

                    {showEditSection && (
                        <form onSubmit={handleSubmit} className="p-5 pt-0 space-y-4 animate-in slide-in-from-top-2">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שם מלא</label>
                                <div className="relative">
                                    <UserIcon className="absolute right-3 top-3 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-white/10 bg-[#0d1424]/60 backdrop-blur-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שינוי סיסמה (אופציונלי)</label>
                                <div className="space-y-3">
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="password"
                                            placeholder="סיסמה חדשה"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-white/10 bg-[#0d1424]/60 backdrop-blur-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-3 text-slate-400" size={18} />
                                        <input
                                            type="password"
                                            placeholder="אימות סיסמה חדשה"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-white/10 bg-[#0d1424]/60 backdrop-blur-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                                        />
                                    </div>
                                </div>
                            </div>

                            {status === 'success' && (
                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-300 text-sm rounded-lg">
                                    <CheckCircle size={16} />
                                    {feedback}
                                </div>
                            )}

                            {status === 'error' && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm rounded-lg">
                                    <AlertCircle size={16} />
                                    {feedback}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                {loading ? 'שומר...' : 'שמור שינויים'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
            </FocusTrap>
        </div>
    );
};

export default ProfileModal;
