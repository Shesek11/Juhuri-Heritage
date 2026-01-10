
import React, { useState, useEffect } from 'react';
import { X, Send, Loader2, CheckCircle, AlertCircle, Feather } from 'lucide-react';
import { verifySuggestion } from '../services/geminiService';
import { addCustomEntry, getDialects } from '../services/storageService';
import { DictionaryEntry, DialectItem, User } from '../types';
import { incrementContribution } from '../services/authService';

interface ContributeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const ContributeModal: React.FC<ContributeModalProps> = ({ isOpen, onClose, user }) => {
  const [term, setTerm] = useState('');
  const [translation, setTranslation] = useState('');
  const [dialect, setDialect] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = useState('');
  const [dialects, setDialects] = useState<DialectItem[]>([]);

  useEffect(() => {
      if (isOpen) {
          setDialects(getDialects());
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');
    
    try {
      const result = await verifySuggestion({ term, translation, dialect });
      if (result.isValid) {
        
        // Construct Entry Object
        const entry: DictionaryEntry = {
            term: term,
            detectedLanguage: 'Hebrew', 
            translations: [{
                dialect: dialect || 'General',
                hebrew: translation, 
                latin: term, 
                cyrillic: ''
            }],
            definitions: [`User contribution: ${translation}`],
            examples: [],
            source: 'User',
            status: 'pending',
            contributorId: user?.id
        };

        // Save to DB
        addCustomEntry(entry);
        
        // Update user stats
        if (user) {
            incrementContribution(user.id);
        }

        setStatus('success');
        setFeedback("תודה! התרומה נשלחה לאישור המערכת ותתווסף לאחר בדיקה.");
        setTimeout(() => {
            onClose();
            setTerm('');
            setTranslation('');
            setDialect('');
            setStatus('idle');
        }, 3000);
      } else {
        setStatus('error');
        setFeedback(result.feedback || "המערכת זיהתה אי-התאמה. אנא ודאו שהפרטים מדויקים.");
      }
    } catch (error) {
      setStatus('error');
      setFeedback("אירעה שגיאה בשמירת התרומה.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-rubik">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700">
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-amber-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-500">
            <Feather size={20} />
            <h3 className="font-bold text-lg">תרומה לשימור המסורת</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            עזרו לנו לתעד את השפה. אם אתם מכירים מילה של סבתא שחסרה במילון, הוסיפו אותה כאן.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">המילה (עברית או ג'והורי)</label>
            <input 
              type="text" 
              required
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              placeholder="למשל: שלום / Sholom"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">תרגום ומשמעות</label>
            <input 
              type="text" 
              required
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
              placeholder="איך אומרים את זה ומה זה אומר?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ניב / מקור (אופציונלי)</label>
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            >
              <option value="">כללי / לא ידוע</option>
              {dialects.map(d => (
                  <option key={d.id} value={d.name}>{d.description}</option>
              ))}
            </select>
          </div>
          
          {/* User notice */}
          {!user && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  שים לב: אתה תורם כאורח. התחבר כדי לקבל קרדיט ולעקוב אחרי התרומות שלך.
              </p>
          )}

          {status === 'success' && (
            <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg flex items-start gap-2 text-sm">
                <CheckCircle size={16} className="mt-0.5 shrink-0" />
                <span>{feedback}</span>
            </div>
          )}

          {status === 'error' && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg flex items-start gap-2 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{feedback}</span>
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow-lg shadow-amber-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              {loading ? 'בודק ושולח לאישור...' : 'שלח לאישור'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContributeModal;
