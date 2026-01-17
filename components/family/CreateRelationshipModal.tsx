import React, { useState } from 'react';
import { X, Heart, Users, Baby } from 'lucide-react';

interface CreateRelationshipModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceMember: { id: number; first_name: string; last_name?: string } | null;
    targetMember: { id: number; first_name: string; last_name?: string } | null;
    onCreateRelationship: (type: 'spouse' | 'parent' | 'child') => void;
}

export function CreateRelationshipModal({
    isOpen,
    onClose,
    sourceMember,
    targetMember,
    onCreateRelationship
}: CreateRelationshipModalProps) {
    if (!isOpen || !sourceMember || !targetMember) return null;

    const sourceName = `${sourceMember.first_name} ${sourceMember.last_name || ''}`.trim();
    const targetName = `${targetMember.first_name} ${targetMember.last_name || ''}`.trim();

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center" dir="rtl">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-700">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">יצירת קשר משפחתי</h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-slate-300 text-center mb-6">
                        בחר את סוג הקשר בין <span className="font-bold text-white">{sourceName}</span> ל-<span className="font-bold text-white">{targetName}</span>:
                    </p>

                    <div className="space-y-3">
                        {/* Spouse option */}
                        <button
                            onClick={() => onCreateRelationship('spouse')}
                            className="w-full bg-pink-600/20 hover:bg-pink-600/40 border border-pink-500/50 text-pink-300 px-6 py-4 rounded-xl flex items-center gap-4 transition-all group"
                        >
                            <div className="w-12 h-12 bg-pink-600/30 rounded-full flex items-center justify-center group-hover:bg-pink-600/50 transition-colors">
                                <Heart className="w-6 h-6 text-pink-400" />
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-lg text-pink-200">בני זוג</div>
                                <div className="text-sm text-pink-400">נשואים או בזוגיות</div>
                            </div>
                        </button>

                        {/* Parent option */}
                        <button
                            onClick={() => onCreateRelationship('parent')}
                            className="w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-300 px-6 py-4 rounded-xl flex items-center gap-4 transition-all group"
                        >
                            <div className="w-12 h-12 bg-blue-600/30 rounded-full flex items-center justify-center group-hover:bg-blue-600/50 transition-colors">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-lg text-blue-200">{sourceName} הורה של {targetName}</div>
                                <div className="text-sm text-blue-400">קשר הורה-ילד</div>
                            </div>
                        </button>

                        {/* Child option */}
                        <button
                            onClick={() => onCreateRelationship('child')}
                            className="w-full bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/50 text-emerald-300 px-6 py-4 rounded-xl flex items-center gap-4 transition-all group"
                        >
                            <div className="w-12 h-12 bg-emerald-600/30 rounded-full flex items-center justify-center group-hover:bg-emerald-600/50 transition-colors">
                                <Baby className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-lg text-emerald-200">{sourceName} ילד של {targetName}</div>
                                <div className="text-sm text-emerald-400">{targetName} הוא ההורה</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-slate-300 py-3 rounded-lg transition-colors"
                    >
                        ביטול
                    </button>
                </div>
            </div>
        </div>
    );
}
