import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { geminiApi } from '../../../services/apiService';

const NIKUD_CHARS = [
  { char: '\u05B7', name: 'פתח' },
  { char: '\u05B8', name: 'קמץ' },
  { char: '\u05B6', name: 'סגול' },
  { char: '\u05B5', name: 'צירה' },
  { char: '\u05B4', name: 'חיריק' },
  { char: '\u05B9', name: 'חולם' },
  { char: '\u05BB', name: 'קובוץ' },
  { char: '\u05BC', name: 'דגש' },
  { char: '\u05B0', name: 'שווא' },
];

interface NikudPaletteProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
  latinHint?: string;
}

const NikudPalette: React.FC<NikudPaletteProps> = ({ inputRef, value, onChange, latinHint }) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const insertNikud = (char: string) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const newValue = value.slice(0, start) + char + value.slice(end);
    onChange(newValue);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + char.length, start + char.length);
    }, 0);
  };

  const suggestNikud = async () => {
    const text = value.trim();
    if (!text) return;
    setAiLoading(true);
    setError('');
    try {
      const res = await geminiApi.enrich(['nikud'], { hebrew: text, latin: latinHint || '' });
      if (res.enrichment?.nikud) {
        onChange(res.enrichment.nikud);
      }
    } catch {
      setError('שגיאה בהצעת ניקוד');
    } finally {
      setAiLoading(false);
    }
  };

  return (
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
        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 disabled:opacity-40 transition-colors ms-auto"
        title="AI יציע ניקוד לפי התעתיק הלטיני"
      >
        {aiLoading ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
        הצע ניקוד
      </button>
      {error && <span className="text-xs text-red-400 w-full">{error}</span>}
    </div>
  );
};

export default NikudPalette;
