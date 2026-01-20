import React, { useState, useEffect } from 'react';
import { X, Languages, Loader2, Send } from 'lucide-react';
import apiService from '../services/apiService';

interface TranslationModalProps {
    entryId: number;
    term: string;
    onClose: () => void;
    onSuccess: () => void;
}

const TranslationModal: React.FC<TranslationModalProps> = ({ entryId, term, onClose, onSuccess }) => {
    const [dialects, setDialects] = useState<{ id: number; name: string; description?: string }[]>([]);
    const [selectedDialect, setSelectedDialect] = useState('General');
    const [hebrew, setHebrew] = useState('');
    const [latin, setLatin] = useState('');
    const [cyrillic, setCyrillic] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch dialects
        apiService.get<{ dialects: { id: number; name: string; description?: string }[] }>('/dialects')
            .then(res => setDialects(res.dialects || []))
            .catch(() => setDialects([{ id: 6, name: 'General', description: 'כללי (ללא ניב ספציפי)' }]));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hebrew.trim()) {
            setError('חובה להזין תרגום בעברית');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await apiService.post(`/dictionary/entries/${entryId}/suggest`, {
                dialect: selectedDialect,
                hebrew: hebrew.trim(),
                latin: latin.trim(),
                cyrillic: cyrillic.trim(),
                reason: reason.trim()
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'שגיאה בשליחת התרגום');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-rubik">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white flex justify-between items-center">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Languages size={24} />
                        תרגום מילה: {term}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            ניב
                        </label>
                        <select
                            value={selectedDialect}
                            onChange={(e) => setSelectedDialect(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                        >
                            {dialects.map(d => (
                                <option key={d.id} value={d.name}>
                                    {d.description || (d.name === 'General' ? 'כללי (ללא ניב ספציפי)' : d.name)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            תרגום בעברית *
                        </label>
                        <input
                            type="text"
                            value={hebrew}
                            onChange={(e) => setHebrew(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                            placeholder="הזן תרגום בעברית..."
                            dir="rtl"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                תעתיק לטיני
                            </label>
                            <input
                                type="text"
                                value={latin}
                                onChange={(e) => setLatin(e.target.value)}
                                className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                placeholder="Latin..."
                                dir="ltr"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                                קירילית
                            </label>
                            <input
                                type="text"
                                value={cyrillic}
                                onChange={(e) => setCyrillic(e.target.value)}
                                className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                placeholder="Кириллица..."
                                dir="ltr"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                            הערות (אופציונלי)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full p-2.5 border rounded-lg dark:bg-slate-900 dark:border-slate-600 dark:text-white resize-none"
                            rows={2}
                            placeholder="מקור המידע, הערות נוספות..."
                            dir="rtl"
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-700 dark:text-slate-300 transition-colors font-medium"
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !hebrew.trim()}
                            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg flex justify-center items-center gap-2 transition-colors font-medium disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin" size={18} /> שולח...</>
                            ) : (
                                <><Send size={18} /> שלח לאישור</>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-slate-400 text-center">
                        התרגום יישלח לאישור מנהלים לפני הוספה למאגר
                    </p>
                </form>
            </div>
        </div>
    );
};

export default TranslationModal;
