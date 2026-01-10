
import React, { useState, useEffect } from 'react';
import { X, User as UserIcon, Lock, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { updateUser } from '../services/authService';
import { User } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdate: (updatedUser: User) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user, onUpdate }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (isOpen && user) {
        setName(user.name);
        setPassword('');
        setConfirmPassword('');
        setStatus('idle');
        setFeedback('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    setFeedback('');

    // Validation
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

        const updatedUser = updateUser(user.id, updates);
        onUpdate(updatedUser);
        
        setStatus('success');
        setFeedback('הפרטים עודכנו בהצלחה!');
        
        setTimeout(() => {
            onClose();
        }, 1500);

    } catch (err) {
        setStatus('error');
        setFeedback('אירעה שגיאה בעדכון הפרטים.');
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
        <div className="flex border-b border-slate-200 dark:border-slate-700 p-4 justify-between items-center bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <UserIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
                פרופיל אישי
            </h3>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400">
                <X size={20} />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שם מלא</label>
                <div className="relative">
                    <UserIcon className="absolute right-3 top-3 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">שינוי סיסמה (אופציונלי)</label>
                <div className="space-y-3">
                    <div className="relative">
                        <Lock className="absolute right-3 top-3 text-slate-400" size={18} />
                        <input 
                            type="password" 
                            placeholder="סיסמה חדשה"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
                        />
                    </div>
                    <div className="relative">
                        <Lock className="absolute right-3 top-3 text-slate-400" size={18} />
                        <input 
                            type="password" 
                            placeholder="אימות סיסמה חדשה"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pr-10 pl-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-400"
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
      </div>
    </div>
  );
};

export default ProfileModal;
