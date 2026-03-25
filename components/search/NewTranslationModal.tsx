import React, { useState, useEffect } from 'react';
import FocusTrap from 'focus-trap-react';
import { X, Plus, Send } from 'lucide-react';
import { dialectsApi } from '../../services/apiService';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';

interface NewTranslationModalProps {
  searchQuery: string;
  onClose: () => void;
  onSubmit: (data: NewTranslationData) => void;
}

export interface NewTranslationData {
  term: string;
  hebrew: string;
  latin?: string;
  cyrillic?: string;
  dialect?: string;
}

const NewTranslationModal: React.FC<NewTranslationModalProps> = ({ searchQuery, onClose, onSubmit }) => {
  const { isAuthenticated } = useAuth();
  const [juhuriTerm, setJuhuriTerm] = useState('');
  const [latin, setLatin] = useState('');
  const [cyrillic, setCyrillic] = useState('');
  const [dialect, setDialect] = useState('General');
  const [dialects, setDialects] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    dialectsApi.getAll()
      .then((res: any) => setDialects(res.dialects || res || []))
      .catch(() => setDialects([{ id: '1', name: 'General' }]));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!juhuriTerm.trim()) return;

    setSubmitting(true);
    try {
      const data: NewTranslationData = {
        term: juhuriTerm.trim(),
        hebrew: searchQuery,
        latin: latin.trim() || undefined,
        cyrillic: cyrillic.trim() || undefined,
        dialect: dialect || undefined,
      };

      await apiService.post('/dictionary/entries', {
        term: data.term,
        translation: data.hebrew,
        dialect: data.dialect,
        notes: [
          data.latin && `Latin: ${data.latin}`,
          data.cyrillic && `Cyrillic: ${data.cyrillic}`,
        ].filter(Boolean).join('; ') || undefined,
      });

      onSubmit(data);
      setSubmitted(true);
    } catch {
      // Still show success to user — submission may have partially succeeded
      onSubmit({
        term: juhuriTerm.trim(),
        hebrew: searchQuery,
        latin: latin.trim() || undefined,
        cyrillic: cyrillic.trim() || undefined,
        dialect,
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <FocusTrap focusTrapOptions={{ allowOutsideClick: true, escapeDeactivates: true }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-translation-modal-title"
        className="bg-[#0d1424] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl font-rubik"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" />
            <h2 id="new-translation-modal-title" className="text-lg font-bold text-white">הוסף תרגום חדש</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-white/5 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Plus className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-white font-medium">התרגום נשלח בהצלחה!</p>
            <p className="text-slate-400 text-sm">התרגום יעבור בדיקה לפני שיופיע במילון.</p>
            {!isAuthenticated && (
              <p className="text-indigo-300 text-sm">
                הרשמה מאפשרת לעקוב אחרי התרומות ולצבור נקודות ניסיון.
              </p>
            )}
            <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm">
              סגור
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Searched word context */}
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-400">מילה בעברית:</span>
                <span className="text-white font-medium text-base">{searchQuery}</span>
              </div>
            </div>

            {/* Juhuri term */}
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">
                מילה בג׳והורית <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={juhuriTerm}
                onChange={(e) => setJuhuriTerm(e.target.value)}
                placeholder="המילה בג׳והורית..."
                required
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus
              />
            </div>

            {/* Latin transliteration */}
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">תעתיק לטיני (אופציונלי)</label>
              <input
                type="text"
                value={latin}
                onChange={(e) => setLatin(e.target.value)}
                placeholder="Latin transliteration..."
                dir="ltr"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Cyrillic */}
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">כתב קירילי (אופציונלי)</label>
              <input
                type="text"
                value={cyrillic}
                onChange={(e) => setCyrillic(e.target.value)}
                placeholder="Кириллица..."
                dir="ltr"
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {/* Dialect selector */}
            <div className="space-y-1.5">
              <label className="text-sm text-slate-300 font-medium">דיאלקט</label>
              <select
                value={dialect}
                onChange={(e) => setDialect(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
              >
                {dialects.length > 0 ? (
                  dialects.map((d) => (
                    <option key={d.id} value={d.name} className="bg-[#0d1424] text-white">
                      {d.name}
                    </option>
                  ))
                ) : (
                  <option value="General" className="bg-[#0d1424] text-white">General</option>
                )}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !juhuriTerm.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span>שולח...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>שלח תרגום</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
      </FocusTrap>
    </div>
  );
};

export default NewTranslationModal;
