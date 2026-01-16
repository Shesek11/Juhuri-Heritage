import React, { useState, useEffect } from 'react';
import { CreateMemberInput, familyService, ParentChildType, PartnershipStatus } from '../../services/familyService';
import { User, X, Check, Loader2, Upload, Users, Baby, Heart, UserPlus } from 'lucide-react';

interface AddRelativeModalProps {
    isOpen: boolean;
    relativeTo: {
        id: number;
        first_name: string;
        last_name: string;
    } | null;
    relationType?: 'parent' | 'child' | 'spouse' | null;
    onClose: () => void;
    onSuccess: () => void;
}

const PARENT_CHILD_TYPES: { value: ParentChildType; label: string }[] = [
    { value: 'biological', label: 'ביולוגי' },
    { value: 'adopted', label: 'מאומץ' },
    { value: 'foster', label: 'אומנה' },
    { value: 'step', label: 'חורג' },
];

const PARTNERSHIP_STATUSES: { value: PartnershipStatus; label: string }[] = [
    { value: 'married', label: 'נשואים' },
    { value: 'divorced', label: 'גרושים' },
    { value: 'widowed', label: 'אלמנים' },
    { value: 'common_law', label: 'ידועים בציבור' },
    { value: 'separated', label: 'פרודים' },
    { value: 'engaged', label: 'מאורסים' },
];

