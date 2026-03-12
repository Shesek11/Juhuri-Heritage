'use client';

export default function FamilyTreeClient() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center text-amber-600 mb-4">
        עץ משפחתי
      </h1>
      <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
        חקור את קשרי המשפחה של קהילת יהודי ההרים
      </p>

      {/* D3 / Leaflet visualization placeholder */}
      <div className="rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[500px]">
        <div className="text-center text-slate-400 dark:text-slate-500">
          <p className="text-lg mb-2">תצוגת עץ המשפחה והמפה יועברו בשלב הבא</p>
          <p className="text-sm">
            כולל D3 לוויזואליזציה ו-Leaflet למפות
          </p>
        </div>
      </div>
    </div>
  );
}
