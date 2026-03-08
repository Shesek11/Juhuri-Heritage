import React, { useState } from 'react';
import { MessageSquarePlus, Send, Loader2, X, CheckCircle } from 'lucide-react';
import apiService from '../services/apiService';

const CATEGORIES = [
  { value: 'suggestion', label: 'הצעה לשיפור' },
  { value: 'bug', label: 'באג / תקלה' },
  { value: 'content', label: 'תיקון תוכן' },
  { value: 'other', label: 'אחר' },
] as const;

const FeedbackButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    try {
      await apiService.post('/feedback', {
        category,
        message: message.trim(),
        userName: userName.trim() || undefined,
        pageUrl: window.location.href,
      });
      setSent(true);
      setTimeout(() => {
        setIsOpen(false);
        setSent(false);
        setMessage('');
        setCategory('suggestion');
      }, 2000);
    } catch {
      alert('שגיאה בשליחה, נסו שוב');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title="שלח הצעה או דיווח"
      >
        <MessageSquarePlus size={22} />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={() => setIsOpen(false)}>
          <div
            className="w-full max-w-md bg-[#0d1424]/60 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4"
            onClick={e => e.stopPropagation()}
          >
            {sent ? (
              <div className="p-8 text-center space-y-3">
                <CheckCircle className="mx-auto text-green-500" size={48} />
                <p className="text-lg font-bold text-slate-200">תודה רבה!</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">ההודעה נשלחה בהצלחה</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <h3 className="font-bold text-slate-200">יש לכם הצעה? דיווח? שלחו לנו!</h3>
                  <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Category */}
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        type="button"
                        key={cat.value}
                        onClick={() => setCategory(cat.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          category === cat.value
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Message */}
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="ספרו לנו מה אפשר לשפר, לתקן או להוסיף..."
                    required
                    rows={4}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    dir="auto"
                    autoFocus
                  />

                  {/* Name (optional) */}
                  <input
                    type="text"
                    value={userName}
                    onChange={e => setUserName(e.target.value)}
                    placeholder="השם שלכם (אופציונלי)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    dir="auto"
                  />
                </div>

                <div className="p-4 border-t border-white/10">
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    שלח
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
