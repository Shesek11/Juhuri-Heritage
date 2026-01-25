import React, { useState, useEffect } from 'react';
import { FamilyMember, familyService } from '../../services/familyService';
import { User, X, Check, Loader2, Upload, Pencil, UserPlus, Users, Baby, Heart } from 'lucide-react';

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

    // Connection state
    const [parents, setParents] = useState<any[]>([]);
    const [children, setChildren] = useState<any[]>([]);
    const [partnerships, setPartnerships] = useState<any[]>([]);
    const [connectMode, setConnectMode] = useState<'none' | 'parent' | 'child' | 'spouse'>('none');
    const [selectedConnectId, setSelectedConnectId] = useState<number | ''>('');
    const [spouseStatus, setSpouseStatus] = useState<string>('married');
    const [parentChildType, setParentChildType] = useState<string>('biological');
    const [editingPartnership, setEditingPartnership] = useState<any | null>(null);

    useEffect(() => {
        if (member) {
            setFormData({
                first_name: member.first_name || '',
                last_name: member.last_name || '',
                maiden_name: member.maiden_name || '',
                nickname: member.nickname || '',
                previous_name: member.previous_name || '',
                title: member.title || '',
                gender: member.gender || 'male',
                is_alive: member.is_alive ?? true,
                birth_date: member.birth_date?.split('T')[0] || '',
                death_date: member.death_date?.split('T')[0] || '',
                birth_place: member.birth_place || '',
                death_place: member.death_place || '',
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
            <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-amber-50 dark:bg-amber-900/20">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
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
                                    <p className="text-sm text-slate-500">לחץ על העיגול כדי להחליף תמונה.</p>
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
                                        value={formData.birth_date || ''}
                                        onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                {!formData.is_alive && (
                                    <div>
                                        <label className="block text-sm font-medium mb-1">תאריך פטירה</label>
                                        <input
                                            type="date"
                                            value={formData.death_date || ''}
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
                                    <span>{p.parent?.first_name} {p.parent?.last_name}</span>
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
                                                <span className="font-medium">{p.partner?.first_name} {p.partner?.last_name}</span>
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
                                                <span>{p.partner?.first_name} {p.partner?.last_name}</span>
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
                                    <span>{c.child?.first_name} {c.child?.last_name}</span>
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

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
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

                    <div className="flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg">סגור</button>
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
    );
};
