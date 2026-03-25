import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon, Info } from 'lucide-react';

const RULES = [
  { symbol: 'e', sound: 'לא שפתי', examples: 'DER (דלת), EME (כולם)' },
  { symbol: 'u', sound: 'תנועה מעוגלת', examples: 'DUL (לב), SURKH (זהב)' },
  { symbol: 'o', sound: 'ה׳', examples: 'KHUDO (השם)' },
  { symbol: 'GH', sound: 'ג׳ (כמו Г הרוסי)', examples: 'GHIGEE (ג׳יגה), GHON (ג׳ון)' },
  { symbol: 'RG', sound: 'צליל עצור, גרוני מאוד', examples: 'DORG (יער), SHURGEM (בטן)' },
  { symbol: 'Kh', sound: 'ח׳ עיצור (כמו X האזרביג׳ני)', examples: 'Khune (בית), Khaber (חדשות)' },
  { symbol: 'Xh', sound: 'ח׳ גרוני', examples: 'xhermexh (שותף), XHAWUR (חבר), XHAFT (שבע)' },
  { symbol: 'H', sound: 'גרון חרישי (כמו h באנגלית)', examples: 'Hovo (אוויר)' },
  { symbol: 'AA', sound: 'ע׳', examples: 'aayil (ילד), aasp (סוס), seaat (שעון)' },
];

interface TransliterationGuideModalProps {
  onClose: () => void;
}

const TransliterationGuideModal: React.FC<TransliterationGuideModalProps> = ({ onClose }) => {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto py-8"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg mx-4 bg-[#0d1424] border border-white/15 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto overscroll-contain"
        dir="rtl"
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 left-3 text-slate-400 hover:text-white transition-colors"
        >
          <XIcon size={16} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2">
          <Info size={16} className="text-indigo-400" />
          <h3 className="text-sm font-bold text-white">עיצורים וצלילים — חוקי התעתיק הלטיני</h3>
        </div>

        {/* Rules table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-right py-2 px-2 text-xs text-slate-400 font-bold">סימן</th>
                <th className="text-right py-2 px-2 text-xs text-slate-400 font-bold">צליל</th>
                <th className="text-right py-2 px-2 text-xs text-slate-400 font-bold">דוגמאות</th>
              </tr>
            </thead>
            <tbody>
              {RULES.map((rule) => (
                <tr key={rule.symbol} className="border-b border-white/5">
                  <td className="py-2 px-2">
                    <span className="font-mono font-bold text-amber-400 text-base">{rule.symbol}</span>
                  </td>
                  <td className="py-2 px-2 text-slate-300">{rule.sound}</td>
                  <td className="py-2 px-2 text-slate-400 font-mono text-xs">{rule.examples}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Attribution */}
        <p className="text-[11px] text-slate-400 text-center pt-2 pb-2 border-t border-white/5">
          באדיבות רויטל חנוקוב ומרכז המורשת
        </p>
      </div>
    </div>,
    document.body
  );
};

export default TransliterationGuideModal;
