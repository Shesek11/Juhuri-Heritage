import React, { useState, useEffect } from 'react';
import { familyService, FamilyMember } from '../../services/familyService';
import { Network, ArrowRight } from 'lucide-react';

interface ConnectNodesModalProps {
    isOpen: boolean;
    sourceNodeId: string | null;
    targetNodeId: string | null;
    allMembers: FamilyMember[];
    onClose: () => void;
    onSuccess: () => void;
}

export const ConnectNodesModal: React.FC<ConnectNodesModalProps> = ({
    isOpen,
    sourceNodeId,
    targetNodeId,
    allMembers,
    onClose,
    onSuccess
}) => {
    const [relationshipType, setRelationshipType] = useState<'parent' | 'child' | 'spouse'>('parent');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !sourceNodeId || !targetNodeId) return null;

    const sourceMember = allMembers.find(m => m.id.toString() === sourceNodeId);
    const targetMember = allMembers.find(m => m.id.toString() === targetNodeId);

    if (!sourceMember || !targetMember) return null;

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Check if current user is owner of source or target (simple permission check)
            // Ideally we check ownership properly, but for now we try to create relationship directly
            // If backend fails due to permission, we'll try to create a link request

            if (relationshipType === 'parent') {
                // target IS PARENT OF source
                // Wait, usually drag is Source -> Target.
                // If I drag from Son to Father, usually means "Connect Son to Father".
                // Let's assume Drag Source = "Subject", Drag Target = "Object".
                // "Connect Source as [Type] of Target".
                // Let's make it explicit in UI.

                await familyService.addParentChild({
                    parent_id: parseInt(targetNodeId),
                    child_id: parseInt(sourceNodeId),
                    relationship_type: 'biological'
                });
            } else if (relationshipType === 'child') {
                // target IS CHILD OF source
                await familyService.addParentChild({
                    parent_id: parseInt(sourceNodeId),
                    child_id: parseInt(targetNodeId),
                    relationship_type: 'biological'
                });
            } else if (relationshipType === 'spouse') {
                await familyService.addPartnership({
                    person1_id: parseInt(sourceNodeId),
                    person2_id: parseInt(targetNodeId),
                    status: 'married'
                });
            }

            onSuccess();
            onClose();
        } catch (err: any) {
            // If error is 403, suggest creating a request
            if (err.message && err.message.includes('permission')) {
                try {
                    await familyService.createLinkRequest(
                        parseInt(sourceNodeId),
                        parseInt(targetNodeId),
                        relationshipType,
                        'נוצר בגרירה בממשק'
                    );
                    alert('הבקשה נשלחה לאישור הבעלים של הפרופיל');
                    onClose();
                } catch (reqErr) {
                    alert('שגיאה ביצירת הקשר');
                }
            } else {
                alert('שגיאה ביצירת הקשר: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-xl p-6" dir="rtl" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Network className="text-blue-600" />
                    חיבור אנשים
                </h2>

                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-4 rounded-xl mb-6">
                    <div className="text-center">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{sourceMember.first_name} {sourceMember.last_name}</div>
                        <div className="text-xs text-slate-500">מקור</div>
                    </div>
                    <ArrowRight className="text-slate-400" />
                    <div className="text-center">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{targetMember.first_name} {targetMember.last_name}</div>
                        <div className="text-xs text-slate-500">יעד</div>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    <p className="font-medium text-sm">איך הם קשורים?</p>

                    <button
                        onClick={() => setRelationshipType('child')}
                        className={`w-full p-3 rounded-xl border-2 text-right transition-all ${relationshipType === 'child'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700'
                                : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <span className="font-bold block">{targetMember.first_name} הוא/היא הילד/ה של {sourceMember.first_name}</span>
                    </button>

                    <button
                        onClick={() => setRelationshipType('parent')}
                        className={`w-full p-3 rounded-xl border-2 text-right transition-all ${relationshipType === 'parent'
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700'
                                : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <span className="font-bold block">{targetMember.first_name} הוא/היא ההורה של {sourceMember.first_name}</span>
                    </button>

                    <button
                        onClick={() => setRelationshipType('spouse')}
                        className={`w-full p-3 rounded-xl border-2 text-right transition-all ${relationshipType === 'spouse'
                                ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700'
                                : 'border-slate-100 dark:border-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <span className="font-bold block">{targetMember.first_name} הוא/היא בן/בת הזוג של {sourceMember.first_name}</span>
                    </button>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">ביטול</button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'מחבר...' : 'צור קשר'}
                    </button>
                </div>
            </div>
        </div>
    );
};
