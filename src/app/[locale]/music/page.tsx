import type { Metadata } from 'next';
import { Music, Bell } from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'מוזיקה קווקזית — בקרוב',
  description: 'האזינו לצלילים המסורתיים של יהודי ההרים — שירים, מוגאמים ומנגינות דורות.',
  alternates: { canonical: '/music' },
};

export default function MusicPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-20" dir="rtl">
      <div className="max-w-lg text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Music size={40} className="text-[#050B14]" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">מוזיקה קווקזית</h1>
        <p className="text-lg text-slate-400 mb-8 leading-relaxed">
          בקרוב תוכלו להאזין לצלילים המסורתיים של יהודי ההרים — שירים עתיקים, מוגאמים, מנגינות חתונה ומוזיקה שליוותה את הקהילה לאורך הדורות.
        </p>

        <div className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 font-medium mb-8">
          <Bell size={18} />
          <span>בקרוב — אנחנו עובדים על זה</span>
        </div>

        <div className="mt-4">
          <Link
            href="/"
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← חזרה לעמוד הבית
          </Link>
        </div>
      </div>
    </main>
  );
}
