import React, { useState } from 'react';
import { DictionaryEntry, Comment, Translation } from '../types';
import { Volume2, Copy, Check, CheckCircle, Settings2, Heart, MessageCircle, Send, Loader2, ThumbsUp, ThumbsDown, Edit3, Bot, Users, Pencil, X as XIcon, Plus, Info } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';
import { playBase64Audio } from '../utils/audioUtils';
import apiService from '../services/apiService';
import { useAuth } from '../contexts/AuthContext';
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
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 mr-1" title="תרומה קהילתית">
        <Users size={10} /> קהילה
      </span>
    );
  }
  return null;
};

/** Field label map for Hebrew display */
const FIELD_LABELS: Record<string, string> = {
  hebrew: 'תרגום עברי',
  latin: 'תעתיק לטיני',
  cyrillic: 'כתב קירילי',
  russian: 'רוסית',
  definition: 'הגדרה',
  pronunciationGuide: 'מדריך הגייה',
  partOfSpeech: 'חלק דיבר',
};

/** Inline field edit form */
const FieldEditForm: React.FC<{
  entryId: string;
  fieldName: string;
  currentValue: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ entryId, fieldName, currentValue, onClose, onSuccess }) => {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      await apiService.post(`/dictionary/entries/${entryId}/suggest-field`, {
        fieldName,
        currentValue,
        suggestedValue: value.trim(),
        reason: reason.trim() || undefined,
      });
      setMessage('ההצעה נשלחה בהצלחה!');
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err: any) {
      setMessage(err.message || 'שגיאה בשליחת ההצעה');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800 space-y-2 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
          הצע תיקון ל{FIELD_LABELS[fieldName] || fieldName}
        </span>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" title="סגור">
          <XIcon size={14} />
        </button>
      </div>
      {currentValue && (
        <div className="text-xs text-slate-500 dark:text-slate-400">
          ערך נוכחי: <span className="font-medium">{currentValue}</span>
        </div>
      )}
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="הערך המוצע..."
        required
        autoFocus
        className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        dir="auto"
      />
      <input
        type="text"
        value={reason}
        onChange={e => setReason(e.target.value)}
        placeholder="סיבה / מקור (אופציונלי)"
        className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
        dir="auto"
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          שלח הצעה
        </button>
        {message && (
          <span className={`text-xs ${message.includes('שגיאה') ? 'text-red-500' : 'text-green-600'}`}>
            {message}
          </span>
        )}
      </div>
    </form>
  );
};

/** Inline pencil button for editing a field */
const FieldEditButton: React.FC<{
  entryId?: string;
  fieldName: string;
  currentValue: string;
  editingField: string | null;
  onStartEdit: (fieldName: string) => void;
  onCloseEdit: () => void;
}> = ({ entryId, fieldName, onStartEdit }) => {
  if (!entryId) return null;

  return (
    <button
      type="button"
      onClick={() => onStartEdit(fieldName)}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors opacity-0 group-hover:opacity-100"
      title={`הצע תיקון ל${FIELD_LABELS[fieldName] || fieldName}`}
    >
      <Pencil size={10} />
      ערוך
    </button>
  );
};

/** Confirm AI button - saves AI-generated value to DB */
const ConfirmAiButton: React.FC<{
  entryId?: string;
  fieldName: string;
  value: string;
  source?: string;
}> = ({ entryId, fieldName, value, source }) => {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!entryId || source !== 'ai' || confirmed) return null;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await apiService.post(`/dictionary/entries/${entryId}/confirm-ai-field`, {
        fieldName,
        value,
      });
      setConfirmed(true);
    } catch (err) {
      console.error('Confirm AI failed:', err);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleConfirm}
      disabled={confirming}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors opacity-0 group-hover:opacity-100"
      title="אשר את ערך ה-AI ושמור במאגר"
    >
      {confirming ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle size={10} />}
      אשר
    </button>
  );
};

