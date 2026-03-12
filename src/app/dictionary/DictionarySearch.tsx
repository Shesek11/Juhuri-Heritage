'use client';

import { useState } from 'react';

export default function DictionarySearch() {
  const [query, setQuery] = useState('');

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center text-amber-600 mb-8">
        מילון ג&apos;והורי-עברי
      </h1>

      <div className="relative mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפש מילה בג'והורית, עברית, רוסית או אנגלית..."
          className="w-full px-6 py-4 text-lg rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-colors"
          dir="rtl"
        />
      </div>

      <div className="text-center text-slate-500 dark:text-slate-400">
        <p>הקלד מילה כדי להתחיל בחיפוש</p>
        <p className="mt-2 text-sm">
          רכיב החיפוש המלא יועבר בשלב הבא
        </p>
      </div>
    </div>
  );
}
