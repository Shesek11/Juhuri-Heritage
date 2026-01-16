import React, { useState } from 'react';
import { CreateMemberInput, familyService } from '../../services/familyService';
import { User, X, Check, Loader2, Upload } from 'lucide-react';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<CreateMemberInput>({
        first_name: '',
        last_name: '',
        maiden_name: '',
        nickname: '',
        previous_name: '',
        title: '',
        gender: 'male',
        is_alive: true,
        birth_date: '',
        death_date: '',
        birth_place: '',
        death_place: '',
        biography: '',
        photo_url: '',
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await familyService.createMember(formData);
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            alert('שגיאה ביצירת בן משפחה');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/20">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <User className="text-emerald-600" size={20} />
                        הוספת בן משפחה
                    </h2>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                        {/* Profile Photo */}
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600 relative group">
                                {formData.photo_url ? (
                                    <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={40} className="text-slate-400" />
                                )}

                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Upload className="text-white" size={24} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            const uploadData = new FormData();
                                            uploadData.append('file', file);

                                            try {
                                                const token = localStorage.getItem('token');
                                                const res = await fetch('/api/upload', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Authorization': `Bearer ${token}`
                                                    },
                                                    body: uploadData
                                                });
                                                const data = await res.json();
                                                if (data.success) {
                                                    setFormData({ ...formData, photo_url: data.url });
                                                } else {
                                                    alert(data.error || 'שגיאה בהעלאת התמונה');
                                                }
                                            } catch (err) {
                                                console.error('Upload failed', err);
                                                alert('שגיאת רשת בהעלאת התמונה');
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">תמונת פרופיל</h3>
                                <p className="text-sm text-slate-500">לחץ על העיגול להעלאת תמונה.</p>
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium mb-1">תואר</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="ד&quot;ר, רב, עו&quot;ד..."
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                            />
                        </div>

                        {/* First & Last Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">שם פרטי *</label>
                                <input
                                    required
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">שם משפחה *</label>
                                <input
                                    required
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                        </div>

                        {/* Maiden Name & Nickname */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">שם נעורים</label>
                                <input
                                    value={formData.maiden_name}
                                    onChange={e => setFormData({ ...formData, maiden_name: e.target.value })}
                                    placeholder="שם משפחה לפני נישואין"
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">כינוי</label>
                                <input
                                    value={formData.nickname}
                                    onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                    placeholder="כינוי משפחתי"
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                        </div>

                        {/* Previous Name */}
                        <div>
                            <label className="block text-sm font-medium mb-1">שם קודם</label>
                            <input
                                value={formData.previous_name}
                                onChange={e => setFormData({ ...formData, previous_name: e.target.value })}
                                placeholder="במקרה של שינוי שם"
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                            />
                        </div>

                        {/* Gender & Is Alive */}
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">מין</label>
                                <select
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                >
                                    <option value="male">זכר</option>
                                    <option value="female">נקבה</option>
                                    <option value="other">אחר</option>
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium mb-1">חי?</label>
                                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_alive: true })}
                                        className={`flex-1 text-sm py-1.5 rounded-md transition-all ${formData.is_alive ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-slate-500'}`}
                                    >
                                        כן
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, is_alive: false })}
                                        className={`flex-1 text-sm py-1.5 rounded-md transition-all ${!formData.is_alive ? 'bg-white dark:bg-slate-600 shadow text-slate-800' : 'text-slate-500'}`}
                                    >
                                        לא
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">תאריך לידה</label>
                                <input
                                    type="date"
                                    value={formData.birth_date}
                                    onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                            {!formData.is_alive && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">תאריך פטירה</label>
                                    <input
                                        type="date"
                                        value={formData.death_date}
                                        onChange={e => setFormData({ ...formData, death_date: e.target.value })}
                                        className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Places */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">מקום לידה</label>
                                <input
                                    value={formData.birth_place}
                                    onChange={e => setFormData({ ...formData, birth_place: e.target.value })}
                                    placeholder="עיר, מדינה"
                                    className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                />
                            </div>
                            {!formData.is_alive && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">מקום פטירה</label>
                                    <input
                                        value={formData.death_place}
                                        onChange={e => setFormData({ ...formData, death_place: e.target.value })}
                                        className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Biography */}
                        <div>
                            <label className="block text-sm font-medium mb-1">ביוגרפיה קצרה</label>
                            <textarea
                                value={formData.biography}
                                onChange={e => setFormData({ ...formData, biography: e.target.value })}
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 h-20"
                                placeholder="סיפור חיים קצר..."
                            />
                        </div>
                    </div>
                </form>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg">ביטול</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                        הוסף
                    </button>
                </div>
            </div>
        </div>
    );
};
