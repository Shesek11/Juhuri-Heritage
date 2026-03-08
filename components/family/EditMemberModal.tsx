import React, { useState, useEffect } from 'react';
import { FamilyMember, familyService } from '../../services/familyService';
import { User, X, Check, Loader2, Upload, Pencil, UserPlus, Users, Baby, Heart, Trash2, AlertTriangle, Link, Sparkles } from 'lucide-react';

interface EditMemberModalProps {
    isOpen: boolean;
    member: FamilyMember | null;
    onClose: () => void;
    onSuccess: () => void;
    onAddRelative?: (type: 'parent' | 'child' | 'spouse') => void;
    potentialRelations?: FamilyMember[]; // List of all members for connection
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({ isOpen, member, onClose, onSuccess, onAddRelative, potentialRelations = [] }) => {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'connections'>('details');
    const isEditing = !!member?.id;
    const [formData, setFormData] = useState<Partial<FamilyMember>>({});

    // Duplicate detection state
    const [duplicates, setDuplicates] = useState<FamilyMember[]>([]);
    const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

    // Connection state
    const [parents, setParents] = useState<any[]>([]);
    const [children, setChildren] = useState<any[]>([]);
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [connectMode, setConnectMode] = useState<'none' | 'parent' | 'child' | 'spouse'>('none');
    const [selectedConnectId, setSelectedConnectId] = useState<number | ''>('');
    const [spouseStatus, setSpouseStatus] = useState<string>('married');
    const [parentChildType, setParentChildType] = useState<string>('biological');
    const [editingPartnership, setEditingPartnership] = useState<any | null>(null);

    // Language tab for details form
    const [langTab, setLangTab] = useState<'he' | 'ru'>('he');
    const [translating, setTranslating] = useState(false);

    const handleAITranslate = async () => {
        setTranslating(true);
        try {
            const direction = langTab === 'he' ? 'he-to-ru' : 'ru-to-he';
            const fields: Record<string, string> = {};

            if (direction === 'he-to-ru') {
                if (formData.first_name) fields.first_name = formData.first_name;
                if (formData.last_name) fields.last_name = formData.last_name;
                if (formData.maiden_name) fields.maiden_name = formData.maiden_name;
                if (formData.birth_city) fields.birth_city = formData.birth_city;
                if (formData.birth_country) fields.birth_country = formData.birth_country;
                if (formData.death_city) fields.death_city = formData.death_city;
                if (formData.death_country) fields.death_country = formData.death_country;
                if (formData.residence_city) fields.residence_city = formData.residence_city;
                if (formData.residence_country) fields.residence_country = formData.residence_country;
            } else {
                if (formData.first_name_ru) fields.first_name = formData.first_name_ru;
                if (formData.last_name_ru) fields.last_name = formData.last_name_ru;
                if (formData.maiden_name_ru) fields.maiden_name = formData.maiden_name_ru;
                if (formData.birth_city_ru) fields.birth_city = formData.birth_city_ru;
                if (formData.birth_country_ru) fields.birth_country = formData.birth_country_ru;
                if (formData.death_city_ru) fields.death_city = formData.death_city_ru;
                if (formData.death_country_ru) fields.death_country = formData.death_country_ru;
                if (formData.residence_city_ru) fields.residence_city = formData.residence_city_ru;
                if (formData.residence_country_ru) fields.residence_country = formData.residence_country_ru;
            }

            if (Object.keys(fields).length === 0) {
                alert(direction === 'he-to-ru' ? 'אין שדות עבריים למלא' : 'Нет полей для перевода');
                return;
            }

            const result = await familyService.transliterateNames(fields, direction);

            if (direction === 'he-to-ru') {
                setFormData(prev => ({
                    ...prev,
                    first_name_ru: result.first_name || prev.first_name_ru,
                    last_name_ru: result.last_name || prev.last_name_ru,
                    maiden_name_ru: result.maiden_name || prev.maiden_name_ru,
                    birth_city_ru: result.birth_city || prev.birth_city_ru,
                    birth_country_ru: result.birth_country || prev.birth_country_ru,
                    death_city_ru: result.death_city || prev.death_city_ru,
                    death_country_ru: result.death_country || prev.death_country_ru,
                    residence_city_ru: result.residence_city || prev.residence_city_ru,
                    residence_country_ru: result.residence_country || prev.residence_country_ru,
                }));
                setLangTab('ru');
            } else {
                setFormData(prev => ({
                    ...prev,
                    first_name: result.first_name || prev.first_name,
                    last_name: result.last_name || prev.last_name,
                    maiden_name: result.maiden_name || prev.maiden_name,
                    birth_city: result.birth_city || prev.birth_city,
                    birth_country: result.birth_country || prev.birth_country,
                    death_city: result.death_city || prev.death_city,
                    death_country: result.death_country || prev.death_country,
                    residence_city: result.residence_city || prev.residence_city,
                    residence_country: result.residence_country || prev.residence_country,
                }));
                setLangTab('he');
            }
        } catch (err) {
            console.error('AI translate error:', err);
            alert('שגיאה בתעתיק AI');
        } finally {
            setTranslating(false);
        }
    };

    useEffect(() => {
        // Always reset to details tab when modal opens
        setActiveTab('details');

        if (member) {
            setFormData({
                first_name: member.first_name || '',
                last_name: member.last_name || '',
                maiden_name: member.maiden_name || '',
                nickname: member.nickname || '',
                previous_name: member.previous_name || '',
                title: member.title || '',
                first_name_ru: member.first_name_ru || '',
                last_name_ru: member.last_name_ru || '',
                maiden_name_ru: member.maiden_name_ru || '',
                gender: member.gender || 'male',
                is_alive: member.is_alive ?? true,
                birth_date: member.birth_date?.split('T')[0] || '',
                death_date: member.death_date?.split('T')[0] || '',
                birth_place: member.birth_place || '',
                death_place: member.death_place || '',
                current_residence: member.current_residence || '',
                birth_city: member.birth_city || '',
                birth_country: member.birth_country || '',
                death_city: member.death_city || '',
                death_country: member.death_country || '',
                residence_city: member.residence_city || '',
                residence_country: member.residence_country || '',
                birth_city_ru: member.birth_city_ru || '',
                birth_country_ru: member.birth_country_ru || '',
                death_city_ru: member.death_city_ru || '',
                death_country_ru: member.death_country_ru || '',
                residence_city_ru: member.residence_city_ru || '',
                residence_country_ru: member.residence_country_ru || '',
                biography: member.biography || '',
                photo_url: member.photo_url || '',
            });
            fetchRelationships();
        } else {
            // Reset form for new member
            setFormData({
                gender: 'male',
                is_alive: true
            });
            setParents([]);
            setChildren([]);
            setPartnerships([]);
        }
    }, [member, isOpen]);

    // Detect duplicate names in real-time (only for new members)
    useEffect(() => {
        if (isEditing || !formData.first_name || !formData.last_name) {
            setDuplicates([]);
            setShowDuplicateWarning(false);
            return;
        }

        const firstName = formData.first_name.trim().toLowerCase();
        const lastName = formData.last_name.trim().toLowerCase();

        if (firstName.length < 2 || lastName.length < 2) {
            setDuplicates([]);
            setShowDuplicateWarning(false);
            return;
        }

        // Find similar names
        const similarMembers = potentialRelations.filter(m => {
            const mFirstName = (m.first_name || '').trim().toLowerCase();
            const mLastName = (m.last_name || '').trim().toLowerCase();

            // Exact match or very similar
            const firstNameMatch = mFirstName === firstName ||
                                   mFirstName.includes(firstName) ||
                                   firstName.includes(mFirstName);
            const lastNameMatch = mLastName === lastName ||
                                  mLastName.includes(lastName) ||
                                  lastName.includes(mLastName);

            return firstNameMatch && lastNameMatch;
        });

        setDuplicates(similarMembers);
        setShowDuplicateWarning(similarMembers.length > 0);
    }, [formData.first_name, formData.last_name, isEditing, potentialRelations]);

    const fetchRelationships = async () => {
        if (!member?.id) return;
        try {
            const [p, c, pt] = await Promise.all([
                familyService.getParents(member.id),
                familyService.getChildren(member.id),
                familyService.getPartnerships(member.id)
            ]);
            setParents(p);
            setChildren(c);
            setPartnerships(pt);
        } catch (error) {
            console.error('Failed to fetch relationships', error);
        }
    };

    const handleConnect = async () => {
        if (!member?.id || !selectedConnectId) return;
        // ... rest of handleConnect logic relies on member.id so we guard it
        setLoading(true);
        try {
            if (connectMode === 'parent') {
                await familyService.addParentChild({
                    parent_id: Number(selectedConnectId),
                    child_id: member.id,
                    relationship_type: parentChildType as any
                });
            } else if (connectMode === 'child') {
                await familyService.addParentChild({
                    parent_id: member.id,
                    child_id: Number(selectedConnectId),
                    relationship_type: parentChildType as any
                });
            } else if (connectMode === 'spouse') {
                await familyService.addPartnership({
                    person1_id: member.id,
                    person2_id: Number(selectedConnectId),
                    status: spouseStatus as any
                });
            }
            await fetchRelationships();
            setConnectMode('none');
            setSelectedConnectId('');
            setParentChildType('biological');
            setSpouseStatus('married');
            onSuccess(); // Refresh graph
        } catch (error) {
            console.error(error);
            alert('שגיאה בחיבור קרוב משפחה');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveRelationship = async (type: 'parent' | 'child' | 'spouse', id: number) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק קשר זה?')) return;
        setLoading(true);
        try {
            if (type === 'parent' || type === 'child') {
                await familyService.removeParentChild(id);
            } else {
                await familyService.removePartnership(id);
            }
            await fetchRelationships();
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('שגיאה במחיקת קשר');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMember = async () => {
        if (!member?.id) return;

        const confirmMessage = `האם אתה בטוח שברצונך למחוק את ${member.first_name} ${member.last_name}?\n\nפעולה זו תמחק את האדם וכל הקשרים שלו ולא ניתן לבטלה!`;
        if (!confirm(confirmMessage)) return;

        setLoading(true);
        try {
            await familyService.deleteMember(member.id);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.message || 'שגיאה במחיקת בן משפחה');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing && member) {
                await familyService.updateMember(member.id, formData);
            } else {
                await familyService.createMember(formData as any);
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'שגיאה בשמירת בן משפחה');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0d1424]/60 backdrop-blur-xl w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-amber-50 dark:bg-amber-900/20">
                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        {isEditing ? <Pencil className="text-amber-600" size={20} /> : <UserPlus className="text-amber-600" size={20} />}
                        {isEditing ? 'עריכת בן משפחה' : 'הוספת בן משפחה'}
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-3 py-1 rounded-full text-sm ${activeTab === 'details' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            פרטים
                        </button>
                        <button
                            onClick={() => setActiveTab('connections')}
                            className={`px-3 py-1 rounded-full text-sm ${activeTab === 'connections' ? 'bg-amber-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                        >
                            קשרי משפחה {!isEditing && <span className="text-xs opacity-75">(קשר לאדם קיים)</span>}
                        </button>
                        <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                    </div>
                </div>

                {activeTab === 'details' ? (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-4">
                            {/* Profile Photo */}
                            <div className="flex items-center gap-4">
                                <div className="w-24 h-24 rounded-full bg-white/10 overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-600 relative group">
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
                                    <h3 className="font-bold text-slate-200">תמונת פרופיל</h3>
                                    <p className="text-sm text-slate-500">לחץ על העיגול כדי להחליף תמונה.</p>
                                </div>
                            </div>

                            {/* Language Tabs: Hebrew / Russian - wraps ALL fields */}
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex bg-white/10 rounded-lg p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setLangTab('he')}
                                        className={`px-3 py-1 rounded-md text-sm transition-all ${langTab === 'he' ? 'bg-white dark:bg-slate-600 shadow text-amber-600 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        עברית
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLangTab('ru')}
                                        className={`px-3 py-1 rounded-md text-sm transition-all ${langTab === 'ru' ? 'bg-white dark:bg-slate-600 shadow text-amber-600 font-medium' : 'text-slate-500 dark:text-slate-400'}`}
                                    >
                                        Русский
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAITranslate}
                                    disabled={translating}
                                    className="flex items-center gap-1 px-2.5 py-1 bg-violet-100 text-violet-700 rounded-lg text-xs font-medium hover:bg-violet-200 transition-colors disabled:opacity-50"
                                    title={langTab === 'he' ? 'תרגם לרוסית עם AI' : 'Перевести на иврит с AI'}
                                >
                                    {translating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    {langTab === 'he' ? 'תרגם → RU' : 'Перевести → HE'}
                                </button>
                            </div>

                            {langTab === 'he' ? (
                                /* ===== HEBREW TAB ===== */
                                <div className="space-y-4" dir="rtl">
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

                                    {/* Duplicate Detection Warning */}
                                    {showDuplicateWarning && duplicates.length > 0 && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 rounded-lg p-4 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-1">
                                                        נמצאו {duplicates.length} {duplicates.length === 1 ? 'אדם דומה' : 'אנשים דומים'}
                                                    </h4>
                                                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                                                        האם התכוונת לאחד מהאנשים הבאים? אפשר להתחבר אליהם במקום ליצור רשומה חדשה.
                                                    </p>
                                                    <div className="space-y-2 max-h-40 overflow-y-auto">
                                                        {duplicates.map(dup => (
                                                            <div key={dup.id} className="bg-[#0d1424]/60 backdrop-blur-xl rounded-lg p-3 flex items-center justify-between border border-amber-200 dark:border-amber-700">
                                                                <div className="flex items-center gap-3">
                                                                    {dup.photo_url ? (
                                                                        <img src={dup.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                                            <User size={20} className="text-slate-400" />
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className="font-medium text-slate-200">
                                                                            {dup.first_name} {dup.last_name}
                                                                        </div>
                                                                        <div className="text-xs text-slate-500">
                                                                            {dup.birth_date ? `נולד ${new Date(dup.birth_date).getFullYear()}` : 'אין תאריך לידה'}
                                                                            {dup.birth_place && ` • ${dup.birth_place}`}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => { onClose(); onSuccess(); }}
                                                                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm transition-colors"
                                                                >
                                                                    <Link size={14} />
                                                                    <span>עבור לאדם זה</span>
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                                                        <button type="button" onClick={() => setShowDuplicateWarning(false)} className="text-sm text-amber-700 dark:text-amber-300 hover:underline">
                                                            המשך בכל זאת ליצור רשומה חדשה
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

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
                                            <label className="block text-sm font-medium mb-1">חי/ה?</label>
                                            <div className="flex bg-white/10 p-1 rounded-lg">
                                                <button type="button" onClick={() => setFormData({ ...formData, is_alive: true })} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${formData.is_alive ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-slate-500'}`}>
                                                    כן
                                                </button>
                                                <button type="button" onClick={() => setFormData({ ...formData, is_alive: false })} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${!formData.is_alive ? 'bg-white dark:bg-slate-600 shadow text-slate-800' : 'text-slate-500'}`}>
                                                    לא
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">תאריך לידה</label>
                                            <input type="date" value={formData.birth_date || ''} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600" />
                                        </div>
                                        {!formData.is_alive && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1">תאריך פטירה</label>
                                                <input type="date" value={formData.death_date || ''} onChange={e => setFormData({ ...formData, death_date: e.target.value })} className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Birth Place */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">מקום לידה</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input value={formData.birth_city || ''} onChange={e => setFormData({ ...formData, birth_city: e.target.value })} placeholder="עיר" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                            <input value={formData.birth_country || ''} onChange={e => setFormData({ ...formData, birth_country: e.target.value })} placeholder="מדינה" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                        </div>
                                    </div>

                                    {/* Death Place */}
                                    {!formData.is_alive && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">מקום פטירה</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input value={formData.death_city || ''} onChange={e => setFormData({ ...formData, death_city: e.target.value })} placeholder="עיר" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                                <input value={formData.death_country || ''} onChange={e => setFormData({ ...formData, death_country: e.target.value })} placeholder="מדינה" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Residence */}
                                    {formData.is_alive && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">מקום מגורים</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input value={formData.residence_city || ''} onChange={e => setFormData({ ...formData, residence_city: e.target.value })} placeholder="עיר" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                                <input value={formData.residence_country || ''} onChange={e => setFormData({ ...formData, residence_country: e.target.value })} placeholder="מדינה" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Biography */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">ביוגרפיה קצרה</label>
                                        <textarea value={formData.biography} onChange={e => setFormData({ ...formData, biography: e.target.value })} className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 h-20" placeholder="סיפור חיים קצר..." />
                                    </div>
                                </div>
                            ) : (
                                /* ===== RUSSIAN TAB ===== */
                                <div className="space-y-4" dir="ltr">
                                    {/* First & Last Name (Russian) */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Имя *</label>
                                            <input
                                                value={formData.first_name_ru || ''}
                                                onChange={e => setFormData({ ...formData, first_name_ru: e.target.value })}
                                                placeholder="Имя"
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Фамилия *</label>
                                            <input
                                                value={formData.last_name_ru || ''}
                                                onChange={e => setFormData({ ...formData, last_name_ru: e.target.value })}
                                                placeholder="Фамилия"
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Maiden Name & Nickname */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Девичья фамилия</label>
                                            <input
                                                value={formData.maiden_name_ru || ''}
                                                onChange={e => setFormData({ ...formData, maiden_name_ru: e.target.value })}
                                                placeholder="Фамилия до брака"
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Прозвище</label>
                                            <input
                                                value={formData.nickname}
                                                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                                placeholder="Семейное прозвище"
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                            />
                                        </div>
                                    </div>

                                    {/* Previous Name */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Прежнее имя</label>
                                        <input
                                            value={formData.previous_name}
                                            onChange={e => setFormData({ ...formData, previous_name: e.target.value })}
                                            placeholder="В случае смены имени"
                                            className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                        />
                                    </div>

                                    {/* Title */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Звание</label>
                                        <input
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="Д-р, Раввин, Адв..."
                                            className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                        />
                                    </div>

                                    {/* Gender & Is Alive */}
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Пол</label>
                                            <select
                                                value={formData.gender}
                                                onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                            >
                                                <option value="male">Мужской</option>
                                                <option value="female">Женский</option>
                                                <option value="other">Другой</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium mb-1">Жив/а?</label>
                                            <div className="flex bg-white/10 p-1 rounded-lg">
                                                <button type="button" onClick={() => setFormData({ ...formData, is_alive: true })} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${formData.is_alive ? 'bg-white dark:bg-slate-600 shadow text-emerald-600' : 'text-slate-500'}`}>
                                                    Да
                                                </button>
                                                <button type="button" onClick={() => setFormData({ ...formData, is_alive: false })} className={`flex-1 text-sm py-1.5 rounded-md transition-all ${!formData.is_alive ? 'bg-white dark:bg-slate-600 shadow text-slate-800' : 'text-slate-500'}`}>
                                                    Нет
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Дата рождения</label>
                                            <input type="date" value={formData.birth_date || ''} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600" />
                                        </div>
                                        {!formData.is_alive && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Дата смерти</label>
                                                <input type="date" value={formData.death_date || ''} onChange={e => setFormData({ ...formData, death_date: e.target.value })} className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Birth Place */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Место рождения</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input value={formData.birth_city_ru || ''} onChange={e => setFormData({ ...formData, birth_city_ru: e.target.value })} placeholder="Город" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                            <input value={formData.birth_country_ru || ''} onChange={e => setFormData({ ...formData, birth_country_ru: e.target.value })} placeholder="Страна" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                        </div>
                                    </div>

                                    {/* Death Place */}
                                    {!formData.is_alive && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Место смерти</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input value={formData.death_city_ru || ''} onChange={e => setFormData({ ...formData, death_city_ru: e.target.value })} placeholder="Город" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                                <input value={formData.death_country_ru || ''} onChange={e => setFormData({ ...formData, death_country_ru: e.target.value })} placeholder="Страна" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Current Residence */}
                                    {formData.is_alive && (
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Место проживания</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input value={formData.residence_city_ru || ''} onChange={e => setFormData({ ...formData, residence_city_ru: e.target.value })} placeholder="Город" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                                <input value={formData.residence_country_ru || ''} onChange={e => setFormData({ ...formData, residence_country_ru: e.target.value })} placeholder="Страна" className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm" />
                                            </div>
                                        </div>
                                    )}

                                    {/* Biography */}
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Краткая биография</label>
                                        <textarea value={formData.biography} onChange={e => setFormData({ ...formData, biography: e.target.value })} className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 h-20" placeholder="Краткая история жизни..." />
                                    </div>
                                </div>
                            )}
                        </div>
                    </form>
                ) : (
                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto" dir="rtl">
                        {!isEditing ? (
                            <div className="text-center py-12">
                                <Heart size={48} className="mx-auto text-slate-400 mb-4" />
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-2">קשר אדם זה למשפחה</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    כדי לקשר אדם חדש למשפחה, קודם שמור את הפרטים הבסיסיים שלו.
                                </p>
                                <button
                                    onClick={handleSubmit}
                                    className="bg-amber-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-amber-700"
                                >
                                    שמור ועבור לקישור
                                </button>
                            </div>
                        ) : (
                            <>
                        {/* Parents Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <Users size={16} /> הורים
                                </h3>
                                <button onClick={() => setConnectMode('parent')} className="text-xs text-blue-600 hover:underline">+ חבר הורה קיים</button>
                            </div>
                            {parents.map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded border dark:border-slate-700">
                                    <span>{p.parent?.first_name || p.first_name} {p.parent?.last_name || p.last_name}</span>
                                    <button onClick={() => handleRemoveRelationship('parent', p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14} /></button>
                                </div>
                            ))}
                            {parents.length === 0 && <p className="text-sm text-slate-400 italic">אין הורים רשומים.</p>}
                        </div>

                        {/* Spouse Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <Heart size={16} /> בני זוג
                                </h3>
                                <button onClick={() => setConnectMode('spouse')} className="text-xs text-pink-600 hover:underline">+ חבר בן/ת זוג</button>
                            </div>
                            {partnerships.map(p => (
                                <div key={p.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded border dark:border-slate-700">
                                    {editingPartnership?.id === p.id ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium">{p.partner?.first_name || p.partner_first_name} {p.partner?.last_name || p.partner_last_name}</span>
                                                <button onClick={() => setEditingPartnership(null)} className="text-xs text-slate-500">ביטול</button>
                                            </div>
                                            <select
                                                className="w-full p-2 rounded border text-sm dark:bg-slate-700"
                                                value={editingPartnership.status}
                                                onChange={(e) => setEditingPartnership({ ...editingPartnership, status: e.target.value })}
                                            >
                                                <option value="married">נשואים</option>
                                                <option value="divorced">גרושים</option>
                                                <option value="widowed">אלמן/ה</option>
                                                <option value="separated">פרודים</option>
                                                <option value="engaged">מאורסים</option>
                                                <option value="common_law">ידועים בציבור</option>
                                            </select>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await familyService.updatePartnership(p.id, { status: editingPartnership.status });
                                                            await fetchRelationships();
                                                            setEditingPartnership(null);
                                                            onSuccess();
                                                        } catch (error) {
                                                            alert('שגיאה בעדכון סטטוס');
                                                        }
                                                    }}
                                                    className="flex-1 bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                                                >
                                                    <Check size={12} className="inline mr-1" /> שמור
                                                </button>
                                                <button onClick={() => handleRemoveRelationship('spouse', p.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-xs">מחק</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col flex-1">
                                                <span>{p.partner?.first_name || p.partner_first_name} {p.partner?.last_name || p.partner_last_name}</span>
                                                <span className="text-xs text-slate-400">
                                                    {p.status === 'married' ? '💍 נשואים' :
                                                     p.status === 'divorced' ? '💔 גרושים' :
                                                     p.status === 'widowed' ? '🕊️ אלמן/ה' :
                                                     p.status === 'separated' ? '↔️ פרודים' :
                                                     p.status === 'engaged' ? '💝 מאורסים' :
                                                     p.status === 'common_law' ? '🤝 ידועים בציבור' : p.status}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setEditingPartnership(p)}
                                                    className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                                                    title="ערוך סטטוס"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button onClick={() => handleRemoveRelationship('spouse', p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {partnerships.length === 0 && <p className="text-sm text-slate-400 italic">אין בני זוג רשומים.</p>}
                        </div>

                        {/* Children Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <Baby size={16} /> ילדים
                                </h3>
                                <button onClick={() => setConnectMode('child')} className="text-xs text-green-600 hover:underline">+ חבר ילד קיים</button>
                            </div>
                            {children.map(c => (
                                <div key={c.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-2 rounded border dark:border-slate-700">
                                    <span>{c.child?.first_name || c.first_name} {c.child?.last_name || c.last_name}</span>
                                    <button onClick={() => handleRemoveRelationship('child', c.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14} /></button>
                                </div>
                            ))}
                            {children.length === 0 && <p className="text-sm text-slate-400 italic">אין ילדים רשומים.</p>}
                        </div>

                        {/* Connect Modal Overlay */}
                        {connectMode !== 'none' && (
                            <div className="border-t pt-4 mt-4 bg-amber-50/50 dark:bg-amber-900/20 p-4 rounded-lg">
                                <h4 className="font-bold mb-2 text-sm">
                                    {connectMode === 'parent' ? 'חיבור הורה' : connectMode === 'child' ? 'חיבור ילד' : 'חיבור בן/ת זוג'}
                                </h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">בחר אדם:</label>
                                        <select
                                            className="w-full p-2 rounded border text-sm dark:bg-slate-700 dark:border-slate-600"
                                            value={selectedConnectId}
                                            onChange={e => setSelectedConnectId(e.target.value ? Number(e.target.value) : '')}
                                        >
                                            <option value="">בחר בן משפחה...</option>
                                            {potentialRelations
                                                .filter(m => m.id !== member?.id) // Don't allow self-connection
                                                .map(m => (
                                                    <option key={m.id} value={m.id}>
                                                        {m.first_name} {m.last_name} ({m.birth_date ? new Date(m.birth_date).getFullYear() : '?'})
                                                    </option>
                                                ))}
                                        </select>
                                    </div>

                                    {(connectMode === 'parent' || connectMode === 'child') && (
                                        <div>
                                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">סוג קשר:</label>
                                            <select
                                                className="w-full p-2 rounded border text-sm dark:bg-slate-700 dark:border-slate-600"
                                                value={parentChildType}
                                                onChange={e => setParentChildType(e.target.value)}
                                            >
                                                <option value="biological">ביולוגי</option>
                                                <option value="adopted">מאומץ</option>
                                                <option value="foster">אומנה</option>
                                                <option value="step">חורג</option>
                                            </select>
                                        </div>
                                    )}

                                    {connectMode === 'spouse' && (
                                        <div>
                                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">סטטוס:</label>
                                            <select
                                                className="w-full p-2 rounded border text-sm dark:bg-slate-700 dark:border-slate-600"
                                                value={spouseStatus}
                                                onChange={e => setSpouseStatus(e.target.value)}
                                            >
                                                <option value="married">נשואים</option>
                                                <option value="divorced">גרושים</option>
                                                <option value="widowed">אלמן/ה</option>
                                                <option value="separated">פרודים</option>
                                                <option value="engaged">מאורסים</option>
                                                <option value="common_law">ידועים בציבור</option>
                                            </select>
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setConnectMode('none')} className="text-sm text-slate-500 px-3 py-1">ביטול</button>
                                        <button
                                            onClick={handleConnect}
                                            disabled={!selectedConnectId}
                                            className="text-sm bg-amber-600 text-white px-3 py-1 rounded hover:bg-amber-700 disabled:opacity-50"
                                        >
                                            חבר
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                            </>
                        )}
                    </div>
                )}

                <div className="p-4 border-t border-white/10 bg-white/5/50">
                    {/* Only show quick add relative in Details tab */}
                    {activeTab === 'details' && onAddRelative && isEditing && (
                        <div className="mb-4">
                            <div className="text-xs font-medium text-slate-500 mb-2">הוסף קרוב משפחה:</div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => { onClose(); onAddRelative('parent'); }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                                >
                                    <Users size={14} /> הורה
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { onClose(); onAddRelative('child'); }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                                >
                                    <Baby size={14} /> ילד/ה
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { onClose(); onAddRelative('spouse'); }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-lg text-sm hover:bg-pink-200"
                                >
                                    <Heart size={14} /> בן/ת זוג
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between gap-3">
                        {/* Delete Button - Only for existing members */}
                        {isEditing && member?.id && (
                            <button
                                onClick={handleDeleteMember}
                                disabled={loading}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                                title="מחק אדם זה"
                            >
                                <Trash2 size={16} />
                                <span>מחק</span>
                            </button>
                        )}

                        <div className="flex gap-3 mr-auto">
                            <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg">סגור</button>
                            {activeTab === 'details' && (
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="bg-amber-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-amber-700 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                                    {isEditing ? 'עדכן' : 'שמור'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
