import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center min-h-[70vh] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/hero-pattern.svg')] opacity-5" />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-amber-500">מורשת</span> ג&apos;והורי
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-8 leading-relaxed">
            המילון האינטראקטיבי לשימור שפת יהודי ההרים
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/dictionary"
              className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white text-lg font-semibold rounded-xl transition-colors"
            >
              חפש במילון
            </Link>
            <Link
              href="/tutor"
              className="px-8 py-4 border-2 border-amber-500/50 hover:border-amber-500 text-amber-400 hover:text-amber-300 text-lg font-semibold rounded-xl transition-colors"
            >
              מורה פרטי AI
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-800 dark:text-slate-200">
            כלים לשימור השפה
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              title="מילון אינטראקטיבי"
              description="חפש מילים בג'והורית, עברית, רוסית ואנגלית עם הגייה קולית"
              href="/dictionary"
            />
            <FeatureCard
              title="מורה פרטי AI"
              description="למד את שפת ג'והורית עם מורה חכם שמתאים את עצמו אליך"
              href="/tutor"
            />
            <FeatureCard
              title="עץ משפחתי"
              description="חקור את קשרי המשפחה וההיסטוריה של קהילת יהודי ההרים"
              href="/family"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 bg-slate-100 dark:bg-slate-800/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <StatCard value="5,000+" label="מילים במילון" />
            <StatCard value="4" label="שפות" />
            <StatCard value="AI" label="מורה פרטי" />
            <StatCard value="∞" label="אפשרויות למידה" />
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block p-8 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500/50 hover:shadow-lg transition-all group"
    >
      <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-200 group-hover:text-amber-600 transition-colors">
        {title}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
        {description}
      </p>
    </Link>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-amber-600 mb-1">{value}</div>
      <div className="text-sm text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
