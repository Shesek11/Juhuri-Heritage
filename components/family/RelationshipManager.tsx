import React, { useState, useEffect } from 'react';
import { FamilyMember, familyService, ParentChildType, PartnershipStatus } from '../../services/familyService';
import { X, Users, Heart, Baby, Plus, Trash2, Loader2 } from 'lucide-react';

interface RelationshipManagerProps {
    isOpen: boolean;
    member: FamilyMember | null;
    allMembers: FamilyMember[];
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

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
    isOpen,
    member,
    allMembers,
    onClose,
    onSuccess
}) => {
    const [activeTab, setActiveTab] = useState<'parents' | 'children' | 'partners'>('parents');
    const [loading, setLoading] = useState(false);
    const [parents, setParents] = useState<any[]>([]);
    const [children, setChildren] = useState<any[]>([]);
    const [partnerships, setPartnerships] = useState<any[]>([]);

    // Form state for adding new relationships
    const [newParentId, setNewParentId] = useState<number | ''>('');
    const [newParentType, setNewParentType] = useState<ParentChildType>('biological');
    const [newChildId, setNewChildId] = useState<number | ''>('');
    const [newChildType, setNewChildType] = useState<ParentChildType>('biological');
    const [newPartnerId, setNewPartnerId] = useState<number | ''>('');
    const [newPartnerStatus, setNewPartnerStatus] = useState<PartnershipStatus>('married');
    const [newPartnerStartDate, setNewPartnerStartDate] = useState('');

    useEffect(() => {
        if (member && isOpen) {
            loadRelationships();
        }
    }, [member, isOpen]);

    const loadRelationships = async () => {
        if (!member) return;
        setLoading(true);
        try {
            const [parentsData, childrenData, partnershipsData] = await Promise.all([
                familyService.getParents(member.id),
                familyService.getChildren(member.id),
                familyService.getPartnerships(member.id)
            ]);
            setParents(parentsData);
            setChildren(childrenData);
            setPartnerships(partnershipsData);
        } catch (err) {
            console.error('Failed to load relationships:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddParent = async () => {
        if (!member || !newParentId) return;
        setLoading(true);
        try {
            await familyService.addParentChild({
                parent_id: Number(newParentId),
                child_id: member.id,
                relationship_type: newParentType
            });
            setNewParentId('');
            await loadRelationships();
            onSuccess();
        } catch (err: any) {
            alert(err.message || 'שגיאה בהוספת הורה');
        } finally {
            setLoading(false);
        }
    };

    const handleAddChild = async () => {
        if (!member || !newChildId) return;
        setLoading(true);
        try {
            await familyService.addParentChild({
                parent_id: member.id,
                child_id: Number(newChildId),
                relationship_type: newChildType
            });
            setNewChildId('');
            await loadRelationships();
            onSuccess();
        } catch (err: any) {
            alert(err.message || 'שגיאה בהוספת ילד');
        } finally {
            setLoading(false);
        }
    };

    const handleAddPartner = async () => {
        if (!member || !newPartnerId) return;
        setLoading(true);
        try {
            await familyService.addPartnership({
                person1_id: member.id,
                person2_id: Number(newPartnerId),
                status: newPartnerStatus,
                start_date: newPartnerStartDate || undefined
            });
            setNewPartnerId('');
            setNewPartnerStartDate('');
            await loadRelationships();
            onSuccess();
        } catch (err: any) {
            alert(err.message || 'שגיאה בהוספת בן/בת זוג');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveParentChild = async (id: number) => {
        if (!confirm('האם אתה בטוח שברצונך להסיר קשר זה?')) return;
        setLoading(true);
        try {
            await familyService.removeParentChild(id);
            await loadRelationships();
            onSuccess();
        } catch (err) {
            alert('שגיאה בהסרת הקשר');
        } finally {
            setLoading(false);
        }
    };

    const handleRemovePartnership = async (id: number) => {
        if (!confirm('האם אתה בטוח שברצונך להסיר קשר זוגיות זה?')) return;
        setLoading(true);
        try {
            await familyService.removePartnership(id);
            await loadRelationships();
            onSuccess();
        } catch (err) {
            alert('שגיאה בהסרת הקשר');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !member) return null;

    const availableForParent = allMembers.filter(m =>
        m.id !== member.id && !parents.some(p => p.parent_id === m.id)
    );
    const availableForChild = allMembers.filter(m =>
        m.id !== member.id && !children.some(c => c.child_id === m.id)
    );
    const availableForPartner = allMembers.filter(m =>
        m.id !== member.id && !partnerships.some(p => p.partner_id === m.id)
    );

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/20">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Users className="text-purple-600" size={20} />
                        ניהול קשרים - {member.first_name} {member.last_name}
                    </h2>
                    <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('parents')}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'parents' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-500'}`}
                    >
                        <Users size={16} />
                        הורים ({parents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('children')}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'children' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-500'}`}
                    >
                        <Baby size={16} />
                        ילדים ({children.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('partners')}
                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'partners' ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-500'}`}
                    >
                        <Heart size={16} />
                        בני זוג ({partnerships.length})
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-purple-600" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Parents Tab */}
                            {activeTab === 'parents' && (
                                <div className="space-y-4">
                                    <div className="text-sm text-slate-500 mb-4">מי ההורים של {member.first_name}?</div>

                                    {/* Existing Parents */}
                                    {parents.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                    <Users size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{p.first_name} {p.last_name}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {PARENT_CHILD_TYPES.find(t => t.value === p.relationship_type)?.label}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveParentChild(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    {/* Add Parent Form */}
                                    <div className="flex gap-2 items-end border-t pt-4 mt-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium mb-1">בחר הורה</label>
                                            <select
                                                value={newParentId}
                                                onChange={e => setNewParentId(Number(e.target.value) || '')}
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                            >
                                                <option value="">בחר...</option>
                                                {availableForParent.map(m => (
                                                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-medium mb-1">סוג</label>
                                            <select
                                                value={newParentType}
                                                onChange={e => setNewParentType(e.target.value as ParentChildType)}
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                            >
                                                {PARENT_CHILD_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleAddParent}
                                            disabled={!newParentId}
                                            className="bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Children Tab */}
                            {activeTab === 'children' && (
                                <div className="space-y-4">
                                    <div className="text-sm text-slate-500 mb-4">מי הילדים של {member.first_name}?</div>

                                    {children.map(c => (
                                        <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                                    <Baby size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{c.first_name} {c.last_name}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {PARENT_CHILD_TYPES.find(t => t.value === c.relationship_type)?.label}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemoveParentChild(c.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="flex gap-2 items-end border-t pt-4 mt-4">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium mb-1">בחר ילד/ה</label>
                                            <select
                                                value={newChildId}
                                                onChange={e => setNewChildId(Number(e.target.value) || '')}
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                            >
                                                <option value="">בחר...</option>
                                                {availableForChild.map(m => (
                                                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-medium mb-1">סוג</label>
                                            <select
                                                value={newChildType}
                                                onChange={e => setNewChildType(e.target.value as ParentChildType)}
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                            >
                                                {PARENT_CHILD_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            onClick={handleAddChild}
                                            disabled={!newChildId}
                                            className="bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Partners Tab */}
                            {activeTab === 'partners' && (
                                <div className="space-y-4">
                                    <div className="text-sm text-slate-500 mb-4">בני/בנות זוג של {member.first_name}</div>

                                    {partnerships.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600">
                                                    <Heart size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-medium">{p.partner_first_name} {p.partner_last_name}</div>
                                                    <div className="text-xs text-slate-500">
                                                        {PARTNERSHIP_STATUSES.find(s => s.value === p.status)?.label}
                                                        {p.start_date && ` (${p.start_date.substring(0, 4)})`}
                                                    </div>
                                                </div>
                                            </div>
                                            <button onClick={() => handleRemovePartnership(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="flex gap-2 items-end border-t pt-4 mt-4 flex-wrap">
                                        <div className="flex-1 min-w-[150px]">
                                            <label className="block text-xs font-medium mb-1">בחר בן/בת זוג</label>
                                            <select
                                                value={newPartnerId}
                                                onChange={e => setNewPartnerId(Number(e.target.value) || '')}
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                            >
                                                <option value="">בחר...</option>
                                                {availableForPartner.map(m => (
                                                    <option key={m.id} value={m.id}>{m.first_name} {m.last_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-medium mb-1">סטטוס</label>
                                            <select
                                                value={newPartnerStatus}
                                                onChange={e => setNewPartnerStatus(e.target.value as PartnershipStatus)}
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                            >
                                                {PARTNERSHIP_STATUSES.map(s => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs font-medium mb-1">תאריך התחלה</label>
                                            <input
                                                type="date"
                                                value={newPartnerStartDate}
                                                onChange={e => setNewPartnerStartDate(e.target.value)}
                                                className="w-full p-2 rounded-lg border dark:bg-slate-700 dark:border-slate-600 text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddPartner}
                                            disabled={!newPartnerId}
                                            className="bg-purple-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                                        >
                                            <Plus size={18} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <button onClick={onClose} className="w-full py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">
                        סגור
                    </button>
                </div>
            </div>
        </div>
    );
};
