import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-amber-600 mb-4">404</h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
          הדף לא נמצא
        </p>
        <Link
          href="/"
          className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
        >
          חזרה לדף הבית
        </Link>
      </div>
    </main>
  );
}
