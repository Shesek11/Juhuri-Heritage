
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User as UserIcon, LogIn, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { login, register } from '../services/authService';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (isOpen) {
        window.addEventListener('keydown', handleEsc);
    }

    return () => {
        window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let user: User;
      if (mode === 'login') {
        user = await login(email, password);
      } else {
        if (!name.trim()) throw new Error('נא להזין שם מלא');
        user = await register(name, email, password);
      }
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'אירעה שגיאה. נסה שנית.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-rubik"
        onClick={onClose} // Close when clicking the overlay
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        
        {/* Header Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 relative">
            <button 
                onClick={() => { setMode('login'); setError(''); }}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'login' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500'}`}
            >
                התחברות
            </button>
            <button 
                onClick={() => { setMode('register'); setError(''); }}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${mode === 'register' ? 'bg-white dark:bg-slate-800 text-indigo-600 border-b-2 border-indigo-600' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-500'}`}
            >
                הרשמה
            </button>
            <button onClick={onClose} className="absolute top-4 left-4 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 z-10">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
            <div className="text-center mb-6">
                <div className="inline-block p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 mb-2">
                    {mode === 'login' ? <LogIn size={28} /> : <UserPlus size={28} />}
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {mode === 'login' ? 'ברוכים השבים!' : 'הצטרפו לקהילה'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {mode === 'login' ? 'הכנס לניהול התקדמות אישית' : 'צור חשבון כדי לתרום ולעקוב אחרי הלמידה'}
                </p>
            </div>

            {mode === 'register' && (
                <div className="relative">
                    <UserIcon className="absolute right-3 top-3 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="שם מלא"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            )}

            <div className="relative">
                <Mail className="absolute right-3 top-3 text-slate-400" size={18} />
                <input 
                    type="email" 
                    placeholder="כתובת אימייל"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>

            <div className="relative">
                <Lock className="absolute right-3 top-3 text-slate-400" size={18} />
                <input 
                    type="password" 
                    placeholder="סיסמה"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
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
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70"
            >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (mode === 'login' ? 'כניסה' : 'הרשמה')}
            </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