interface ResultCardProps {
  entry: DictionaryEntry;
  onOpenAuthModal: (reason?: string) => void;
  onSuggestCorrection?: (translation: Translation, entryId: string, term: string) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ entry, onOpenAuthModal, onSuggestCorrection }) => {
  const { isAuthenticated } = useAuth();
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

  // Per-field editing state
  const [editingField, setEditingField] = useState<string | null>(null);

  // Community proverb state
  const [showProverbForm, setShowProverbForm] = useState(false);
  const [proverbOrigin, setProverbOrigin] = useState('');
  const [proverbTranslated, setProverbTranslated] = useState('');
  const [proverbTranslit, setProverbTranslit] = useState('');
  const [proverbSubmitting, setProverbSubmitting] = useState(false);
  const [proverbMessage, setProverbMessage] = useState('');
  const [communityExamples, setCommunityExamples] = useState<any[]>([]);
  const [communityExamplesLoaded, setCommunityExamplesLoaded] = useState(false);

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

  // Load community examples when examples section is visible
  const loadCommunityExamples = async () => {
    if (communityExamplesLoaded || !entry.id) return;
    try {
      const res = await apiService.get<{ directExamples: any[]; linkedExamples: any[] }>(`/dictionary/entries/${entry.id}/community-examples`);
      setCommunityExamples([...(res.directExamples || []), ...(res.linkedExamples || [])]);
      setCommunityExamplesLoaded(true);
    } catch {
      setCommunityExamplesLoaded(true);
    }
  };

  // Load community examples on mount if entry has examples section
  React.useEffect(() => {
    if (entry.id) loadCommunityExamples();
  }, [entry.id]);

  const submitProverb = async () => {
    if (!proverbOrigin.trim() || !entry.id) return;
    setProverbSubmitting(true);
    setProverbMessage('');
    try {
      await apiService.post(`/dictionary/entries/${entry.id}/suggest-example`, {
        origin: proverbOrigin.trim(),
        translated: proverbTranslated.trim() || undefined,
        transliteration: proverbTranslit.trim() || undefined,
      });
      setProverbMessage('הפתגם נשלח לאישור. תודה!');
      setProverbOrigin('');
      setProverbTranslated('');
      setProverbTranslit('');
      setTimeout(() => { setShowProverbForm(false); setProverbMessage(''); }, 2500);
    } catch {
      setProverbMessage('שגיאה בשליחת הפתגם');
    } finally {
      setProverbSubmitting(false);
    }
  };

  return (
    <div className="group relative w-full max-w-2xl bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/10 transition-all duration-500 hover:-translate-y-1 hover:border-amber-500/40 hover:bg-[#0d1424]/90 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] font-rubik">
      {/* Subtle top gradient line */}
      <div className="absolute z-50 top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/80 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
      {/* Header */}
      <div className="p-6 bg-gradient-to-br from-white/10 to-transparent border-b border-white/10 text-white relative">
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
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/80 rounded-md text-xs font-medium backdrop-blur-sm">
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
                <div className="absolute top-full left-0 mt-2 w-32 bg-[#0d1424]/60 backdrop-blur-xl rounded-lg shadow-xl p-1 hidden group-hover:block z-20 text-slate-200 text-sm">
                  <button onClick={() => setVoice('Zephyr')} className={`w-full text-right px-3 py-2 rounded-md hover:bg-white/10 ${voice === 'Zephyr' ? 'font-bold text-indigo-600' : ''}`}>קול אישה</button>
                  <button onClick={() => setVoice('Fenrir')} className={`w-full text-right px-3 py-2 rounded-md hover:bg-white/10 ${voice === 'Fenrir' ? 'font-bold text-indigo-600' : ''}`}>קול גבר</button>
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
          <div className="text-slate-700 dark:text-slate-200 text-lg leading-relaxed border-b border-white/10 pb-4 font-medium group">
            <div className="flex items-start gap-1">
              <div className="flex-1">
                <FieldSourceBadge source={entry.fieldSources?.definition} />
                {entry.definitions.join('; ')}
              </div>
              <ConfirmAiButton entryId={entry.id} fieldName="definition" value={entry.definitions.join('; ')} source={entry.fieldSources?.definition} />
              <FieldEditButton
                entryId={entry.id}
                fieldName="definition"
                currentValue={entry.definitions.join('; ')}
                editingField={editingField}
                onStartEdit={setEditingField}
                onCloseEdit={() => setEditingField(null)}
              />
            </div>
            {editingField === 'definition' && entry.id && (
              <FieldEditForm
                entryId={entry.id}
                fieldName="definition"
                currentValue={entry.definitions.join('; ')}
                onClose={() => setEditingField(null)}
                onSuccess={() => { }}
              />
            )}
          </div>
        )}

        {/* Russian translation */}
        {entry.russian && (
          <div className="border-b border-white/10 pb-3 group">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">רוסית</span>
              <FieldSourceBadge source={entry.fieldSources?.russian} />
              <span className="font-serif text-lg flex-1" dir="ltr">{entry.russian}</span>
              <ConfirmAiButton entryId={entry.id} fieldName="russian" value={entry.russian} source={entry.fieldSources?.russian} />
              <FieldEditButton
                entryId={entry.id}
                fieldName="russian"
                currentValue={entry.russian}
                editingField={editingField}
                onStartEdit={setEditingField}
                onCloseEdit={() => setEditingField(null)}
              />
            </div>
            {editingField === 'russian' && entry.id && (
              <FieldEditForm
                entryId={entry.id}
                fieldName="russian"
                currentValue={entry.russian}
                onClose={() => setEditingField(null)}
                onSuccess={() => { }}
              />
            )}
          </div>
        )}

        {/* Translations */}
        <div>
          <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold mb-3">תרגומים</h3>
          <div className="grid gap-4">
            {entry.translations.map((t, idx) => {
              const voteData = t.id ? translationVotes[t.id] : null;
              return (
                <div key={idx} className="relative p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group border border-white/10">
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
                    <div className="text-2xl font-bold text-slate-100 font-rubik flex items-center gap-1">
                      <FieldSourceBadge source={entry.fieldSources?.hebrew} />
                      <span className="flex-1">{t.hebrew}</span>
                      <ConfirmAiButton entryId={entry.id} fieldName="hebrew" value={t.hebrew} source={entry.fieldSources?.hebrew} />
                      <FieldEditButton
                        entryId={entry.id}
                        fieldName="hebrew"
                        currentValue={t.hebrew}
                        editingField={editingField}
                        onStartEdit={setEditingField}
                        onCloseEdit={() => setEditingField(null)}
                      />
                    </div>
                    {editingField === 'hebrew' && entry.id && (
                      <FieldEditForm entryId={entry.id} fieldName="hebrew" currentValue={t.hebrew} onClose={() => setEditingField(null)} onSuccess={() => { }} />
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      {t.dialect && t.dialect !== 'לא ידוע' && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded text-xs">{t.dialect}</span>
                      )}
                      {t.latin && (
                        <span className="text-slate-600 dark:text-slate-300 font-mono tracking-wide flex items-center gap-1">
                          <FieldSourceBadge source={entry.fieldSources?.latin} />
                          {t.latin}
                          <ConfirmAiButton entryId={entry.id} fieldName="latin" value={t.latin} source={entry.fieldSources?.latin} />
                          <FieldEditButton
                            entryId={entry.id}
                            fieldName="latin"
                            currentValue={t.latin}
                            editingField={editingField}
                            onStartEdit={setEditingField}
                            onCloseEdit={() => setEditingField(null)}
                          />
                        </span>
                      )}
                    </div>
                    {editingField === 'latin' && entry.id && (
                      <FieldEditForm entryId={entry.id} fieldName="latin" currentValue={t.latin} onClose={() => setEditingField(null)} onSuccess={() => { }} />
                    )}
                    {t.cyrillic && (
                      <div className="text-lg text-slate-500 dark:text-slate-400 font-serif flex items-center gap-1">
                        <FieldSourceBadge source={entry.fieldSources?.cyrillic} />
                        {t.cyrillic}
                        <ConfirmAiButton entryId={entry.id} fieldName="cyrillic" value={t.cyrillic} source={entry.fieldSources?.cyrillic} />
                        <FieldEditButton
                          entryId={entry.id}
                          fieldName="cyrillic"
                          currentValue={t.cyrillic}
                          editingField={editingField}
                          onStartEdit={setEditingField}
                          onCloseEdit={() => setEditingField(null)}
                        />
                      </div>
                    )}
                    {editingField === 'cyrillic' && entry.id && (
                      <FieldEditForm entryId={entry.id} fieldName="cyrillic" currentValue={t.cyrillic} onClose={() => setEditingField(null)} onSuccess={() => { }} />
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
                              : 'text-slate-400 hover:bg-white/10'
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
                              : 'text-slate-400 hover:bg-white/10'
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

        {/* Voice Recording */}
        {entry.id && (
          <VoiceRecorder entryId={entry.id} />
        )}

        {/* Examples & Community Proverbs */}
        {(entry.examples.length > 0 || communityExamples.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">שימוש, פתגמים וברכות</h3>
              {entry.id && (
                <button
                  type="button"
                  onClick={() => setShowProverbForm(!showProverbForm)}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                  title="הוסף פתגם או ברכה"
                >
                  <Plus size={14} />
                  הוסף פתגם
                </button>
              )}
            </div>

            {/* AI Disclosure */}
            {entry.examples.length > 0 && entry.source !== 'Community' && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs text-amber-700 dark:text-amber-300 mb-3 border border-amber-100 dark:border-amber-800/30">
                <Info size={14} className="shrink-0" />
                <span>המשפטים נוצרו בעזרת AI ועשויים להכיל אי-דיוקים. יש לכם הצעה טובה יותר? לחצו על "הוסף פתגם".</span>
              </div>
            )}

            {/* AI-generated examples */}
            <div className="space-y-3">
              {entry.examples.map((ex, idx) => (
                <div key={idx} className="border-r-4 border-indigo-200 dark:border-indigo-900 pr-4 py-2 bg-white/5 rounded-r-lg">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-lg font-medium text-slate-200">{ex.origin}</p>
                    <button onClick={() => handlePlay(ex.origin, `ex-orig-${idx}`)} className={`text-slate-300 hover:text-indigo-500 transition-colors ${isPlaying === `ex-orig-${idx}` ? 'text-indigo-500 animate-pulse' : ''}`}>
                      <Volume2 size={16} />
                    </button>
                  </div>
                  {ex.transliteration && <p className="text-sm text-slate-500 font-mono mb-1 dir-ltr text-right">{ex.transliteration}</p>}
                  <p className="text-slate-600 dark:text-slate-400">{ex.translated}</p>
                </div>
              ))}
            </div>

            {/* Community proverbs */}
            {communityExamples.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-2 flex items-center gap-1">
                  <Users size={12} /> פתגמים מהקהילה
                </p>
                <div className="space-y-3">
                  {communityExamples.map((ex) => (
                    <div key={ex.id} className="border-r-4 border-indigo-200 dark:border-indigo-900 pr-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-r-lg">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-lg font-medium text-slate-200">{ex.origin}</p>
                        <button onClick={() => handlePlay(ex.origin, `comm-${ex.id}`)} className={`text-slate-300 hover:text-indigo-500 transition-colors ${isPlaying === `comm-${ex.id}` ? 'text-indigo-500 animate-pulse' : ''}`}>
                          <Volume2 size={16} />
                        </button>
                      </div>
                      {ex.transliteration && <p className="text-sm text-slate-500 font-mono mb-1 dir-ltr text-right">{ex.transliteration}</p>}
                      {ex.translated && <p className="text-slate-600 dark:text-slate-400">{ex.translated}</p>}
                      <p className="text-[10px] text-slate-400 mt-1">תרומה: {ex.user_name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add proverb form */}
            {showProverbForm && (
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">הוסף פתגם, ברכה או דוגמת שימוש</p>
                  <button type="button" onClick={() => setShowProverbForm(false)} className="text-slate-400 hover:text-slate-600" title="סגור">
                    <XIcon size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={proverbOrigin}
                  onChange={e => setProverbOrigin(e.target.value)}
                  placeholder="הפתגם / הברכה בשפת המקור..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  dir="auto"
                />
                <input
                  type="text"
                  value={proverbTranslated}
                  onChange={e => setProverbTranslated(e.target.value)}
                  placeholder="תרגום (אופציונלי)"
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  dir="auto"
                />
                <input
                  type="text"
                  value={proverbTranslit}
                  onChange={e => setProverbTranslit(e.target.value)}
                  placeholder="תעתיק לטיני (אופציונלי)"
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  dir="ltr"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={submitProverb}
                    disabled={proverbSubmitting || !proverbOrigin.trim()}
                    className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {proverbSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    שלח פתגם
                  </button>
                  {proverbMessage && (
                    <span className={`text-xs ${proverbMessage.includes('שגיאה') ? 'text-red-500' : 'text-green-600'}`}>
                      {proverbMessage}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Show "Add proverb" even when no examples exist */}
        {entry.examples.length === 0 && communityExamples.length === 0 && entry.id && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500 font-bold">פתגמים וברכות</h3>
              <button
                type="button"
                onClick={() => setShowProverbForm(!showProverbForm)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
                title="הוסף פתגם או ברכה"
              >
                <Plus size={14} />
                הוסף פתגם
              </button>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-500">אין עדיין פתגמים למילה זו. היה הראשון להוסיף!</p>

            {showProverbForm && (
              <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">הוסף פתגם, ברכה או דוגמת שימוש</p>
                  <button type="button" onClick={() => setShowProverbForm(false)} className="text-slate-400 hover:text-slate-600" title="סגור">
                    <XIcon size={14} />
                  </button>
                </div>
                <input
                  type="text"
                  value={proverbOrigin}
                  onChange={e => setProverbOrigin(e.target.value)}
                  placeholder="הפתגם / הברכה בשפת המקור..."
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  dir="auto"
                />
                <input
                  type="text"
                  value={proverbTranslated}
                  onChange={e => setProverbTranslated(e.target.value)}
                  placeholder="תרגום (אופציונלי)"
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  dir="auto"
                />
                <input
                  type="text"
                  value={proverbTranslit}
                  onChange={e => setProverbTranslit(e.target.value)}
                  placeholder="תעתיק לטיני (אופציונלי)"
                  className="w-full px-3 py-2 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  dir="ltr"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={submitProverb}
                    disabled={proverbSubmitting || !proverbOrigin.trim()}
                    className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {proverbSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                    שלח פתגם
                  </button>
                  {proverbMessage && (
                    <span className={`text-xs ${proverbMessage.includes('שגיאה') ? 'text-red-500' : 'text-green-600'}`}>
                      {proverbMessage}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Community Actions */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${isLiked ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'text-slate-500 hover:bg-white/5'}`}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
              <span className="font-bold">{likesCount}</span>
            </button>

            <button
              onClick={toggleComments}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${showComments ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'text-slate-500 hover:bg-white/5'}`}
            >
              <MessageCircle size={20} />
              <span className="font-bold">{entry.commentsCount || 0}</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="animate-in fade-in slide-in-from-top-2 bg-white/5/50 rounded-xl p-4 space-y-4">
            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">תגובות בקהילה</h4>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              {comments.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">אין עדיין תגובות. היה הראשון להגיב!</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-[#0d1424]/60 backdrop-blur-xl p-3 rounded-lg shadow-sm border border-white/10">
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="הוסף תגובה, דוגמה או הערה..."
                  required
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
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