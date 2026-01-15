import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, LogIn, UserPlus, Loader2, AlertCircle, Facebook, Instagram, Video } from 'lucide-react';
import { useAuth0 } from '@auth0/auth0-react';
import { User } from '../types';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (user: User) => void;
    reason?: string; // Optional reason explaining why login is required
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, reason }) => {
    const { loginWithPopup, loginWithRedirect } = useAuth0();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Handle ESC key press
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSocialLogin = async (connection: string) => {
        setLoading(true);
        setError('');
        try {
            await loginWithPopup({
                authorizationParams: { connection }
            });
            onClose();
            if (onSuccess) {
                // onSuccess will be handled by the main App's useEffect that watches isAuthenticated
            }
        } catch (err: any) {
            console.error("Login failed", err);
            setError('ההתחברות נכשלה או בוטלה.');
            // Fallback: If popup fails (browsers block it sometimes), suggest redirect
            // loginWithRedirect({ authorizationParams: { connection } });
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
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex border-b border-slate-200 dark:border-slate-700 relative bg-slate-50 dark:bg-slate-900/50">
                    <h3 className="flex-1 py-4 text-center font-bold text-slate-700 dark:text-slate-200">
                        {mode === 'login' ? 'כניסה למערכת' : 'הרשמה מהירה'}
                    </h3>
                    <button onClick={onClose} className="absolute top-3 left-4 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 z-10">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-4">
                    <div className="text-center mb-6">
                        {reason ? (
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg mb-4">
                                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                                    {reason}
                                </p>
                            </div>
                        ) : null}
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            התחבר בקלות באמצעות החשבונות הקיימים שלך
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleSocialLogin('google-oauth2')}
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

                            <button
                                onClick={() => handleSocialLogin('facebook')}
                                className="w-full py-2.5 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg flex items-center justify-center gap-3 font-medium transition-all shadow-sm"
                            >
                                <Facebook size={20} fill="currentColor" />
                                המשך עם Facebook
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleSocialLogin('instagram')}
                                    className="py-2.5 px-4 bg-gradient-to-tr from-[#FD1D1D] to-[#833AB4] hover:opacity-90 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-sm"
                                >
                                    <Instagram size={20} />
                                    Instagram
                                </button>
                                <button
                                    onClick={() => handleSocialLogin('tiktok')}
                                    className="py-2.5 px-4 bg-black hover:bg-gray-900 text-white rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-sm"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 1 0 7.75 6.16V9.67a6.62 6.62 0 0 0 2.53 1.6v-3.6a4.8 4.8 0 0 1-1.05-1.01z" /></svg>
                                    TikTok
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-xs rounded-lg animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">או</span>
                        </div>
                    </div>

                    <button
                        onClick={() => loginWithPopup()} // Default generic auth
                        className="w-full py-2.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                    >
                        אפשרויות נוספות (אימייל / סיסמה)
                    </button>

                    {loading && (
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
