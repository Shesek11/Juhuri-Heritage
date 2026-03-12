import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import pool from '@/src/lib/db';
import {
  buildJsonLdGraph,
  buildRecipeJsonLd,
  buildBreadcrumbJsonLd,
} from '@/src/lib/jsonld';

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

interface RecipeRow {
  id: number;
  title: string;
  title_juhuri: string | null;
  description: string | null;
  ingredients: string | null;
  instructions: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  difficulty: string | null;
  region_name: string | null;
  author_name: string | null;
  photo_url: string | null;
  alt_text: string | null;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  created_at: string | null;
}

type Props = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return { title: 'מתכון לא נמצא' };

  const [rows] = await pool.query<RecipeRow[] & any>(
    `SELECT r.*, rp.url as photo_url, rp.alt_text
     FROM recipes r
     LEFT JOIN recipe_photos rp ON r.id = rp.recipe_id AND rp.is_main = 1
     WHERE r.id = ? AND r.is_approved = 1
     LIMIT 1`,
    [numericId],
  );
  const recipe = (rows as RecipeRow[])[0];
  if (!recipe) return { title: 'מתכון לא נמצא' };

  const description =
    recipe.description || `מתכון "${recipe.title}" — מטבח ג'והורי מסורתי`;

  return {
    title: recipe.title,
    description,
    openGraph: {
      title: recipe.title,
      description,
      type: 'article',
      url: `${SITE_URL}/recipes/${recipe.id}`,
      ...(recipe.photo_url && {
        images: [{ url: recipe.photo_url, alt: recipe.alt_text || recipe.title }],
      }),
    },
    alternates: {
      canonical: `${SITE_URL}/recipes/${recipe.id}`,
    },
  };
}

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

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) notFound();

  const [rows] = await pool.query<RecipeRow[] & any>(
    `SELECT r.*, rp.url as photo_url, rp.alt_text
     FROM recipes r
     LEFT JOIN recipe_photos rp ON r.id = rp.recipe_id AND rp.is_main = 1
     WHERE r.id = ? AND r.is_approved = 1
     LIMIT 1`,
    [numericId],
  );
  const recipe = (rows as RecipeRow[])[0];
  if (!recipe) notFound();

  const ingredients: any[] = safeJsonParse(recipe.ingredients, []);
  const instructions: any[] = safeJsonParse(recipe.instructions, []);
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  // JSON-LD
  const jsonLd = buildJsonLdGraph(
    buildRecipeJsonLd({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description || undefined,
      ingredients,
      instructions,
      prepTime: recipe.prep_time || undefined,
      cookTime: recipe.cook_time || undefined,
      servings: recipe.servings || undefined,
      photoUrl: recipe.photo_url || undefined,
    }),
    buildBreadcrumbJsonLd([
      { name: 'דף הבית', url: SITE_URL },
      { name: 'מתכונים', url: `${SITE_URL}/recipes` },
      { name: recipe.title, url: `${SITE_URL}/recipes/${recipe.id}` },
    ]),
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <JsonLdScript data={jsonLd} />

      {/* Breadcrumb */}
      <nav className="max-w-4xl mx-auto px-4 pt-6 text-sm text-slate-500 dark:text-slate-400">
        <ol className="flex items-center gap-2">
          <li>
            <a href="/" className="hover:text-amber-600 transition-colors">
              דף הבית
            </a>
          </li>
          <li>/</li>
          <li>
            <a href="/recipes" className="hover:text-amber-600 transition-colors">
              מתכונים
            </a>
          </li>
          <li>/</li>
          <li className="text-slate-800 dark:text-slate-200 font-medium">{recipe.title}</li>
        </ol>
      </nav>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero image */}
        {recipe.photo_url && (
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8">
            <img
              src={recipe.photo_url}
              alt={recipe.alt_text || recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {recipe.title}
          </h1>
          {recipe.title_juhuri && (
            <p className="text-lg text-amber-600 dark:text-amber-400 font-medium mb-4">
              {recipe.title_juhuri}
            </p>
          )}

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            {totalTime > 0 && (
              <span className="flex items-center gap-1">
                <ClockIcon />
                {totalTime} דקות
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1">
                <UsersIcon />
                {recipe.servings} מנות
              </span>
            )}
            {recipe.difficulty && (
              <span className="px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
                {DIFFICULTY_LABELS[recipe.difficulty] || recipe.difficulty}
              </span>
            )}
            {recipe.region_name && (
              <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {recipe.region_name}
              </span>
            )}
          </div>
        </header>

        {/* Description */}
        {recipe.description && (
          <section className="mb-8">
            <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
              {recipe.description}
            </p>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Ingredients */}
          {ingredients.length > 0 && (
            <section className="md:col-span-1">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                מצרכים
              </h2>
              <ul className="space-y-2">
                {ingredients.map((ing, i) => {
                  const text =
                    typeof ing === 'string'
                      ? ing
                      : `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim();
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                      {text}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {/* Instructions */}
          {instructions.length > 0 && (
            <section className="md:col-span-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                הוראות הכנה
              </h2>
              <ol className="space-y-4">
                {instructions.map((step, i) => {
                  const text =
                    typeof step === 'string' ? step : step.text || step.step || '';
                  return (
                    <li key={i} className="flex gap-4">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 leading-relaxed pt-1">
                        {text}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        {/* Author / meta footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
          {recipe.author_name && <p>מחבר: {recipe.author_name}</p>}
          {recipe.created_at && (
            <p>
              פורסם:{' '}
              {new Date(recipe.created_at).toLocaleDateString('he-IL', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </footer>
      </article>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons (avoid importing a full icon library in Server Component)
// ---------------------------------------------------------------------------

function ClockIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <circle cx={12} cy={12} r={10} />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      viewBox="0 0 24 24"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx={9} cy={7} r={4} />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
