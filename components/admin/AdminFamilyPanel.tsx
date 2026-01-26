// AdminFamilyPanel Component
// Admin interface for managing family tree merge suggestions and link requests

import React, { useState, useEffect } from 'react';
import { GitBranch, Users, CheckCircle, XCircle, AlertCircle, Loader2, User, Calendar, MapPin } from 'lucide-react';
import { familyService, MergeSuggestion, LinkRequest } from '../../services/familyService';

type TabType = 'merge' | 'link';

export const AdminFamilyPanel: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('merge');
    const [mergeSuggestions, setMergeSuggestions] = useState<MergeSuggestion[]>([]);
    const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [merges, links] = await Promise.all([
                familyService.getMergeSuggestions(),
                familyService.getLinkRequests()
            ]);
            setMergeSuggestions(merges);
            setLinkRequests(links);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'שגיאה בטעינת נתונים');
        } finally {
            setLoading(false);
        }
    };

    const handleMergeResponse = async (suggestionId: number, status: 'approved' | 'rejected', keepMemberId?: number) => {
        try {
            await familyService.respondToMergeSuggestion(suggestionId, status, keepMemberId);
            await loadData();
            alert(status === 'approved' ? 'המיזוג אושר בהצלחה!' : 'ההצעה נדחתה');
        } catch (err: any) {
            alert(err.message || 'שגיאה בעיבוד ההצעה');
        }
    };

    const handleLinkResponse = async (requestId: number, status: 'approved' | 'rejected') => {
        try {
            await familyService.respondToLinkRequest(requestId, status);
            await loadData();
            alert(status === 'approved' ? 'החיבור אושר בהצלחה!' : 'הבקשה נדחתה');
        } catch (err: any) {
            alert(err.message || 'שגיאה בעיבוד הבקשה');
        }
    };

    const renderMergeSuggestion = (suggestion: MergeSuggestion) => {
        const confidencePercent = Math.round(suggestion.confidence_score * 100);
        const confidenceColor = confidencePercent >= 80 ? 'text-green-600' : confidencePercent >= 50 ? 'text-amber-600' : 'text-red-600';

        return (
            <div key={suggestion.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                            הצעת מיזוג
                        </h3>
                        <span className={`text-sm font-medium ${confidenceColor}`}>
                            ({confidencePercent}% דמיון)
                        </span>
                    </div>
                    <div className="text-xs text-slate-500">
                        הוצע על ידי: {suggestion.suggested_by_name || 'מערכת'} • {new Date(suggestion.suggested_at).toLocaleDateString('he-IL')}
                    </div>
                </div>

                {/* Reason */}
                {suggestion.reason && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>סיבה:</strong> {suggestion.reason}
                        </p>
                    </div>
                )}

                {/* Two Members Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Member 1 */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center gap-3 mb-3">
                            {suggestion.member1_photo ? (
                                <img src={suggestion.member1_photo} alt="" className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                                    <User className="w-8 h-8 text-slate-500" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h4 className="font-semibold text-slate-800 dark:text-white">
                                    {suggestion.member1_first} {suggestion.member1_last}
                                </h4>
                                {suggestion.member1_birth && (
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(suggestion.member1_birth).toLocaleDateString('he-IL')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">
                            מזהה: #{suggestion.member1_id} • הוסף על ידי משתמש #{suggestion.member1_owner}
                        </div>
                    </div>

                    {/* Member 2 */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center gap-3 mb-3">
                            {suggestion.member2_photo ? (
                                <img src={suggestion.member2_photo} alt="" className="w-16 h-16 rounded-full object-cover" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center">
                                    <User className="w-8 h-8 text-slate-500" />
                                </div>
                            )}
                            <div className="flex-1">
                                <h4 className="font-semibold text-slate-800 dark:text-white">
                                    {suggestion.member2_first} {suggestion.member2_last}
                                </h4>
                                {suggestion.member2_birth && (
                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(suggestion.member2_birth).toLocaleDateString('he-IL')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">
                            מזהה: #{suggestion.member2_id} • הוסף על ידי משתמש #{suggestion.member2_owner}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => {
                            const keepId = confirm('איזה רשומה לשמור?\nאישור = רשומה ראשונה | ביטול = רשומה שנייה')
                                ? suggestion.member1_id
                                : suggestion.member2_id;
                            if (confirm('האם אתה בטוח? פעולה זו תמזג את שני הרשומות.')) {
                                handleMergeResponse(suggestion.id, 'approved', keepId);
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <CheckCircle className="w-4 h-4" />
                        אשר מיזוג
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('האם לדחות הצעה זו?')) {
                                handleMergeResponse(suggestion.id, 'rejected');
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        דחה הצעה
                    </button>
                </div>
            </div>
        );
    };

    const renderLinkRequest = (request: LinkRequest) => {
        const relationshipLabels: Record<string, string> = {
            same_person: 'אותו אדם',
            parent: 'הורה',
            child: 'ילד/ה',
            spouse: 'בן/בת זוג'
        };

        return (
            <div key={request.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <GitBranch className="w-5 h-5 text-blue-500" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                            בקשת חיבור: {relationshipLabels[request.relationship_type]}
                        </h3>
                    </div>
                    <div className="text-xs text-slate-500">
                        מבקש: {request.requester_name} • {new Date(request.created_at).toLocaleDateString('he-IL')}
                    </div>
                </div>

                {/* Message */}
                {request.message && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            <strong>הודעה:</strong> {request.message}
                        </p>
                    </div>
                )}

                {/* Source and Target */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Source Member */}
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                        <div className="text-xs text-slate-500 mb-2">מתוך עץ המבקש:</div>
                        <h4 className="font-semibold text-slate-800 dark:text-white">
                            {request.source_first} {request.source_last}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1">
                            מזהה: #{request.source_member_id}
                        </div>
                    </div>

                    {/* Target Member */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div className="text-xs text-slate-500 mb-2">מתוך עץ קיים:</div>
                        <h4 className="font-semibold text-slate-800 dark:text-white">
                            {request.target_first} {request.target_last}
                        </h4>
                        <div className="text-xs text-slate-500 mt-1">
                            מזהה: #{request.target_member_id} • בעלים: משתמש #{request.target_owner}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => {
                            if (confirm(`האם לאשר את החיבור כ-"${relationshipLabels[request.relationship_type]}"?`)) {
                                handleLinkResponse(request.id, 'approved');
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <CheckCircle className="w-4 h-4" />
                        אשר חיבור
                    </button>
                    <button
                        onClick={() => {
                            if (confirm('האם לדחות בקשה זו?')) {
                                handleLinkResponse(request.id, 'rejected');
                            }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        דחה בקשה
                    </button>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-16">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
                >
                    נסה שוב
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        <GitBranch className="w-8 h-8 text-amber-600" />
                        ניהול אילן יוחסין
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        אישור הצעות מיזוג ובקשות חיבור
                    </p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">הצעות מיזוג ממתינות</div>
                            <div className="text-2xl font-bold text-amber-600">{mergeSuggestions.length}</div>
                        </div>
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                    </div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">בקשות חיבור ממתינות</div>
                            <div className="text-2xl font-bold text-blue-600">{linkRequests.length}</div>
                        </div>
                        <Users className="w-8 h-8 text-blue-500" />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('merge')}
                        className={`px-4 py-2 border-b-2 transition-colors ${
                            activeTab === 'merge'
                                ? 'border-amber-500 text-amber-600 font-semibold'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            הצעות מיזוג ({mergeSuggestions.length})
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('link')}
                        className={`px-4 py-2 border-b-2 transition-colors ${
                            activeTab === 'link'
                                ? 'border-blue-500 text-blue-600 font-semibold'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            בקשות חיבור ({linkRequests.length})
                        </div>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === 'merge' && (
                    <>
                        {mergeSuggestions.length === 0 ? (
                            <div className="text-center py-16 text-slate-500">
                                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>אין הצעות מיזוג ממתינות</p>
                            </div>
                        ) : (
                            mergeSuggestions.map(renderMergeSuggestion)
                        )}
                    </>
                )}

                {activeTab === 'link' && (
                    <>
                        {linkRequests.length === 0 ? (
                            <div className="text-center py-16 text-slate-500">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>אין בקשות חיבור ממתינות</p>
                            </div>
                        ) : (
                            linkRequests.map(renderLinkRequest)
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default AdminFamilyPanel;
