import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, MessageCircle, Send, Loader2 } from 'lucide-react';
import { DictionaryEntry, Comment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/apiService';

interface CommunityActionsProps {
  entry: DictionaryEntry;
  onOpenAuthModal: (reason?: string) => void;
}

const CommunityActions: React.FC<CommunityActionsProps> = ({ entry, onOpenAuthModal }) => {
  const { isAuthenticated } = useAuth();
  const t = useTranslations('community');
  const [isLiked, setIsLiked] = useState(entry.isLiked || false);
  const [likesCount, setLikesCount] = useState(entry.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleLike = async () => {
    if (!isAuthenticated) return onOpenAuthModal(t('likeAuth'));
    if (!entry.id) return;
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    try {
      await apiService.post(`/dictionary/entries/${entry.id}/like`);
    } catch {
      setIsLiked(!isLiked);
      setLikesCount(prev => isLiked ? prev - 1 : prev + 1);
    }
  };

  const toggleComments = async () => {
    setShowComments(!showComments);
    if (!showComments && !commentsLoaded && entry.id) {
      try {
        const res = await apiService.get<{ comments: Comment[] }>(`/comments/${entry.id}`);
        setComments(res.comments || []);
        setCommentsLoaded(true);
      } catch { /* ignore */ }
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !entry.id) return;
    if (!isAuthenticated && !guestName.trim()) return;
    setIsSubmitting(true);
    setSubmitMessage('');
    try {
      const res = await apiService.post<{ success: boolean; status: string; message: string }>('/comments', {
        entryId: entry.id,
        content: newComment.trim(),
        guestName: isAuthenticated ? undefined : guestName.trim(),
      });
      setNewComment('');
      setGuestName('');
      setSubmitMessage(res.message);
      if (res.status === 'approved') {
        const commentsRes = await apiService.get<{ comments: Comment[] }>(`/comments/${entry.id}`);
        setComments(commentsRes.comments || []);
      }
    } catch {
      setSubmitMessage(t('commentError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLike}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${isLiked ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
            <span className="font-bold">{likesCount}</span>
          </button>
          <button
            type="button"
            onClick={toggleComments}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${showComments ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-400 hover:bg-white/5'}`}
          >
            <MessageCircle size={20} />
            <span className="font-bold">{entry.commentsCount || 0}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <div className="animate-in fade-in slide-in-from-top-2 bg-white/5/50 rounded-xl p-4 space-y-4">
          <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">{t('commentsTitle')}</h4>
          <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
            {comments.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">{t('noComments')}</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="bg-[#0d1424]/60 backdrop-blur-xl p-3 rounded-lg shadow-sm border border-white/10">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{c.user_name}</span>
                    <span className="text-[11px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">{c.content}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={submitComment} className="space-y-2">
            {!isAuthenticated && (
              <input type="text" value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={t('yourName')} required className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none" />
            )}
            <div className="flex gap-2">
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={t('commentPlaceholder')} required className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-sm focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none" />
              <button type="submit" disabled={isSubmitting || !newComment.trim() || (!isAuthenticated && !guestName.trim())} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
            {!isAuthenticated && <p className="text-xs text-slate-400 dark:text-slate-400">{t('guestModeration')}</p>}
            {submitMessage && <p className="text-sm text-green-600 dark:text-green-400">{submitMessage}</p>}
          </form>
        </div>
      )}
    </>
  );
};

export default CommunityActions;
