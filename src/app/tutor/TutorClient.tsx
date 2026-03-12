'use client';

export default function TutorClient() {
  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-12 flex-1 flex flex-col">
      <h1 className="text-4xl font-bold text-center text-amber-600 mb-4">
        מורה פרטי AI לג&apos;והורית
      </h1>
      <p className="text-center text-slate-500 dark:text-slate-400 mb-8">
        למד את שפת יהודי ההרים עם מורה פרטי חכם
      </p>

      {/* Chat area placeholder */}
      <div className="flex-1 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center min-h-[400px]">
        <div className="text-center text-slate-400 dark:text-slate-500">
          <p className="text-lg mb-2">ממשק הצ&apos;אט יועבר בשלב הבא</p>
          <p className="text-sm">שאל שאלות על שפת ג&apos;והורית, דקדוק, ומשמעויות מילים</p>
        </div>
      </div>

      {/* Input area placeholder */}
      <div className="mt-4">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="כתוב שאלה..."
            disabled
            className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none opacity-50 cursor-not-allowed"
            dir="rtl"
          />
          <button
            disabled
            className="px-6 py-3 bg-amber-500 text-white rounded-xl opacity-50 cursor-not-allowed"
          >
            שלח
          </button>
        </div>
      </div>
    </div>
  );
}
