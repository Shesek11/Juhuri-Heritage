import type { Metadata } from 'next';
import Link from 'next/link';
import pool from '@/src/lib/db';
import { buildJsonLdGraph, buildBreadcrumbJsonLd } from '@/src/lib/jsonld';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'קל',
  medium: 'בינוני',
  hard: 'מאתגר',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecipeListRow {
  id: number;
  title: string;
  title_juhuri: string | null;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: string | null;
  region_name: string | null;
  author_name: string | null;
  photo_url: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  is_featured: number | null;
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "מתכונים ג'והוריים",
  description:
    "אוסף מתכונים מסורתיים מהמטבח הג'והורי — מנות עיקריות, תבשילים, אפייה ועוד. שמרו על מורשת הטעמים של יהודי ההרים.",
  openGraph: {
    title: "מתכונים ג'והוריים",
    description: "אוסף מתכונים מסורתיים מהמטבח הג'והורי",
    type: 'website',
    url: `${SITE_URL}/recipes`,
  },
  alternates: {
    canonical: `${SITE_URL}/recipes`,
  },
};

// ---------------------------------------------------------------------------
// JSON-LD component — safe: server-generated structured data, not user input
// ---------------------------------------------------------------------------
function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RecipesPage() {
  const [rows] = await pool.query<RecipeListRow[] & any>(
    `SELECT r.*, rp.url as photo_url
     FROM recipes r
     LEFT JOIN recipe_photos rp ON r.id = rp.recipe_id AND rp.is_main = 1
     WHERE r.is_approved = 1
     ORDER BY r.created_at DESC`,
  );
  const recipes = rows as RecipeListRow[];

  const jsonLd = buildJsonLdGraph(
    buildBreadcrumbJsonLd([
      { name: 'דף הבית', url: SITE_URL },
      { name: 'מתכונים', url: `${SITE_URL}/recipes` },
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <JsonLdScript data={jsonLd} />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {"מתכונים ג'והוריים"}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            אוסף מתכונים מסורתיים מהמטבח של יהודי ההרים
          </p>
        </header>

        {/* Recipe grid */}
        {recipes.length === 0 ? (
          <p className="text-center text-slate-500 dark:text-slate-400 py-16">
            אין מתכונים עדיין
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe) => {
              const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);
              return (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}`}
                  className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200 dark:border-slate-700 hover:-translate-y-1"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
                    {recipe.photo_url ? (
                      <img
                        src={recipe.photo_url}
                        alt={recipe.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ChefIcon />
                      </div>
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {!!recipe.is_featured && (
                        <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded-full">
                          מומלץ
                        </span>
                      )}
                      {recipe.difficulty && (
                        <span className="px-2 py-1 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-xs font-medium rounded-full text-slate-700 dark:text-slate-300">
                          {DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h2 className="font-bold text-lg text-slate-900 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {recipe.title}
                    </h2>
                    {recipe.title_juhuri && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-2">
                        {recipe.title_juhuri}
                      </p>
                    )}
                    {recipe.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                        {recipe.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
                      {totalTime > 0 && <span>{totalTime} דק׳</span>}
                      {recipe.servings && <span>{recipe.servings} מנות</span>}
                      {recipe.region_name && <span>{recipe.region_name}</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline icon
// ---------------------------------------------------------------------------

function ChefIcon() {
  return (
    <svg
      className="w-16 h-16 text-amber-300 dark:text-amber-700"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6z" />
      <line x1={6} y1={17} x2={18} y2={17} />
    </svg>
  );
}
