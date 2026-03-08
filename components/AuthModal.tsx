import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (user: User) => void;
    reason?: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, reason }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // Handle ESC key press
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setEmail('');
            setPassword('');
            setName('');
            setError('');
            setShowEmailForm(false);
            setMode('login');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleGoogleLogin = () => {
        // Redirect to backend Passport.js Google OAuth
        const baseUrl = window.location.origin.includes('localhost')
            ? 'http://localhost:3002'
            : '';
        window.location.href = `${baseUrl}/api/auth/google`;
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const body = mode === 'login'
                ? { email, password }
                : { email, password, name };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'שגיאה בהתחברות');
            }

            // Success - call onSuccess with user data and close modal
            if (onSuccess && data.user) {
                onSuccess(data.user);
            }
            onClose();
            // Reload page to refresh auth state
            window.location.reload();

        } catch (err: any) {
            console.error('Auth error:', err);
            setError(err.message || 'שגיאה בהתחברות');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-rubik"
            onClick={onClose}
        >
            <div
                className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex border-b border-white/10 relative bg-white/5/50">
                    <h3 className="flex-1 py-4 text-center font-bold text-slate-700 dark:text-slate-200">
                        {mode === 'login' ? 'כניסה למערכת' : 'הרשמה מהירה'}
                    </h3>
                    <button onClick={onClose} className="absolute top-3 left-4 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 z-10">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-4">
                    {reason && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg mb-4">
                            <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                                {reason}
                            </p>
                        </div>
                    )}

                    {!showEmailForm ? (
                        /* Social Login Options */
                        <div className="text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                התחבר בקלות באמצעות החשבונות הקיימים שלך
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleGoogleLogin}
                                    className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg flex items-center justify-center gap-3 font-medium transition-all shadow-sm"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.17c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.56z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    </svg>
                                    המשך עם Google
                                </button>
                            </div>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-[#0d1424]/60 backdrop-blur-xl text-slate-500">או</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowEmailForm(true)}
                                className="w-full py-2.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Mail size={18} />
                                {mode === 'login' ? 'התחבר עם אימייל וסיסמה' : 'הירשם עם אימייל וסיסמה'}
                            </button>
                        </div>
                    ) : (
                        /* Email/Password Form */
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <button
                                type="button"
                                onClick={() => setShowEmailForm(false)}
                                className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-2"
                            >
                                ← חזרה לאפשרויות
                            </button>

                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        שם מלא
                                    </label>
                                    <div className="relative">
                                        <UserIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="השם שלך"
                                            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    אימייל
                                </label>
                                <div className="relative">
                                    <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full pr-10 pl-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        required
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    סיסמה
                                </label>
                                <div className="relative">
                                    <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="********"
                                        className="w-full pr-10 pl-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        required
                                        minLength={6}
                                        dir="ltr"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs rounded-lg">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="animate-spin" size={20} />
                                ) : mode === 'login' ? (
                                    <>
                                        <LogIn size={18} />
                                        התחבר
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        הירשם
                                    </>
                                )}
                            </button>

                            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                                {mode === 'login' ? (
                                    <>
                                        אין לך חשבון?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setMode('register')}
                                            className="text-indigo-600 hover:underline font-medium"
                                        >
                                            הירשם עכשיו
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        יש לך כבר חשבון?{' '}
                                        <button
                                            type="button"
                                            onClick={() => setMode('login')}
                                            className="text-indigo-600 hover:underline font-medium"
                                        >
                                            התחבר
                                        </button>
                                    </>
                                )}
                            </p>
                        </form>
                    )}

                    {loading && !showEmailForm && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 flex items-center justify-center rounded-2xl z-20">
                            <Loader2 className="animate-spin text-indigo-600" size={32} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
