import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';
import { FamilyMember, familyService } from '../../services/familyService';
import { User, X, Check, Loader2, Upload, Pencil, UserPlus, Users, Baby, Heart, Trash2, AlertTriangle, Link, Sparkles, Calendar } from 'lucide-react';

// Date input with DD/MM/YYYY display + native date picker
const HebrewDateInput: React.FC<{
    value: string; // ISO yyyy-mm-dd
    onChange: (iso: string) => void;
    className?: string;
}> = ({ value, onChange, className }) => {
    const hiddenRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState('');
    const [editing, setEditing] = useState(false);

    const isoToDisplay = (iso: string) => iso ? iso.split('-').reverse().join('/') : '';

    const handleTextChange = (raw: string) => {
        // Allow digits and slashes, auto-insert slashes
        let clean = raw.replace(/[^\d/]/g, '');
        // Auto-insert slash after DD and MM
        if (clean.length === 2 && !clean.includes('/')) clean += '/';
        if (clean.length === 5 && clean.split('/').length === 2) clean += '/';
        if (clean.length > 10) clean = clean.slice(0, 10);
        setText(clean);
        // Auto-convert when complete DD/MM/YYYY
        const m = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
            const [, d, mo, y] = m;
            onChange(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`);
        }
    };

    return (
        <div className={`relative ${className || ''}`}>
            <input
                type="text"
                value={editing ? text : isoToDisplay(value)}
                onFocus={() => { setEditing(true); setText(isoToDisplay(value)); }}
                onBlur={() => setEditing(false)}
                onChange={e => handleTextChange(e.target.value)}
                placeholder="DD/MM/YYYY"
                className="w-full p-2.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm text-right pl-10"
            />
            <button
                type="button"
                onClick={() => hiddenRef.current?.showPicker?.()}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                title="בחר תאריך"
            >
                <Calendar size={16} />
            </button>
            <input
                ref={hiddenRef}
                type="date"
                value={value || ''}
                onChange={e => { onChange(e.target.value); setEditing(false); }}
                className="absolute inset-0 opacity-0 pointer-events-none"
                tabIndex={-1}
            />
        </div>
    );
};

interface EditMemberModalProps {
    isOpen: boolean;
    member: FamilyMember | null;
    currentUserId?: number | string;
    isAdmin?: boolean;
    onClose: () => void;
    onSuccess: (newMemberId?: number) => void;
    onGraphRefresh?: () => void;
    onAddRelative?: (type: 'parent' | 'child' | 'spouse') => void;
    potentialRelations?: FamilyMember[];
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({ isOpen, member, currentUserId, isAdmin, onClose, onSuccess, onGraphRefresh, onAddRelative, potentialRelations = [] }) => {
    const t = useTranslations('family');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'details' | 'connections'>('details');
    const isEditing = !!member?.id;
    const canEdit = !isEditing || isAdmin || (member?.user_id != null && String(member.user_id) === String(currentUserId));
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

    // Combo box search for connections
    const [connectSearch, setConnectSearch] = useState('');
    const MAX_COMBO_RESULTS = 10;
    const filteredRelations = potentialRelations
        .filter(m => m.id !== member?.id)
        .filter(m => {
            if (!connectSearch.trim()) return true;
            const q = connectSearch.trim().toLowerCase();
            return (
                (m.first_name || '').toLowerCase().includes(q) ||
                (m.last_name || '').toLowerCase().includes(q) ||
                (m.maiden_name || '').toLowerCase().includes(q) ||
                (m.previous_name || '').toLowerCase().includes(q) ||
                `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
                `${m.first_name} ${m.maiden_name}`.toLowerCase().includes(q)
            );
        })
        .slice(0, MAX_COMBO_RESULTS);

    // Country suggestions
    const countrySuggestions: Record<string, string> = { 'י': 'ישראל', 'יש': 'ישראל', 'ר': 'רוסיה', 'רו': 'רוסיה', 'א': 'אזרבייג\'ן', 'אז': 'אזרבייג\'ן', 'ג': 'גרוזיה', 'גר': 'גרוזיה', 'אר': 'ארה\"ב' };

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
                alert(direction === 'he-to-ru' ? 'אין שדות עבריים לתרגם ממנם' : 'Нет русских полей для перевода');
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

    const [connectSuccess, setConnectSuccess] = useState('');
    const handleConnect = async () => {
        if (!member?.id || !selectedConnectId) return;
        setLoading(true);
        setConnectSuccess('');
        try {
            const connectedName = potentialRelations.find(m => m.id === Number(selectedConnectId));
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
            // Don't close - reset selection and show success
            setSelectedConnectId('');
            setConnectSearch('');
            setConnectSuccess(`${connectedName?.first_name || ''} ${connectedName?.last_name || ''} חובר בהצלחה!`);
            setTimeout(() => setConnectSuccess(''), 3000);
            onGraphRefresh?.(); // Refresh graph in background
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
            onGraphRefresh?.(); // Refresh graph without closing modal
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
        if (!formData.birth_date) {
            alert(langTab === 'he' ? 'תאריך לידה הוא שדה חובה' : 'Дата рождения обязательна');
            return;
        }
        setLoading(true);
        try {
            let newId: number | undefined;
            if (isEditing && member) {
                await familyService.updateMember(member.id, formData);
            } else {
                const result = await familyService.createMember(formData as any);
                newId = result.id;
            }
            onSuccess(newId);
            onClose();
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'שגיאה בשמירת בן משפחה');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full p-2.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm";
    const selectClass = "w-full p-2.5 rounded-lg border border-white/10 bg-[#1a2236] text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm [&>option]:bg-[#1a2236] [&>option]:text-slate-200";
    const labelClass = "block text-sm font-medium text-slate-300 mb-1";
    const labelSmClass = "block text-xs font-medium text-slate-400 mb-1";

    const countryList = ['ישראל', 'רוסיה', 'אזרבייג\'ן', 'גרוזיה', 'ארה"ב', 'גרמניה', 'אוסטריה', 'צרפת', 'אוזבקיסטן', 'דגסטן', 'אוקראינה', 'קנדה', 'אוסטרליה', 'בריטניה'];
    const countryListRu = ['Израиль', 'Россия', 'Азербайджан', 'Грузия', 'США', 'Германия', 'Австрия', 'Франция', 'Узбекистан', 'Дагестан', 'Украина', 'Канада', 'Австралия', 'Великобритания'];

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center backdrop-blur-sm" onClick={onClose}>
            <datalist id="countries-he">{countryList.map(c => <option key={c} value={c} />)}</datalist>
            <datalist id="countries-ru">{countryListRu.map(c => <option key={c} value={c} />)}</datalist>
            <div className="bg-[#0d1424] w-[95%] max-w-lg h-[95vh] rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex flex-col" dir="rtl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {isEditing ? <Pencil className="text-indigo-400" size={20} /> : <UserPlus className="text-indigo-400" size={20} />}
                        {isEditing ? t('modal.editMember') : t('modal.addMember')}
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-3 py-1 rounded-full text-sm ${activeTab === 'details' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}
                        >
                            {t('modal.details')}
                        </button>
                        <button
                            onClick={() => setActiveTab('connections')}
                            className={`px-3 py-1 rounded-full text-sm ${activeTab === 'connections' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/10'}`}
                        >
                            {t('modal.connections')} {!isEditing && <span className="text-xs opacity-75">({t('modal.linkExisting')})</span>}
                        </button>
                        <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
                    </div>
                </div>

                {activeTab === 'details' ? (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
                        <div className="space-y-4">
                            {/* Profile Photo */}
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full bg-white/5 overflow-hidden flex items-center justify-center border border-white/10 relative group">
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
                                    <h3 className="font-bold text-white">תמונת פרופיל</h3>
                                    <p className="text-sm text-slate-400">לחץ על העיגול כדי להחליף תמונה.</p>
                                </div>
                            </div>

                            {/* Language Tabs: Hebrew / Russian — controls entire form */}
                            <div className="flex items-center gap-2">
                                <div className="flex bg-white/10 rounded-lg p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setLangTab('he')}
                                        className={`px-4 py-1.5 rounded-md text-sm transition-all ${langTab === 'he' ? 'bg-indigo-600 shadow text-white font-medium' : 'text-slate-400'}`}
                                    >
                                        עברית
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLangTab('ru')}
                                        className={`px-4 py-1.5 rounded-md text-sm transition-all ${langTab === 'ru' ? 'bg-indigo-600 shadow text-white font-medium' : 'text-slate-400'}`}
                                    >
                                        Русский
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAITranslate}
                                    disabled={translating}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-900/50 text-violet-300 rounded-lg text-xs font-medium hover:bg-violet-800/50 transition-colors disabled:opacity-50"
                                    title={langTab === 'he' ? 'תרגם לרוסית עם AI' : 'Перевести на иврит с AI'}
                                >
                                    {translating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    {langTab === 'he' ? 'תרגם → RU' : 'Перевести → HE'}
                                </button>
                            </div>

                            {langTab === 'he' ? (
                                <div className="space-y-3">
                                    {/* Hebrew: Names */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>שם פרטי *</label>
                                            <input
                                                required
                                                value={formData.first_name}
                                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>שם משפחה</label>
                                            <input
                                                value={formData.last_name}
                                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                                placeholder="מומלץ למלא"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelSmClass}>שם נעורים</label>
                                            <input
                                                value={formData.maiden_name}
                                                onChange={e => setFormData({ ...formData, maiden_name: e.target.value })}
                                                placeholder="שם משפחה לפני נישואין"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelSmClass}>כינוי</label>
                                            <input
                                                value={formData.nickname}
                                                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                                placeholder="כינוי משפחתי"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelSmClass}>שם קודם</label>
                                            <input
                                                value={formData.previous_name}
                                                onChange={e => setFormData({ ...formData, previous_name: e.target.value })}
                                                placeholder="במקרה של שינוי שם"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelSmClass}>תואר</label>
                                            <input
                                                value={formData.title}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="ד&quot;ר, רב, עו&quot;ד..."
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    {/* Hebrew: Places */}
                                    <div>
                                        <label className={labelSmClass}>מקום לידה</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                value={formData.birth_city || ''}
                                                onChange={e => setFormData({ ...formData, birth_city: e.target.value })}
                                                placeholder="עיר"
                                                className={inputClass}
                                            />
                                            <input
                                                value={formData.birth_country || ''}
                                                onChange={e => setFormData({ ...formData, birth_country: e.target.value })}
                                                placeholder="מדינה"
                                                list="countries-he"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    {!formData.is_alive && (
                                        <div>
                                            <label className={labelSmClass}>מקום פטירה</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    value={formData.death_city || ''}
                                                    onChange={e => setFormData({ ...formData, death_city: e.target.value })}
                                                    placeholder="עיר"
                                                    className={inputClass}
                                                />
                                                <input
                                                    value={formData.death_country || ''}
                                                    onChange={e => setFormData({ ...formData, death_country: e.target.value })}
                                                    placeholder="מדינה"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {formData.is_alive && (
                                        <div>
                                            <label className={labelSmClass}>מקום מגורים</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    value={formData.residence_city || ''}
                                                    onChange={e => setFormData({ ...formData, residence_city: e.target.value })}
                                                    placeholder="עיר"
                                                    className={inputClass}
                                                />
                                                <input
                                                    value={formData.residence_country || ''}
                                                    onChange={e => setFormData({ ...formData, residence_country: e.target.value })}
                                                    placeholder="מדינה"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3" dir="ltr">
                                    {/* Russian: Names */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>Имя *</label>
                                            <input
                                                value={formData.first_name_ru || ''}
                                                onChange={e => setFormData({ ...formData, first_name_ru: e.target.value })}
                                                placeholder="Имя"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Фамилия</label>
                                            <input
                                                value={formData.last_name_ru || ''}
                                                onChange={e => setFormData({ ...formData, last_name_ru: e.target.value })}
                                                placeholder="Фамилия"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelSmClass}>Девичья фамилия</label>
                                            <input
                                                value={formData.maiden_name_ru || ''}
                                                onChange={e => setFormData({ ...formData, maiden_name_ru: e.target.value })}
                                                placeholder="Девичья фамилия"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelSmClass}>Прозвище</label>
                                            <input
                                                value={formData.nickname || ''}
                                                onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                                placeholder="Прозвище"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelSmClass}>Прежнее имя</label>
                                            <input
                                                value={formData.previous_name || ''}
                                                onChange={e => setFormData({ ...formData, previous_name: e.target.value })}
                                                placeholder="При смене имени"
                                                className={inputClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelSmClass}>Звание</label>
                                            <input
                                                value={formData.title || ''}
                                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                placeholder="Д-р, Рав..."
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>

                                    {/* Russian: Places */}
                                    <div>
                                        <label className={labelSmClass}>Место рождения</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                value={formData.birth_city_ru || ''}
                                                onChange={e => setFormData({ ...formData, birth_city_ru: e.target.value })}
                                                placeholder="Город"
                                                className={inputClass}
                                            />
                                            <input
                                                value={formData.birth_country_ru || ''}
                                                onChange={e => setFormData({ ...formData, birth_country_ru: e.target.value })}
                                                placeholder="Страна"
                                                list="countries-ru"
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    {!formData.is_alive && (
                                        <div>
                                            <label className={labelSmClass}>Место смерти</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    value={formData.death_city_ru || ''}
                                                    onChange={e => setFormData({ ...formData, death_city_ru: e.target.value })}
                                                    placeholder="Город"
                                                    className={inputClass}
                                                />
                                                <input
                                                    value={formData.death_country_ru || ''}
                                                    onChange={e => setFormData({ ...formData, death_country_ru: e.target.value })}
                                                    placeholder="Страна"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {formData.is_alive && (
                                        <div>
                                            <label className={labelSmClass}>Место проживания</label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    value={formData.residence_city_ru || ''}
                                                    onChange={e => setFormData({ ...formData, residence_city_ru: e.target.value })}
                                                    placeholder="Город"
                                                    className={inputClass}
                                                />
                                                <input
                                                    value={formData.residence_country_ru || ''}
                                                    onChange={e => setFormData({ ...formData, residence_country_ru: e.target.value })}
                                                    placeholder="Страна"
                                                    className={inputClass}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Duplicate Detection Warning */}
                            {showDuplicateWarning && duplicates.length > 0 && (
                                <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                                        <div className="flex-1">
                                            <h4 className="font-bold text-amber-300 mb-1">
                                                נמצאו {duplicates.length} {duplicates.length === 1 ? 'אדם דומה' : 'אנשים דומים'}
                                            </h4>
                                            <p className="text-sm text-amber-400/80 mb-3">
                                                האם התכוונת לאחד מהאנשים הבאים? אפשר להתחבר אליהם במקום ליצור רשומה חדשה.
                                            </p>
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {duplicates.map(dup => (
                                                    <div key={dup.id} className="bg-white/5 rounded-lg p-3 flex items-center justify-between border border-white/10">
                                                        <div className="flex items-center gap-3">
                                                            {dup.photo_url ? (
                                                                <img src={dup.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                                    <User size={20} className="text-slate-400" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-medium text-slate-200">
                                                                    {dup.first_name} {dup.last_name}
                                                                </div>
                                                                <div className="text-xs text-slate-400">
                                                                    {dup.birth_date ? `נולד ${new Date(dup.birth_date).getFullYear()}` : 'אין תאריך לידה'}
                                                                    {dup.birth_place && ` • ${dup.birth_place}`}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                onClose();
                                                                onSuccess();
                                                            }}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
                                                        >
                                                            <Link size={14} />
                                                            <span>עבור לאדם זה</span>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-amber-500/30">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowDuplicateWarning(false)}
                                                    className="text-sm text-amber-300 hover:underline"
                                                >
                                                    המשך בכל זאת ליצור רשומה חדשה
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Gender & Is Alive */}
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className={labelClass}>{langTab === 'he' ? 'מין' : 'Пол'}</label>
                                    <select
                                        value={formData.gender}
                                        onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                        className={selectClass}
                                    >
                                        <option value="male">{langTab === 'he' ? 'זכר' : 'Мужской'}</option>
                                        <option value="female">{langTab === 'he' ? 'נקבה' : 'Женский'}</option>
                                        <option value="other">{langTab === 'he' ? 'אחר' : 'Другое'}</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className={labelClass}>{langTab === 'he' ? 'חי?' : 'Жив?'}</label>
                                    <div className="flex bg-white/10 p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_alive: true })}
                                            className={`flex-1 text-sm py-1.5 rounded-md transition-all ${formData.is_alive ? 'bg-indigo-600 shadow text-white font-medium' : 'text-slate-400'}`}
                                        >
                                            {langTab === 'he' ? 'כן' : 'Да'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, is_alive: false })}
                                            className={`flex-1 text-sm py-1.5 rounded-md transition-all ${!formData.is_alive ? 'bg-slate-600 shadow text-white font-medium' : 'text-slate-400'}`}
                                        >
                                            {langTab === 'he' ? 'לא' : 'Нет'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>{langTab === 'he' ? 'תאריך לידה *' : 'Дата рождения *'}</label>
                                    <HebrewDateInput
                                        value={formData.birth_date || ''}
                                        onChange={v => setFormData({ ...formData, birth_date: v })}
                                    />
                                </div>
                                {!formData.is_alive && (
                                    <div>
                                        <label className={labelClass}>{langTab === 'he' ? 'תאריך פטירה' : 'Дата смерти'}</label>
                                        <HebrewDateInput
                                            value={formData.death_date || ''}
                                            onChange={v => setFormData({ ...formData, death_date: v })}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Biography */}
                            <div>
                                <label className={labelClass}>{langTab === 'he' ? 'ביוגרפיה קצרה' : 'Краткая биография'}</label>
                                <textarea
                                    value={formData.biography}
                                    onChange={e => setFormData({ ...formData, biography: e.target.value })}
                                    className={`${inputClass} h-20`}
                                    placeholder={langTab === 'he' ? 'סיפור חיים קצר...' : 'Краткая история жизни...'}
                                />
                            </div>
                        </div>
                    </form>
                ) : (
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto text-slate-200" dir="rtl">
                        {!isEditing ? (
                            <div className="text-center py-12">
                                <Heart size={48} className="mx-auto text-slate-500 mb-4" />
                                <h3 className="text-lg font-bold text-white mb-2">{t('modal.linkToFamily')}</h3>
                                <p className="text-sm text-slate-400 mb-6">
                                    {t('modal.saveFirstToLink')}
                                </p>
                                <button
                                    onClick={handleSubmit}
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700"
                                >
                                    {t('modal.saveAndLink')}
                                </button>
                            </div>
                        ) : (
                            <>
                        {/* Parents Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Users size={16} /> {t('modal.parents')}
                                </h3>
                                <button onClick={() => setConnectMode('parent')} className="text-xs text-indigo-600 hover:underline">+ {t('modal.linkParent')}</button>
                            </div>
                            {parents.map(p => (
                                <div key={p.id} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10">
                                    <span className="text-slate-200">{p.parent?.first_name || p.first_name} {p.parent?.last_name || p.last_name}</span>
                                    <button onClick={() => handleRemoveRelationship('parent', p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14} /></button>
                                </div>
                            ))}
                            {parents.length === 0 && <p className="text-sm text-slate-500 italic">{t('modal.noParents')}</p>}
                        </div>

                        {/* Spouse Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Heart size={16} /> {t('modal.spouses')}
                                </h3>
                                <button onClick={() => setConnectMode('spouse')} className="text-xs text-pink-600 hover:underline">+ {t('modal.linkSpouse')}</button>
                            </div>
                            {partnerships.map(p => (
                                <div key={p.id} className="bg-white/5 p-3 rounded border border-white/10">
                                    {editingPartnership?.id === p.id ? (
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-slate-200">{p.partner?.first_name || p.partner_first_name} {p.partner?.last_name || p.partner_last_name}</span>
                                                <button onClick={() => setEditingPartnership(null)} className="text-xs text-slate-400">{t('modal.cancel')}</button>
                                            </div>
                                            <select
                                                className={selectClass}
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
                                                    <Check size={12} className="inline mr-1" /> {t('modal.save')}
                                                </button>
                                                <button onClick={() => handleRemoveRelationship('spouse', p.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded text-xs">{t('modal.delete')}</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col flex-1">
                                                <span className="text-slate-200">{p.partner?.first_name || p.partner_first_name} {p.partner?.last_name || p.partner_last_name}</span>
                                                <span className="text-xs text-slate-500">
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
                                                    className="text-indigo-400 hover:bg-white/10 p-1 rounded"
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
                            {partnerships.length === 0 && <p className="text-sm text-slate-500 italic">אין בני זוג רשומים.</p>}
                        </div>

                        {/* Children Section */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Baby size={16} /> {t('modal.children')}
                                </h3>
                                <button onClick={() => setConnectMode('child')} className="text-xs text-green-600 hover:underline">+ {t('modal.linkChild')}</button>
                            </div>
                            {children.map(c => (
                                <div key={c.id} className="flex justify-between items-center bg-white/5 p-2 rounded border border-white/10">
                                    <span className="text-slate-200">{c.child?.first_name || c.first_name} {c.child?.last_name || c.last_name}</span>
                                    <button onClick={() => handleRemoveRelationship('child', c.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><X size={14} /></button>
                                </div>
                            ))}
                            {children.length === 0 && <p className="text-sm text-slate-500 italic">{t('modal.noChildren')}</p>}
                        </div>

                        {/* Connect Modal Overlay */}
                        {connectMode !== 'none' && (
                            <div className="border-t pt-4 mt-4 bg-indigo-900/30 border border-indigo-500/20 p-4 rounded-lg">
                                <h4 className="font-bold mb-2 text-sm text-white">
                                    {connectMode === 'parent' ? t('modal.connectParent') : connectMode === 'child' ? t('modal.connectChild') : t('modal.connectSpouse')}
                                </h4>
                                <div className="space-y-3">
                                    {/* Success feedback */}
                                    {connectSuccess && (
                                        <div className="bg-green-900/40 border border-green-500/30 text-green-300 text-sm p-2 rounded-lg text-center">
                                            <Check size={14} className="inline mr-1" /> {connectSuccess}
                                        </div>
                                    )}

                                    {/* Combo box search */}
                                    <div className="relative">
                                        <label className="block text-xs text-slate-400 mb-1">חפש אדם קיים:</label>
                                        <input
                                            type="text"
                                            value={connectSearch}
                                            onChange={e => { setConnectSearch(e.target.value); setSelectedConnectId(''); }}
                                            placeholder="הקלד שם לחיפוש..."
                                            className={inputClass}
                                        />
                                        {connectSearch.trim() && filteredRelations.length > 0 && !selectedConnectId && (
                                            <div className="absolute z-10 w-full mt-1 bg-[#1a2236] border border-white/10 rounded-lg max-h-40 overflow-y-auto shadow-xl">
                                                {filteredRelations.map(m => (
                                                    <button
                                                        key={m.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedConnectId(m.id);
                                                            setConnectSearch(`${m.first_name} ${m.last_name}`);
                                                        }}
                                                        className="w-full text-right px-3 py-2 text-sm text-slate-200 hover:bg-indigo-600/30 border-b border-white/5 last:border-0"
                                                    >
                                                        {m.first_name} {m.last_name}
                                                        {m.maiden_name && <span className="text-slate-500 text-xs"> ({m.maiden_name})</span>}
                                                        <span className="text-slate-500 text-xs"> ({m.birth_date ? new Date(m.birth_date).getFullYear() : '?'})</span>
                                                    </button>
                                                ))}
                                                {filteredRelations.length >= MAX_COMBO_RESULTS && (
                                                    <div className="px-3 py-1 text-xs text-slate-500 text-center">הצג {MAX_COMBO_RESULTS} ראשונים...</div>
                                                )}
                                            </div>
                                        )}
                                        {connectSearch.trim() && filteredRelations.length === 0 && !selectedConnectId && (
                                            <div className="absolute z-10 w-full mt-1 bg-[#1a2236] border border-white/10 rounded-lg p-3 text-sm text-slate-500 text-center">
                                                לא נמצאו תוצאות
                                            </div>
                                        )}
                                    </div>

                                    {(connectMode === 'parent' || connectMode === 'child') && (
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">סוג קשר:</label>
                                            <select
                                                className={selectClass}
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
                                            <label className="block text-xs text-slate-400 mb-1">סטטוס:</label>
                                            <select
                                                className={selectClass}
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

                                    <div className="flex justify-between items-center mt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                onClose();
                                                onAddRelative?.(connectMode === 'spouse' ? 'spouse' : connectMode === 'parent' ? 'parent' : 'child');
                                            }}
                                            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                        >
                                            <UserPlus size={12} /> {t('modal.createNew')}
                                        </button>
                                        <div className="flex gap-2">
                                            <button onClick={() => { setConnectMode('none'); setConnectSearch(''); setConnectSuccess(''); }} className="text-sm text-slate-400 px-3 py-1">{t('modal.cancel')}</button>
                                            <button
                                                onClick={handleConnect}
                                                disabled={!selectedConnectId}
                                                className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 disabled:opacity-50"
                                            >
                                                {t('modal.connect')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                            </>
                        )}
                    </div>
                )}

                <div className="p-4 border-t border-white/10 bg-white/5">
                    {/* Only show quick add relative in Details tab */}
                    {activeTab === 'details' && onAddRelative && isEditing && (
                        <div className="mb-4">
                            <div className="text-xs font-medium text-slate-400 mb-2">{t('modal.addRelative')}:</div>
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => { onClose(); onAddRelative('parent'); }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-indigo-300 rounded-lg text-sm hover:bg-white/20 border border-white/10"
                                >
                                    <Users size={14} /> {t('modal.parent')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { onClose(); onAddRelative('child'); }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                                >
                                    <Baby size={14} /> {t('modal.child')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { onClose(); onAddRelative('spouse'); }}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-lg text-sm hover:bg-pink-200"
                                >
                                    <Heart size={14} /> {t('modal.spouse')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between gap-3">
                        {/* Delete Button - Only for owner or admin */}
                        {isEditing && member?.id && canEdit && (
                            <button
                                onClick={handleDeleteMember}
                                disabled={loading}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 disabled:opacity-50 transition-colors"
                                title={t('modal.deletePerson')}
                            >
                                <Trash2 size={16} />
                                <span>{t('modal.delete')}</span>
                            </button>
                        )}

                        <div className="flex gap-3 mr-auto">
                            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:bg-white/10 rounded-lg">{t('modal.close')}</button>
                            {activeTab === 'details' && canEdit && (
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : <Check size={18} />}
                                    {isEditing ? t('modal.update') : t('modal.save')}
                                </button>
                            )}
                            {activeTab === 'details' && !canEdit && isEditing && (
                                <span className="px-4 py-2 text-slate-500 text-sm">{t('modal.viewOnly')}</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
