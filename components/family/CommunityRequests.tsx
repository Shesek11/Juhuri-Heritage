import React, { useState, useEffect } from 'react';
import { familyService, MergeSuggestion, LinkRequest } from '../../services/familyService';
import { X, Check, XCircle, Users, Link2, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface CommunityRequestsProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CommunityRequests: React.FC<CommunityRequestsProps> = ({ isOpen, onClose, onSuccess }) => {
    const [activeTab, setActiveTab] = useState<'merge' | 'link'>('merge');
    const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>([]);
    const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [merges, links] = await Promise.all([
                familyService.getMergeSuggestions(),
                familyService.getLinkRequests()
            ]);
            setMergeSuggestions(merges);
            setLinkRequests(links);
        } catch (err) {
            console.error('Failed to load community requests:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMergeResponse = async (suggestion: MergeSuggestion, status: 'approved' | 'rejected', keepMemberId?: number) => {
        setProcessing(suggestion.id);
        try {
            await familyService.respondToMergeSuggestion(suggestion.id, status, keepMemberId);
            setMergeSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
            if (status === 'approved') {
                onSuccess();
            }
        } catch (err) {
            console.error('Failed to respond to merge:', err);
            alert('שגיאה בעדכון ההצעה');
        } finally {
            setProcessing(null);
        }
    };

    const handleLinkResponse = async (request: LinkRequest, status: 'approved' | 'rejected') => {
        setProcessing(request.id);
        try {
            await familyService.respondToLinkRequest(request.id, status);
            setLinkRequests(prev => prev.filter(r => r.id !== request.id));
            if (status === 'approved') {
                onSuccess();
            }
        } catch (err) {
            console.error('Failed to respond to link request:', err);
            alert('שגיאה בעדכון הבקשה');
        } finally {
            setProcessing(null);
        }
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 0.8) return 'text-green-600 bg-green-100';
        if (score >= 0.5) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getRelationshipLabel = (type: string) => {
        switch (type) {
            case 'same_person': return 'אותו אדם';
            case 'parent': return 'הורה';
            case 'child': return 'ילד/ה';
            case 'spouse': return 'בן/ת זוג';
            default: return type;
        }
    };

    if (!isOpen) return null;

    const totalCount = mergeSuggestions.length + linkRequests.length;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]" dir="rtl" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-l from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <Users className="text-blue-600" size={24} />
                                בקשות קהילה
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                {totalCount > 0 ? `${totalCount} בקשות ממתינות לאישור` : 'אין בקשות ממתינות'}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                            <X className="text-slate-400" size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={() => setActiveTab('merge')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'merge'
                                    ? 'bg-white dark:bg-slate-700 shadow text-blue-600'
                                    : 'text-slate-500 hover:bg-white/50'
                                }`}
                        >
                            <AlertTriangle size={16} />
                            הצעות מיזוג
                            {mergeSuggestions.length > 0 && (
                                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    {mergeSuggestions.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('link')}
                            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'link'
                                    ? 'bg-white dark:bg-slate-700 shadow text-purple-600'
                                    : 'text-slate-500 hover:bg-white/50'
                                }`}
                        >
                            <Link2 size={16} />
                            בקשות חיבור
                            {linkRequests.length > 0 && (
                                <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                                    {linkRequests.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin text-blue-500" size={32} />
                        </div>
                    ) : activeTab === 'merge' ? (
                        mergeSuggestions.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <AlertTriangle size={48} className="mx-auto mb-3 opacity-50" />
                                <p>אין הצעות מיזוג ממתינות</p>
                            </div>
                        ) : (
                            mergeSuggestions.map(suggestion => (
                                <div key={suggestion.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-600 overflow-hidden">
                                    {/* Summary */}
                                    <div
                                        className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        onClick={() => setExpandedId(expandedId === suggestion.id ? null : suggestion.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`px-2 py-1 rounded-full text-xs font-bold ${getConfidenceColor(suggestion.confidence_score)}`}>
                                                    {Math.round(suggestion.confidence_score * 100)}%
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {suggestion.member1_first} {suggestion.member1_last}
                                                    </span>
                                                    <span className="text-slate-400 mx-2">↔</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {suggestion.member2_first} {suggestion.member2_last}
                                                    </span>
                                                </div>
                                            </div>
                                            {expandedId === suggestion.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                        {suggestion.suggested_by_name && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                הוצע על ידי: {suggestion.suggested_by_name}
                                            </p>
                                        )}
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedId === suggestion.id && (
                                        <div className="p-4 border-t border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                {/* Member 1 */}
                                                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 dark:bg-blue-800 overflow-hidden mb-2">
                                                        {suggestion.member1_photo ? (
                                                            <img src={suggestion.member1_photo} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-blue-400 text-2xl">👤</div>
                                                        )}
                                                    </div>
                                                    <p className="font-bold">{suggestion.member1_first} {suggestion.member1_last}</p>
                                                    {suggestion.member1_birth && (
                                                        <p className="text-xs text-slate-500">{new Date(suggestion.member1_birth).getFullYear()}</p>
                                                    )}
                                                    <button
                                                        onClick={() => handleMergeResponse(suggestion, 'approved', suggestion.member1_id)}
                                                        disabled={processing === suggestion.id}
                                                        className="mt-2 w-full py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                                    >
                                                        {processing === suggestion.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                                        שמור את זה
                                                    </button>
                                                </div>

                                                {/* Member 2 */}
                                                <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                                                    <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-800 overflow-hidden mb-2">
                                                        {suggestion.member2_photo ? (
                                                            <img src={suggestion.member2_photo} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-purple-400 text-2xl">👤</div>
                                                        )}
                                                    </div>
                                                    <p className="font-bold">{suggestion.member2_first} {suggestion.member2_last}</p>
                                                    {suggestion.member2_birth && (
                                                        <p className="text-xs text-slate-500">{new Date(suggestion.member2_birth).getFullYear()}</p>
                                                    )}
                                                    <button
                                                        onClick={() => handleMergeResponse(suggestion, 'approved', suggestion.member2_id)}
                                                        disabled={processing === suggestion.id}
                                                        className="mt-2 w-full py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                                    >
                                                        {processing === suggestion.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                                        שמור את זה
                                                    </button>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => handleMergeResponse(suggestion, 'rejected')}
                                                disabled={processing === suggestion.id}
                                                className="w-full py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-1"
                                            >
                                                <XCircle size={14} />
                                                אלה לא אותו אדם
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )
                    ) : (
                        linkRequests.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Link2 size={48} className="mx-auto mb-3 opacity-50" />
                                <p>אין בקשות חיבור ממתינות</p>
                            </div>
                        ) : (
                            linkRequests.map(request => (
                                <div key={request.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-100 dark:border-slate-600">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-slate-200">
                                                {request.requester_name} מבקש/ת לחבר:
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-sm">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                    {request.source_first} {request.source_last}
                                                </span>
                                                <span className="text-slate-400">→</span>
                                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                                    {request.target_first} {request.target_last}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-2">
                                                סוג קשר: <strong>{getRelationshipLabel(request.relationship_type)}</strong>
                                            </p>
                                            {request.message && (
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 bg-white dark:bg-slate-800 p-2 rounded">
                                                    "{request.message}"
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => handleLinkResponse(request, 'approved')}
                                            disabled={processing === request.id}
                                            className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-1"
                                        >
                                            {processing === request.id ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                                            אשר
                                        </button>
                                        <button
                                            onClick={() => handleLinkResponse(request, 'rejected')}
                                            disabled={processing === request.id}
                                            className="flex-1 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-1"
                                        >
                                            <XCircle size={14} />
                                            דחה
                                        </button>
                                    </div>
                                </div>
                            ))
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