export const AddRelativeModal: React.FC<AddRelativeModalProps> = ({
    isOpen,
    relativeTo,
    relationType,
    onClose,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [activeType, setActiveType] = useState<'parent' | 'child' | 'spouse'>('child');
    const [relationshipSubType, setRelationshipSubType] = useState<ParentChildType>('biological');
    const [partnershipStatus, setPartnershipStatus] = useState<PartnershipStatus>('married');
    const [partnershipDate, setPartnershipDate] = useState('');

    const [formData, setFormData] = useState<CreateMemberInput>({
        first_name: '',
        last_name: relativeTo?.last_name || '',
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

    useEffect(() => {
        if (isOpen && relationType) {
            setActiveType(relationType);
        }
    }, [isOpen, relationType]);

    // Reset form when modal opens with new relativeTo
    useEffect(() => {
        if (relativeTo) {
            setFormData(prev => ({
                ...prev,
                last_name: relativeTo.last_name || '',
                first_name: '',
            }));
        }
    }, [relativeTo]);

    if (!isOpen || !relativeTo) return null;

    const getTitle = () => {
        switch (activeType) {
            case 'parent': return `הוספת הורה ל${relativeTo.first_name}`;
            case 'child': return `הוספת ילד/ה ל${relativeTo.first_name}`;
            case 'spouse': return `הוספת בן/בת זוג ל${relativeTo.first_name}`;
        }
    };

    const getIcon = () => {
        switch (activeType) {
            case 'parent': return <Users className="text-blue-600" size={20} />;
            case 'child': return <Baby className="text-green-600" size={20} />;
            case 'spouse': return <Heart className="text-pink-600" size={20} />;
        }
    };

    const getColor = () => {
        switch (activeType) {
            case 'parent': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-100';
            case 'child': return 'bg-green-50 dark:bg-green-900/20 border-green-100';
            case 'spouse': return 'bg-pink-50 dark:bg-pink-900/20 border-pink-100';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Step 1: Create the new member
            const result = await familyService.createMember(formData);
            const newMemberId = result.id;

            // Step 2: Create the relationship
            if (activeType === 'parent') {
                // New person is parent of relativeTo
                await familyService.addParentChild({
                    parent_id: newMemberId,
                    child_id: relativeTo.id,
                    relationship_type: relationshipSubType
                });
            } else if (activeType === 'child') {
                // relativeTo is parent of new person
                await familyService.addParentChild({
                    parent_id: relativeTo.id,
                    child_id: newMemberId,
                    relationship_type: relationshipSubType
                });
            } else if (activeType === 'spouse') {
                await familyService.addPartnership({
                    person1_id: relativeTo.id,
                    person2_id: newMemberId,
                    status: partnershipStatus,
                    start_date: partnershipDate || undefined
                });
            }

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
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" dir="rtl" onClick={e => e.stopPropagation()}>

                {/* Header with Type Selector */}
                <div className={`p-4 border-b ${getColor()}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            {getIcon()}
                            {getTitle()}
                        </h2>
                        <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                    </div>

                    <div className="flex bg-white/50 dark:bg-black/20 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveType('parent')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeType === 'parent' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                            <Users size={16} /> הורה
                        </button>
                        <button
                            onClick={() => setActiveType('spouse')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeType === 'spouse' ? 'bg-white shadow text-pink-600' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                            <Heart size={16} /> בן/ת זוג
                        </button>
                        <button
                            onClick={() => setActiveType('child')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${activeType === 'child' ? 'bg-white shadow text-green-600' : 'text-slate-500 hover:bg-white/50'}`}
                        >
                            <Baby size={16} /> ילד/ה
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                    {/* Relationship Type Selection */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl space-y-3 border border-slate-100 dark:border-slate-700">
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">פרטי הקשר:</div>

                        {(activeType === 'parent' || activeType === 'child') && (
                            <div className="flex flex-wrap gap-2">
                                {PARENT_CHILD_TYPES.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setRelationshipSubType(type.value)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${relationshipSubType === type.value
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {activeType === 'spouse' && (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    {PARTNERSHIP_STATUSES.map(status => (
                                        <button
                                            key={status.value}
                                            type="button"
                                            onClick={() => setPartnershipStatus(status.value)}
                                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${partnershipStatus === status.value
                                                    ? 'bg-pink-600 text-white border-pink-600'
                                                    : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-200 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>
                                <div>
                                    <label className="block text-xs font-medium mb-1">תאריך נישואין</label>
                                    <input
                                        type="date"
                                        value={partnershipDate}
                                        onChange={e => setPartnershipDate(e.target.value)}
                                        className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Profile Photo */}
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600 relative group shrink-0">
                            {formData.photo_url ? (
                                <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <User size={32} className="text-slate-400" />
                            )}
                            <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <Upload className="text-white" size={20} />
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
                                                headers: { 'Authorization': `Bearer ${token}` },
                                                body: uploadData
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                setFormData({ ...formData, photo_url: data.url });
                                            } else {
                                                alert(data.error || 'שגיאה בהעלאת התמונה');
                                            }
                                        } catch (err) {
                                            alert('שגיאת רשת בהעלאת התמונה');
                                        }
                                    }}
                                />
                            </label>
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">תמונת פרופיל</h3>
                            <p className="text-xs text-slate-500 mb-2">לחץ על העיגול כדי להעלות תמונה</p>

                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-medium mb-1">מין</label>
                                    <select
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                        className="w-full p-1.5 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                    >
                                        <option value="male">זכר</option>
                                        <option value="female">נקבה</option>
                                        <option value="other">אחר</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-medium mb-1">חי?</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg h-[34px]">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_alive: true })}
                                            className={`flex-1 text-xs rounded-md transition-all ${formData.is_alive ? 'bg-white dark:bg-slate-600 shadow text-emerald-600 font-bold' : 'text-slate-500'}`}
                                        >
                                            כן
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_alive: false })}
                                            className={`flex-1 text-xs rounded-md transition-all ${!formData.is_alive ? 'bg-white dark:bg-slate-600 shadow text-slate-800 font-bold' : 'text-slate-500'}`}
                                        >
                                            לא
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">שם פרטי *</label>
                            <input
                                required
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">שם משפחה *</label>
                            <input
                                required
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">כינוי</label>
                            <input
                                value={formData.nickname}
                                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">שם נעורים</label>
                            <input
                                value={formData.maiden_name}
                                onChange={e => setFormData({ ...formData, maiden_name: e.target.value })}
                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                            />
                        </div>
                    </div>

                    {/* Birth Date */}
                    <div>
                        <label className="block text-xs font-medium mb-1">תאריך לידה</label>
                        <input
                            type="date"
                            value={formData.birth_date}
                            onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                            className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                        />
                    </div>
                </form>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg text-sm transition-colors">ביטול</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.first_name || !formData.last_name}
                        className="bg-slate-800 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700 disabled:opacity-50 text-sm transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                        צור וחבר למשפחה
                    </button>
                </div>
            </div>
        </div>
    );
};
