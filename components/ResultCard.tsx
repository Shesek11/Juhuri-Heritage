import React, { useState } from 'react';
import { DictionaryEntry, Comment, Translation } from '../types';
import { Volume2, Copy, Check, Settings2, Heart, MessageCircle, Send, Loader2, ThumbsUp, ThumbsDown, Edit3, Bot, Users } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioUtils';
import apiService from '../services/apiService';
import { useAuth0 } from '@auth0/auth0-react';
import VoiceRecorder from './audio/VoiceRecorder';

/** Small badge showing the source of a field value */
const FieldSourceBadge: React.FC<{ source?: string }> = ({ source }) => {
  if (!source || source === 'import' || source === 'manual') return null;
  if (source === 'ai') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 mr-1" title="תוכן שנוצר על ידי AI">
        <Bot size={10} /> AI
      </span>
    );
  }
  if (source === 'community') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 mr-1" title="תרומה קהילתית">
        <Users size={10} /> קהילה
      </span>
    );
  }
  return null;
};

interface ResultCardProps {
  entry: DictionaryEntry;
  onOpenAuthModal: (reason?: string) => void;
  onSuggestCorrection?: (translation: Translation, entryId: string, term: string) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ entry, onOpenAuthModal, onSuggestCorrection }) => {
  const { isAuthenticated } = useAuth0();
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [voice, setVoice] = useState<'Zephyr' | 'Fenrir'>('Zephyr');

  // Community State
  const [isLiked, setIsLiked] = useState(entry.isLiked || false);
  const [likesCount, setLikesCount] = useState(entry.likesCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [guestName, setGuestName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Translation voting state - tracks votes per translation ID
  const [translationVotes, setTranslationVotes] = useState<Record<number, { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }>>(
    () => {
      const initialVotes: Record<number, { upvotes: number; downvotes: number; userVote: 'up' | 'down' | null }> = {};
      entry.translations.forEach(t => {
        if (t.id) {
          initialVotes[t.id] = {
            upvotes: t.upvotes || 0,
            downvotes: t.downvotes || 0,
            userVote: t.userVote || null
          };
        }
      });
      return initialVotes;
    }
  );
  const [submitMessage, setSubmitMessage] = useState('');

  const handlePlay = async (text: string, id: string) => {
    if (isPlaying) return;
    setIsPlaying(id);
    try {
      const audioData = await generateSpeech(text, voice);
      await playBase64Audio(audioData);
    } catch (error) {
      console.warn("Gemini TTS failed, falling back to browser TTS", error);
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const hasHebrew = /[\u0590-\u05FF]/.test(text);
        utterance.lang = hasHebrew ? 'he-IL' : 'en-US';
        utterance.onend = () => setIsPlaying(null);
        utterance.onerror = () => { setIsPlaying(null); alert("לא ניתן להשמיע את הטקסט."); };
        window.speechSynthesis.speak(utterance);
        return;
      } catch (browserError) {
        console.error("Browser TTS failed", browserError);
        alert("לא ניתן להשמיע את הטקסט.");
      }
    }
    setIsPlaying(null);
  };

  const copyToClipboard = () => {
    const allText = `${entry.term}\n${entry.translations.map(t => `${t.hebrew} | ${t.latin} | ${t.cyrillic}`).join('\n')}`;
    navigator.clipboard.writeText(allText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLike = async () => {
    if (!isAuthenticated) return onOpenAuthModal('כדי לאהוב ערכים במילון, יש להתחבר תחילה');
    if (!entry.id) return;

    // Optimistic UI
    setIsLiked(!isLiked);
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1);

    try {
      await apiService.post(`/dictionary/entries/${entry.id}/like`);
    } catch (err) {
      console.error("Like failed", err);
      // Revert
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
      } catch (err) {
        console.error("Failed to load comments", err);
      }
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
        // userId will be handled by backend from auth header
      });

      setNewComment('');
      setGuestName('');
      setSubmitMessage(res.message);

      // Reload comments if it was approved immediately
      if (res.status === 'approved') {
        const commentsRes = await apiService.get<{ comments: Comment[] }>(`/comments/${entry.id}`);
        setComments(commentsRes.comments || []);
      }
    } catch (err) {
      console.error("Post comment failed", err);
      setSubmitMessage('שגיאה בשליחת התגובה');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle translation voting
  const handleTranslationVote = async (translationId: number, voteType: 'up' | 'down') => {
    if (!isAuthenticated) return onOpenAuthModal('כדי להצביע על תרגומים, יש להתחבר תחילה');
    if (!translationId) return;

    const currentVote = translationVotes[translationId];
    const newUserVote = currentVote?.userVote === voteType ? null : voteType;

    // Optimistic UI update
    setTranslationVotes(prev => {
      const current = prev[translationId] || { upvotes: 0, downvotes: 0, userVote: null };
      let newUpvotes = current.upvotes;
      let newDownvotes = current.downvotes;

      // Remove previous vote
      if (current.userVote === 'up') newUpvotes--;
      if (current.userVote === 'down') newDownvotes--;

      // Add new vote
      if (newUserVote === 'up') newUpvotes++;
      if (newUserVote === 'down') newDownvotes++;

      return {
        ...prev,
        [translationId]: { upvotes: newUpvotes, downvotes: newDownvotes, userVote: newUserVote }
      };
    });

    try {
      await apiService.post(`/dictionary/translations/${translationId}/vote`, { voteType: newUserVote });
    } catch (err) {
      console.error('Vote failed', err);
      // Revert on error
      setTranslationVotes(prev => ({
        ...prev,
        [translationId]: currentVote || { upvotes: 0, downvotes: 0, userVote: null }
      }));
    }
  };

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden border border-slate-100 dark:border-slate-700 transition-all font-rubik">
      {/* Header */}
      <div className="p-6 bg-gradient-to-l from-indigo-500 to-purple-600 text-white relative">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-2 py-1 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">
                {entry.detectedLanguage === 'Hebrew' ? 'עברית' : 'ג\'והורי'}
              </span>
              {/* Source Indicator Badge */}
              {entry.source === 'AI' ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
                  <Bot size={12} /> תרגום AI
                </span>
              ) : entry.source === 'Community' ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
                  <Users size={12} /> תרומה קהילתית
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
                  ✓ מאגר קהילתי
                </span>
              )}
              {/* Part of Speech */}
              {entry.partOfSpeech && (
                <span className="inline-flex items-center px-2 py-1 bg-white/20 rounded-md text-xs font-medium backdrop-blur-sm">
                  {entry.partOfSpeech}
                </span>
              )}
            </div>
            <h2 className="text-4xl font-bold tracking-tight">{entry.term}</h2>
            {entry.pronunciationGuide && (
              <p className="text-indigo-100 font-mono text-sm opacity-90 dir-ltr text-right">{entry.pronunciationGuide}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 items-end">
            {/* Controls */}
            <div className="flex gap-2">
              {/* Voice Selection */}
              <div className="relative group">
                <button className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors" title="בחר קול">
                  <Settings2 size={20} />
                </button>
                <div className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-slate-800 rounded-lg shadow-xl p-1 hidden group-hover:block z-20 text-slate-800 dark:text-slate-200 text-sm">
                  <button onClick={() => setVoice('Zephyr')} className={`w-full text-right px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${voice === 'Zephyr' ? 'font-bold text-indigo-600' : ''}`}>קול אישה</button>
                  <button onClick={() => setVoice('Fenrir')} className={`w-full text-right px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${voice === 'Fenrir' ? 'font-bold text-indigo-600' : ''}`}>קול גבר</button>
                </div>
              </div>

              <button onClick={() => handlePlay(entry.term, 'main')} className={`p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors ${isPlaying === 'main' ? 'animate-pulse' : ''}`} title="השמע מקור">
                <Volume2 size={20} />
              </button>
              <button onClick={copyToClipboard} className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors" title="העתק">
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Definitions */}
        {entry.definitions.length > 0 && (
          <div className="text-slate-700 dark:text-slate-200 text-lg leading-relaxed border-b border-slate-100 dark:border-slate-700 pb-4 font-medium">
            <FieldSourceBadge source={entry.fieldSources?.definition} />
            {entry.definitions.join('; ')}
          </div>
        )}

        {/* Russian translation */}
        {entry.russian && (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700 pb-3">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">רוסית</span>
            <FieldSourceBadge source={entry.fieldSources?.russian} />
            <span className="font-serif text-lg" dir="ltr">{entry.russian}</span>
          </div>
        )}

        {/* Translations */}
        <div>
          <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3">תרגומים</h3>
          <div className="grid gap-4">
            {entry.translations.map((t, idx) => {
              const voteData = t.id ? translationVotes[t.id] : null;
              return (
                <div key={idx} className="relative p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors group border border-slate-100 dark:border-slate-700/50">
                  {/* Top-left: Play button */}
                  <div className="absolute top-3 left-3 flex gap-1">
                    <button
                      onClick={() => handlePlay(t.hebrew, `trans-${idx}`)}
                      className={`p-2 rounded-full text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all ${isPlaying === `trans-${idx}` ? 'text-indigo-600 opacity-100 animate-pulse' : ''}`}
                    >
                      <Volume2 size={20} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1 pr-2">
                    <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-rubik">
                      <FieldSourceBadge source={entry.fieldSources?.hebrew} />
                      {t.hebrew}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {t.dialect && t.dialect !== 'לא ידוע' && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-xs">{t.dialect}</span>
                      )}
                      {t.latin && (
                        <span className="text-slate-600 dark:text-slate-300 font-mono tracking-wide">
                          <FieldSourceBadge source={entry.fieldSources?.latin} />
                          {t.latin}
                        </span>
                      )}
                    </div>
                    {t.cyrillic && (
                      <div className="text-lg text-slate-500 dark:text-slate-400 font-serif">
                        <FieldSourceBadge source={entry.fieldSources?.cyrillic} />
                        {t.cyrillic}
                      </div>
                    )}

                    {/* Voting and Correction Row */}
                    <div className="flex items-center gap-3 mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
                      {/* Voting Buttons */}
                      {t.id && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleTranslationVote(t.id!, 'up')}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${voteData?.userVote === 'up'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                              }`}
                            title="הצבע לטובה"
                          >
                            <ThumbsUp size={14} />
                            <span className="font-bold">{voteData?.upvotes || 0}</span>
                          </button>
                          <button
                            onClick={() => handleTranslationVote(t.id!, 'down')}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-all ${voteData?.userVote === 'down'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600'
                              }`}
                            title="הצבע נגד"
                          >
                            <ThumbsDown size={14} />
                            <span className="font-bold">{voteData?.downvotes || 0}</span>
                          </button>
                        </div>
                      )}

                      {/* Suggest Correction Button */}
                      {entry.id && (
                        <button
                          onClick={() => onSuggestCorrection?.(t, entry.id!, entry.term)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                          title="הצע תיקון"
                        >
                          <Edit3 size={14} />
                          <span>הצע תיקון</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Examples */}
        {entry.examples.length > 0 && (
          <div>
            <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3">שימוש, פתגמים וברכות</h3>
            <div className="space-y-3">
              {entry.examples.map((ex, idx) => (
                <div key={idx} className="border-r-4 border-indigo-200 dark:border-indigo-900 pr-4 py-2 bg-slate-50/50 dark:bg-slate-800/50 rounded-r-lg">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-lg font-medium text-slate-800 dark:text-slate-200">{ex.origin}</p>
                    <button onClick={() => handlePlay(ex.origin, `ex-orig-${idx}`)} className={`text-slate-300 hover:text-indigo-500 transition-colors ${isPlaying === `ex-orig-${idx}` ? 'text-indigo-500 animate-pulse' : ''}`}>
                      <Volume2 size={16} />
                    </button>
                  </div>
                  {ex.transliteration && <p className="text-sm text-slate-500 font-mono mb-1 dir-ltr text-right">{ex.transliteration}</p>}
                  <p className="text-slate-600 dark:text-slate-400">{ex.translated}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Voice Recording */}
        {entry.id && (
          <VoiceRecorder entryId={entry.id} />
        )}

        {/* Community Actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${isLiked ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
              <span className="font-bold">{likesCount}</span>
            </button>

            <button
              onClick={toggleComments}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${showComments ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <MessageCircle size={20} />
              <span className="font-bold">{entry.commentsCount || 0}</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="animate-in fade-in slide-in-from-top-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 space-y-4">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">תגובות בקהילה</h4>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {comments.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">אין עדיין תגובות. היה הראשון להגיב!</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{c.user_name}</span>
                      <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-sm mt-1">{c.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={submitComment} className="space-y-2">
              {!isAuthenticated && (
                <input
                  type="text"
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  placeholder="השם שלך"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="הוסף תגובה, דוגמה או הערה..."
                  required
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newComment.trim() || (!isAuthenticated && !guestName.trim())}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                </button>
              </div>
              {!isAuthenticated && (
                <p className="text-xs text-slate-500 dark:text-slate-400">⏳ תגובות אורחים ממתינות לאישור מנהל</p>
              )}
              {submitMessage && (
                <p className="text-sm text-green-600 dark:text-green-400">{submitMessage}</p>
              )}
            </form>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResultCard;