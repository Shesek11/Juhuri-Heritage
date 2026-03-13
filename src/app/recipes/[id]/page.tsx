import type { Metadata } from 'next';
import pool from '@/src/lib/db';
import {
  buildJsonLdGraph,
  buildRecipeJsonLd,
  buildBreadcrumbJsonLd,
} from '@/src/lib/jsonld';
import RecipesWrapper from '../RecipesWrapper';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

interface RecipeRow {
  id: number;
  title: string;
  description: string | null;
  ingredients: string | null;
  instructions: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  photo_url: string | null;
  alt_text: string | null;
}

type Props = { params: Promise<{ id: string }> };

// Server-side metadata for SEO
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return { title: '\u05DE\u05EA\u05DB\u05D5\u05DF \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0' };

  const [rows] = await pool.query<RecipeRow[] & any>(
    `SELECT r.*, rp.url as photo_url, rp.alt_text
     FROM recipes r
     LEFT JOIN recipe_photos rp ON r.id = rp.recipe_id AND rp.is_main = 1
     WHERE r.id = ? AND r.is_approved = 1
     LIMIT 1`,
    [numericId],
  );
  const recipe = (rows as RecipeRow[])[0];
  if (!recipe) return { title: '\u05DE\u05EA\u05DB\u05D5\u05DF \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0' };

  const description =
    recipe.description || `\u05DE\u05EA\u05DB\u05D5\u05DF "${recipe.title}" \u2014 \u05DE\u05D8\u05D1\u05D7 \u05D2'\u05D5\u05D4\u05D5\u05E8\u05D9 \u05DE\u05E1\u05D5\u05E8\u05EA\u05D9`;

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

/**
 * JSON-LD component.
 * Safe: data is server-generated structured data from our own builders
 * (not user input). This is the standard Next.js pattern for JSON-LD.
 */
function JsonLdScript({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  // Fetch recipe for JSON-LD
  let jsonLd: object | null = null;
  if (!isNaN(numericId)) {
    const [rows] = await pool.query<RecipeRow[] & any>(
      `SELECT r.*, rp.url as photo_url
       FROM recipes r
       LEFT JOIN recipe_photos rp ON r.id = rp.recipe_id AND rp.is_main = 1
       WHERE r.id = ? AND r.is_approved = 1
       LIMIT 1`,
      [numericId],
    );
    const recipe = (rows as RecipeRow[])[0];
    if (recipe) {
      const ingredients: any[] = safeJsonParse(recipe.ingredients, []);
      const instructions: any[] = safeJsonParse(recipe.instructions, []);
      jsonLd = buildJsonLdGraph(
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
          { name: '\u05D3\u05E3 \u05D4\u05D1\u05D9\u05EA', url: SITE_URL },
          { name: '\u05DE\u05EA\u05DB\u05D5\u05E0\u05D9\u05DD', url: `${SITE_URL}/recipes` },
          { name: recipe.title, url: `${SITE_URL}/recipes/${recipe.id}` },
        ]),
      );
    }
  }

  return (
    <>
      {jsonLd && <JsonLdScript data={jsonLd} />}
      <RecipesWrapper />
    </>
  );
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
