import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Trash2, Heart, Clock, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

interface Comment {
    id: number;
    content: string;
    guest_name?: string;
    likes_count: number;
    created_at: string;
    user_id?: number;
    user_display_name?: string;
    user_avatar?: string;
}

interface CommentsSectionProps {
    entryId: number;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ entryId }) => {
    const { user, isAuthenticated } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [content, setContent] = useState('');
    const [guestName, setGuestName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState('');

    const fetchComments = useCallback(async () => {
        try {
            const res = await apiService.get<{ comments: Comment[] }>(`/comments/${entryId}`);
            setComments(res.comments || []);
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        } finally {
            setIsLoading(false);
        }
    }, [entryId]);

    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        if (!isAuthenticated && !guestName.trim()) return;

        setIsSubmitting(true);
        setSubmitMessage('');

        try {
            const res = await apiService.post<{ success: boolean; status: string; message: string }>('/comments', {
                entryId,
                content: content.trim(),
                guestName: isAuthenticated ? undefined : guestName.trim(),
            });

            if (res.success) {
                setContent('');
                setGuestName('');
                setSubmitMessage(res.message);

                // Refresh comments if it was approved immediately
                if (res.status === 'approved') {
                    fetchComments();
                }
            }
        } catch (err) {
            console.error('Failed to submit comment:', err);
            setSubmitMessage('שגיאה בשליחת התגובה');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (commentId: number) => {
        if (!confirm('למחוק את התגובה?')) return;

        try {
            await apiService.delete(`/comments/${commentId}`);
            fetchComments();
        } catch (err) {
            console.error('Failed to delete comment:', err);
        }
    };

    const handleLike = async (commentId: number) => {
        if (!isAuthenticated) return;

        try {
            await apiService.post(`/comments/${commentId}/like`, {});
            fetchComments();
        } catch (err) {
            console.error('Failed to like comment:', err);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <MessageCircle size={20} />
                תגובות ({comments.length})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleSubmit} className="mb-6 space-y-3">
                {!isAuthenticated && (
                    <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="השם שלך"
                        className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required={!isAuthenticated}
                    />
                )}
                <div className="flex gap-2">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="הוסף תגובה..."
                        rows={2}
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isSubmitting || !content.trim()}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </div>
                {!isAuthenticated && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock size={12} />
                        תגובות אורחים ממתינות לאישור מנהל
                    </p>
                )}
                {submitMessage && (
                    <p className="text-sm text-green-600 dark:text-green-400">{submitMessage}</p>
                )}
            </form>

            {/* Comments List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : comments.length === 0 ? (
                <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    אין תגובות עדיין. היה הראשון להגיב!
                </p>
            ) : (
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <div
                            key={comment.id}
                            className="flex gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                        >
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                                {comment.user_avatar ? (
                                    <img
                                        src={comment.user_avatar}
                                        alt=""
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                        {comment.user_display_name || comment.guest_name || 'אורח'}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {formatDate(comment.created_at)}
                                    </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    {comment.content}
                                </p>

                                {/* Actions */}
                                <div className="flex items-center gap-4 mt-2">
                                    <button
                                        onClick={() => handleLike(comment.id)}
                                        disabled={!isAuthenticated}
                                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Heart size={14} />
                                        {comment.likes_count > 0 && comment.likes_count}
                                    </button>

                                    {isAuthenticated && String(user?.id) === String(comment.user_id) && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                            מחק
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CommentsSection;
