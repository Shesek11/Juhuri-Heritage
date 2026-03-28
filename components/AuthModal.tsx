import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import FocusTrap from 'focus-trap-react';
import { X, Mail, Lock, User as UserIcon, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { User } from '../types';

const GOOGLE_CLIENT_ID = '471499434690-a0q7daito126hiubeu7djqkb71liq3k6.apps.googleusercontent.com';
const FACEBOOK_APP_ID = '965034572712127';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (user: User) => void;
    reason?: string;
}

/** Load the GIS script once */
function loadGisScript(): Promise<void> {
    return new Promise((resolve) => {
        if ((window as any).google?.accounts?.id) {
            resolve();
            return;
        }
        if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
            const check = setInterval(() => {
                if ((window as any).google?.accounts?.id) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(() => { clearInterval(check); resolve(); }, 5000);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            const check = setInterval(() => {
                if ((window as any).google?.accounts?.id) {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
            setTimeout(() => { clearInterval(check); resolve(); }, 3000);
        };
        script.onerror = () => resolve();
        document.head.appendChild(script);
    });
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, reason }) => {
    const t = useTranslations('auth');
    const tc = useTranslations('common');
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [showEmailForm, setShowEmailForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const googleBtnRef = useRef<HTMLDivElement>(null);

    // Form fields
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // Handle Google credential response (from One Tap or button)
    const handleGoogleCredential = useCallback(async (response: any) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/google/credential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ credential: response.credential }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('googleError'));

            if (onSuccess && data.user) {
                onSuccess(data.user);
            }
            onClose();
            window.location.reload();
        } catch (err: any) {
            if (process.env.NODE_ENV === 'development') console.error('Google auth error:', err);
            setError(err.message || t('googleError'));
        } finally {
            setLoading(false);
        }
    }, [onSuccess, onClose]);

    // Handle Facebook login via JS SDK popup
    const handleFacebookLogin = useCallback(async () => {
        setError('');

        // Load and init FB SDK
        const getFB = (): Promise<any> => new Promise((resolve) => {
            if ((window as any).FB) {
                resolve((window as any).FB);
                return;
            }

            (window as any).fbAsyncInit = function () {
                (window as any).FB.init({
                    appId: FACEBOOK_APP_ID,
                    cookie: true,
                    xfbml: false,
                    version: 'v21.0',
                });
                resolve((window as any).FB);
            };

            if (!document.getElementById('facebook-jssdk')) {
                const script = document.createElement('script');
                script.id = 'facebook-jssdk';
                script.src = 'https://connect.facebook.net/en_US/sdk.js';
                script.async = true;
                script.onerror = () => resolve(null);
                document.head.appendChild(script);
            } else {
                // Script exists but FB not ready yet — poll
                const check = setInterval(() => {
                    if ((window as any).FB) {
                        clearInterval(check);
                        (window as any).FB.init({
                            appId: FACEBOOK_APP_ID,
                            cookie: true,
                            xfbml: false,
                            version: 'v21.0',
                        });
                        resolve((window as any).FB);
                    }
                }, 100);
                setTimeout(() => { clearInterval(check); resolve(null); }, 5000);
            }
        });

        const FB = await getFB();
        if (!FB) {
            // Fallback to redirect flow
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/api/auth/facebook?returnTo=${returnTo}`;
            return;
        }

        FB.login((response: any) => {
            if (response.authResponse?.accessToken) {
                setLoading(true);
                fetch('/api/auth/facebook/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ accessToken: response.authResponse.accessToken }),
                })
                    .then(res => res.json().then(data => ({ ok: res.ok, data })))
                    .then(({ ok, data }) => {
                        if (!ok) throw new Error(data.error || t('facebookError'));
                        if (onSuccess && data.user) onSuccess(data.user);
                        onClose();
                        window.location.reload();
                    })
                    .catch((err: any) => {
                        if (process.env.NODE_ENV === 'development') console.error('Facebook auth error:', err);
                        setError(err.message || t('facebookError'));
                    })
                    .finally(() => setLoading(false));
            } else {
                // User cancelled or denied
                console.log('Facebook login cancelled or denied');
            }
        }, { scope: 'email,public_profile' });
    }, [onSuccess, onClose]);

    // Initialize GIS when modal opens
    useEffect(() => {
        if (!isOpen || showEmailForm) return;

        let cancelled = false;

        const init = async () => {
            await loadGisScript();
            if (cancelled) return;

            const google = (window as any).google;
            if (!google?.accounts?.id) return;

            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredential,
                auto_select: false,
                cancel_on_tap_outside: false,
            });

            // Render the personalized button
            if (googleBtnRef.current) {
                // Clear previous button content safely
                while (googleBtnRef.current.firstChild) {
                    googleBtnRef.current.removeChild(googleBtnRef.current.firstChild);
                }
                google.accounts.id.renderButton(googleBtnRef.current, {
                    type: 'standard',
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    width: googleBtnRef.current.offsetWidth || 320,
                    locale: 'he',
                });
            }
        };

        init();
        return () => { cancelled = true; };
    }, [isOpen, showEmailForm, handleGoogleCredential]);

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
                throw new Error(data.error || t('loginError'));
            }

            if (onSuccess && data.user) {
                onSuccess(data.user);
            }
            onClose();
            window.location.reload();

        } catch (err: any) {
            if (process.env.NODE_ENV === 'development') console.error('Auth error:', err);
            setError(err.message || t('loginError'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-rubik"
            onClick={onClose}
        >
            <FocusTrap focusTrapOptions={{ allowOutsideClick: true, escapeDeactivates: true }}>
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="auth-modal-title"
                className="bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10 relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex border-b border-white/10 relative bg-white/5/50">
                    <h3 id="auth-modal-title" className="flex-1 py-4 text-center font-bold text-slate-700 dark:text-slate-200">
                        {mode === 'login' ? t('loginTitle') : t('registerTitle')}
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
                            <p className="text-sm text-slate-400 dark:text-slate-400 mb-6">
                                {t('socialDescription')}
                            </p>

                            <div className="space-y-3">
                                {/* Google Sign In button — rendered by GIS */}
                                <div
                                    ref={googleBtnRef}
                                    className="flex justify-center min-h-[44px]"
                                />

                                {/* Facebook Login button */}
                                <button
                                    onClick={handleFacebookLogin}
                                    disabled={loading}
                                    className="w-full py-2.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-lg flex items-center justify-center gap-3 font-medium transition-all shadow-sm disabled:opacity-50"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                    </svg>
                                    {t('continueWithFacebook')}
                                </button>
                            </div>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-[#0d1424]/60 backdrop-blur-xl text-slate-400">{tc('or')}</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowEmailForm(true)}
                                className="w-full py-2.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                <Mail size={18} />
                                {mode === 'login' ? t('emailLogin') : t('emailRegister')}
                            </button>
                        </div>
                    ) : (
                        /* Email/Password Form */
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <button
                                type="button"
                                onClick={() => setShowEmailForm(false)}
                                className="text-sm text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 mb-2"
                            >
                                {t('backToOptions')}
                            </button>

                            {mode === 'register' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        {t('fullName')}
                                    </label>
                                    <div className="relative">
                                        <UserIcon size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('fullNamePlaceholder')}
                                            className="w-full ps-10 pe-4 py-2.5 border border-white/10 rounded-lg bg-white/5 backdrop-blur-sm text-amber-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {t('email')}
                                </label>
                                <div className="relative">
                                    <Mail size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="w-full ps-10 pe-4 py-2.5 border border-white/10 rounded-lg bg-white/5 backdrop-blur-sm text-amber-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        required
                                        dir="ltr"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    {t('password')}
                                </label>
                                <div className="relative">
                                    <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="********"
                                        className="w-full ps-10 pe-4 py-2.5 border border-white/10 rounded-lg bg-white/5 backdrop-blur-sm text-amber-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                        required
                                        minLength={6}
                                        dir="ltr"
                                        autoComplete="current-password"
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
                                        {t('loginButton')}
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        {t('registerButton')}
                                    </>
                                )}
                            </button>

                            <p className="text-center text-sm text-slate-400 dark:text-slate-400">
                                {mode === 'login' ? (
                                    <>
                                        {t('noAccount')}{' '}
                                        <button
                                            type="button"
                                            onClick={() => setMode('register')}
                                            className="text-indigo-600 hover:underline font-medium"
                                        >
                                            {t('registerNow')}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        {t('hasAccount')}{' '}
                                        <button
                                            type="button"
                                            onClick={() => setMode('login')}
                                            className="text-indigo-600 hover:underline font-medium"
                                        >
                                            {t('loginNow')}
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
            </FocusTrap>
        </div>
    );
};

export default AuthModal;
