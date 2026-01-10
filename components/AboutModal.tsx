import React from 'react';
import { X, Book, Info, ExternalLink, Globe, Library, GraduationCap, History } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-rubik" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-700 h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Info size={20} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="font-bold text-lg">בסיס הידע של המערכת</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8 text-slate-700 dark:text-slate-300 leading-relaxed overflow-y-auto custom-scrollbar">
          
          <div className="text-sm bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl text-indigo-800 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50">
                למען הדיוק המרבי, המערכת תוכנתה לבצע הצלבת נתונים בין שכבות שונות של מקורות היסטוריים ואקדמיים:
          </div>

          {/* Section 1: Dictionaries */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Library size={16} className="text-amber-600"/>
                מילונים מרכזיים
            </h4>
            <div className="space-y-3">
                <div className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-slate-100">המילון הג'והורי-עברי הגדול</p>
                    <p className="text-xs text-slate-500 mb-2">מרדכי אגרונוב (1997) • המקור הראשי לכתיב</p>
                    <a href="https://merhav.nli.org.il/primo-explore/search?query=any,contains,מרדכי%20אגרונוב%20מילון&vid=NLI&lang=he_IL" target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"><ExternalLink size={10}/> הספרייה הלאומית</a>
                </div>
                <div className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-slate-100">מילון טאטי-רוסי</p>
                    <p className="text-xs text-slate-500">יעקב אגרונוב ומיכאל דדשוב</p>
                </div>
                <div className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-slate-100">מילון ג'והורי-עברי (פולקלור)</p>
                    <p className="text-xs text-slate-500">חניל (חנה) רפאל ויוסי בן-עמי • דגש על ניב קובה</p>
                </div>
            </div>
          </div>

          {/* Section 2: Grammar & Research */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                <GraduationCap size={16} className="text-emerald-600"/>
                דקדוק ומחקר אקדמי
            </h4>
            <div className="space-y-3">
                <div className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-slate-100">דקדוק השפה הג'והורית</p>
                    <p className="text-xs text-slate-500">פרידה יוסופובה • סמכות עליונה להטיות פעלים</p>
                </div>
                <div className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                    <p className="font-bold text-slate-900 dark:text-slate-100">חקר יהדות קווקז</p>
                    <p className="text-xs text-slate-500">גרשון בן-אורן • הקשר תרבותי ודתי</p>
                </div>
            </div>
          </div>

          {/* Section 3: History */}
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                <History size={16} className="text-rose-600"/>
                מחקר היסטורי (ארכאי)
            </h4>
            <div className="bg-white dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-600 shadow-sm">
                <p className="font-bold text-slate-900 dark:text-slate-100">חומרים לחקר השפה היהודית-טאטית (1892)</p>
                <p className="text-xs text-slate-500">וילהלם מילר (Vs. Miller) • תיעוד היסטורי מוקדם</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                 <a 
                    href="https://stmegi.com/gorskie_evrei/juhuri/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors group"
                >
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Globe size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">מרכז המורשת STMEGI</p>
                        <p className="text-xs text-slate-500">לעיון במקורות הדיגיטליים</p>
                    </div>
                    <ExternalLink size={14} className="mr-auto text-slate-400" />
                </a>
            </div>
          
          <div className="text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-2 text-center">
              <p>ט.ל.ח • המערכת משתמשת בבינה מלאכותית ומבצעת סינתזה של המקורות הנ"ל.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;