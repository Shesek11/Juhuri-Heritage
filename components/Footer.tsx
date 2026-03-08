import React from 'react';
import { NavLink } from 'react-router-dom';
import { Scroll, Facebook, Instagram, Youtube, HeartHandshake } from 'lucide-react';

const Footer: React.FC = () => {
  const linkClass = "text-slate-400 hover:text-white transition-colors text-sm";

  return (
    <footer className="bg-[#0d1424] text-slate-400 rounded-t-3xl pt-14 pb-6 font-rubik relative overflow-hidden border-t border-white/5">
      {/* Premium Glow Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-amber-500/5 rounded-[100%] blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center md:items-start text-center md:text-right">
          <NavLink to="/" className="flex items-center gap-3 mb-3 group">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:shadow-amber-500/40 transition-shadow duration-500">
              <Scroll size={18} className="text-[#050B14]" />
            </div>
            <span className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors duration-300">מורשת ג׳והורי</span>
          </NavLink>
          <p className="text-slate-400 text-sm leading-relaxed max-w-xs mb-4">
            משמרים את שפת הג׳והורי, מסורותיה ותרבותם העשירה של יהודי ההרים, למען הדורות הבאים.
          </p>
          <div className="flex gap-3">
            <a href="#" aria-label="פייסבוק" className="text-slate-500 hover:text-amber-400 transition-colors duration-300"><Facebook size={20} /></a>
            <a href="#" aria-label="אינסטגרם" className="text-slate-500 hover:text-amber-400 transition-colors duration-300"><Instagram size={20} /></a>
            <a href="#" aria-label="יוטיוב" className="text-slate-500 hover:text-amber-400 transition-colors duration-300"><Youtube size={20} /></a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 drop-shadow-md">קישורים</h3>
          <ul className="space-y-2">
            <li><NavLink to="/" className={linkClass}>בית</NavLink></li>
            <li><NavLink to="/dictionary" className={linkClass}>מילון</NavLink></li>
            <li><NavLink to="/tutor" className={linkClass}>מורה פרטי</NavLink></li>
            <li><NavLink to="/about" className={linkClass}>אודות</NavLink></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 drop-shadow-md">מידע משפטי</h3>
          <ul className="space-y-2">
            <li><NavLink to="/privacy" className={linkClass}>מדיניות פרטיות</NavLink></li>
            <li><NavLink to="/accessibility" className={linkClass}>הצהרת נגישות</NavLink></li>
            <li><NavLink to="/contact" className={linkClass}>צור קשר</NavLink></li>
          </ul>
        </div>
      </div>

      <div className="mt-10 border-t border-white/5 pt-6 text-center text-xs text-slate-500 relative z-10 mx-6 sm:mx-10 md:mx-auto max-w-6xl">
        <p>&copy; {new Date().getFullYear()} מורשת ג׳והורי. כל הזכויות שמורות.</p>
        <p className="flex items-center justify-center gap-1 mt-1">
          נוצר באהבה <HeartHandshake size={12} className="text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> לקהילה
        </p>
      </div>
    </footer>
  );
};

export default Footer;
