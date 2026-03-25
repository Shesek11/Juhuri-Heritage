import React, { useState, useRef } from 'react';
import { Send, Loader2, X as XIcon, Sparkles, Info } from 'lucide-react';
import apiService, { geminiApi } from '../../services/apiService';
import { FIELD_LABELS } from '../../utils/fieldLabels';
import TransliterationGuideModal from './TransliterationGuideModal';

const NIKUD_CHARS = [
  { char: '\u05B7', name: 'פתח' },   // patach
  { char: '\u05B8', name: 'קמץ' },   // kamatz
  { char: '\u05B6', name: 'סגול' },  // segol
  { char: '\u05B5', name: 'צירה' },  // tsere
  { char: '\u05B4', name: 'חיריק' }, // hiriq
  { char: '\u05B9', name: 'חולם' },  // holam
  { char: '\u05BB', name: 'קובוץ' }, // kubutz
  { char: '\u05BC', name: 'דגש' },   // dagesh
  { char: '\u05B0', name: 'שווא' },  // shva
];

const isHebrewField = (f: string) => ['hebrewTransliteration', 'hebrew', 'term'].includes(f);
const isLatinField = (f: string) => f === 'latin';

/** Inline field edit form for suggesting corrections */
const FieldEditForm: React.FC<{
  entryId: string;
  fieldName: string;
  currentValue: string;
  latinHint?: string; // Latin transliteration for AI nikud suggestion
  onClose: () => void;
  onSuccess: () => void;
}> = ({ entryId, fieldName, currentValue, latinHint, onClose, onSuccess }) => {
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const insertNikud = (char: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const newValue = value.slice(0, start) + char + value.slice(end);
    setValue(newValue);
    // Restore cursor position after the inserted char
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    }, 0);
  };

  const suggestNikud = async () => {
    const text = value.trim();
    if (!text) return;
    setAiLoading(true);
    try {
      const prompt = latinHint
        ? `Add Hebrew nikud (vowel marks) to this Juhuri word in Hebrew script: "${text}". The Latin transliteration is "${latinHint}". Use the Latin pronunciation to determine the correct nikud. Return ONLY the nikud'd Hebrew text, nothing else.`
        : `Add Hebrew nikud (vowel marks) to this Juhuri word in Hebrew script: "${text}". Return ONLY the nikud'd Hebrew text, nothing else.`;

      const res = await geminiApi.enrich(['nikud'], { hebrew: text, latin: latinHint || '' });
      if (res.enrichment?.nikud) {
        setValue(res.enrichment.nikud);
      }
    } catch {
      setMessage('שגיאה בהצעת ניקוד');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
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
          <div className="text-xs text-slate-400 dark:text-slate-400">
            ערך נוכחי: <span className="font-medium">{currentValue}</span>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="הערך המוצע..."
          required
          autoFocus
          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
          dir="auto"
        />

        {/* Nikud palette for Hebrew fields */}
        {isHebrewField(fieldName) && (
          <div className="flex items-center gap-1 flex-wrap">
            {NIKUD_CHARS.map(({ char, name }) => (
              <button
                key={name}
                type="button"
                onClick={() => insertNikud(char)}
                className="w-7 h-7 flex items-center justify-center rounded text-lg font-bold text-slate-200 bg-white/10 hover:bg-indigo-500/30 hover:text-white transition-colors"
                title={name}
              >
                <span>א{char}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={suggestNikud}
              disabled={aiLoading || !value.trim()}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-40 transition-colors mr-auto"
              title="AI יציע ניקוד לפי התעתיק הלטיני"
            >
              {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
              הצע ניקוד
            </button>
          </div>
        )}

        {/* Transliteration guide for Latin field */}
        {isLatinField(fieldName) && (
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors"
          >
            <Info size={10} />
            חוקי התעתיק
          </button>
        )}

        <input
          type="text"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="סיבה / מקור (אופציונלי)"
          className="w-full px-3 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-600 bg-[#0d1424]/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
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

      {showGuide && <TransliterationGuideModal onClose={() => setShowGuide(false)} />}
    </>
  );
};

export default FieldEditForm;
