import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Mic, Check, XCircle, Play, Pause, RefreshCw, Loader2, Edit3 } from 'lucide-react';
import apiService from '../../services/apiService';

interface PendingComment {
    id: number;
    content: string;
    guest_name?: string;
    created_at: string;
    entry_id: number;
    entry_term?: string;
}

interface PendingRecording {
    id: number;
    file_url: string;
    created_at: string;
    entry_id: number;
    entry_term?: string;
    duration_seconds?: number;
}

interface PendingSuggestion {
    id: number;
    entry_id: number;
    term: string;
    field_name: string;
    suggested_hebrew: string;
    suggested_latin: string;
    suggested_cyrillic: string;
    suggested_russian: string;
    reason: string;
    user_name: string;
    created_at: string;
}

const FIELD_LABELS: Record<string, string> = {
    hebrew: 'תרגום עברי',
    latin: 'תעתיק לטיני',
    cyrillic: 'כתב קירילי',
    russian: 'רוסית',
    definition: 'הגדרה',
    pronunciationGuide: 'מדריך הגייה',
    partOfSpeech: 'חלק דיבר',
};

interface MobileAdminPanelProps {
    onClose: () => void;
}

const MobileAdminPanel: React.FC<MobileAdminPanelProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'comments' | 'recordings' | 'suggestions'>('comments');
    const [pendingComments, setPendingComments] = useState<PendingComment[]>([]);
    const [pendingRecordings, setPendingRecordings] = useState<PendingRecording[]>([]);
    const [pendingSuggestions, setPendingSuggestions] = useState<PendingSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    const audioRef = React.useRef<HTMLAudioElement | null>(null);

    const fetchPendingItems = async () => {
        setIsLoading(true);
        try {
            const [commentsRes, recordingsRes, suggestionsRes] = await Promise.all([
                apiService.get<{ comments: PendingComment[] }>('/comments/admin/pending'),
                apiService.get<{ recordings: PendingRecording[] }>('/recordings/admin/pending'),
                apiService.get<{ suggestions: PendingSuggestion[] }>('/dictionary/pending-suggestions').catch(() => ({ suggestions: [] }))
            ]);
            setPendingComments(commentsRes.comments || []);
            setPendingRecordings(recordingsRes.recordings || []);
            setPendingSuggestions(suggestionsRes.suggestions || []);
        } catch (err) {
            console.error('Failed to fetch pending items:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingItems();
    }, []);

    const handleCommentAction = async (id: number, action: 'approve' | 'reject') => {
        setActionLoading(id);
        try {
            await apiService.post(`/comments/${id}/${action}`);
            setPendingComments(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error(`Failed to ${action} comment:`, err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRecordingAction = async (id: number, action: 'approve' | 'reject') => {
        setActionLoading(id);
        try {
            await apiService.post(`/recordings/${id}/${action}`);
            setPendingRecordings(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            console.error(`Failed to ${action} recording:`, err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleSuggestionAction = async (id: number, action: 'approve' | 'reject') => {
        setActionLoading(id);
        try {
            await apiService.put(`/dictionary/suggestions/${id}/${action}`);
            setPendingSuggestions(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            console.error(`Failed to ${action} suggestion:`, err);
        } finally {
            setActionLoading(null);
        }
    };

    const getSuggestionValue = (s: PendingSuggestion): string => {
        if (s.field_name === 'hebrew') return s.suggested_hebrew;
        if (s.field_name === 'latin') return s.suggested_latin;
        if (s.field_name === 'cyrillic') return s.suggested_cyrillic;
        if (s.field_name === 'russian') return s.suggested_russian;
        return s.suggested_hebrew || s.suggested_latin || '';
    };

    const togglePlayRecording = (recording: PendingRecording) => {
        if (playingId === recording.id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.src = recording.file_url;
                audioRef.current.play();
                setPlayingId(recording.id);
            }
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/90 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    🛡️ לוח ניהול
                </h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchPendingItems}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                        title="רענן"
                    >
                        <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'comments'
                            ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <MessageCircle size={18} />
                    תגובות ({pendingComments.length})
                </button>
                <button
                    onClick={() => setActiveTab('recordings')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'recordings'
                            ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Mic size={18} />
                    הקלטות ({pendingRecordings.length})
                </button>
                <button
                    onClick={() => setActiveTab('suggestions')}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'suggestions'
                            ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Edit3 size={18} />
                    הצעות ({pendingSuggestions.length})
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="animate-spin text-amber-500" size={32} />
                    </div>
                ) : activeTab === 'comments' ? (
                    pendingComments.length === 0 ? (
                        <p className="text-center text-slate-500 py-12">אין תגובות ממתינות 🎉</p>
                    ) : (
                        pendingComments.map((comment) => (
                            <div
                                key={comment.id}
                                className="bg-slate-800 rounded-xl p-4 space-y-3"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-amber-400 font-medium">
                                            {comment.guest_name || 'אורח'}
                                        </span>
                                        <span className="text-slate-500 text-xs mr-2">
                                            {formatDate(comment.created_at)}
                                        </span>
                                    </div>
                                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                        {comment.entry_term || `#${comment.entry_id}`}
                                    </span>
                                </div>
                                <p className="text-slate-200 text-sm leading-relaxed">
                                    {comment.content}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleCommentAction(comment.id, 'approve')}
                                        disabled={actionLoading === comment.id}
                                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading === comment.id ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                        אשר
                                    </button>
                                    <button
                                        onClick={() => handleCommentAction(comment.id, 'reject')}
                                        disabled={actionLoading === comment.id}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <XCircle size={16} />
                                        דחה
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                ) : activeTab === 'recordings' ? (
                    pendingRecordings.length === 0 ? (
                        <p className="text-center text-slate-500 py-12">אין הקלטות ממתינות 🎉</p>
                    ) : (
                        pendingRecordings.map((recording) => (
                            <div
                                key={recording.id}
                                className="bg-slate-800 rounded-xl p-4 space-y-3"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                        {recording.entry_term || `#${recording.entry_id}`}
                                    </span>
                                    <span className="text-slate-500 text-xs">
                                        {formatDate(recording.created_at)}
                                    </span>
                                </div>

                                {/* Audio Player */}
                                <button
                                    onClick={() => togglePlayRecording(recording)}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2"
                                >
                                    {playingId === recording.id ? <Pause size={20} /> : <Play size={20} />}
                                    {playingId === recording.id ? 'עצור' : 'נגן הקלטה'}
                                    {recording.duration_seconds && (
                                        <span className="text-xs opacity-70">
                                            ({Math.floor(recording.duration_seconds / 60)}:{String(recording.duration_seconds % 60).padStart(2, '0')})
                                        </span>
                                    )}
                                </button>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleRecordingAction(recording.id, 'approve')}
                                        disabled={actionLoading === recording.id}
                                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading === recording.id ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                        אשר
                                    </button>
                                    <button
                                        onClick={() => handleRecordingAction(recording.id, 'reject')}
                                        disabled={actionLoading === recording.id}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <XCircle size={16} />
                                        דחה ומחק
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                ) : (
                    pendingSuggestions.length === 0 ? (
                        <p className="text-center text-slate-500 py-12">אין הצעות שדה ממתינות 🎉</p>
                    ) : (
                        pendingSuggestions.map((suggestion) => (
                            <div
                                key={suggestion.id}
                                className="bg-slate-800 rounded-xl p-4 space-y-3"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-amber-400 font-medium">
                                            {suggestion.user_name || 'אורח'}
                                        </span>
                                        <span className="text-slate-500 text-xs mr-2">
                                            {formatDate(suggestion.created_at)}
                                        </span>
                                    </div>
                                    <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded">
                                        {suggestion.term}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-indigo-400 font-bold bg-indigo-900/30 px-2 py-0.5 rounded">
                                            {FIELD_LABELS[suggestion.field_name] || suggestion.field_name}
                                        </span>
                                    </div>
                                    <p className="text-slate-200 text-sm font-medium" dir="auto">
                                        {getSuggestionValue(suggestion)}
                                    </p>
                                    {suggestion.reason && (
                                        <p className="text-slate-400 text-xs">
                                            סיבה: {suggestion.reason}
                                        </p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleSuggestionAction(suggestion.id, 'approve')}
                                        disabled={actionLoading === suggestion.id}
                                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {actionLoading === suggestion.id ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                        אשר
                                    </button>
                                    <button
                                        onClick={() => handleSuggestionAction(suggestion.id, 'reject')}
                                        disabled={actionLoading === suggestion.id}
                                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <XCircle size={16} />
                                        דחה
                                    </button>
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* Hidden audio element */}
            <audio
                ref={audioRef}
                onEnded={() => setPlayingId(null)}
                className="hidden"
            />
        </div>
    );
};

export default MobileAdminPanel;
