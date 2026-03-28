import { MetadataRoute } from 'next';
import pool from '@/src/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';
const LOCALES = ['he', 'en', 'ru'] as const;

function toDate(d: any): string {
  return d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
}

function withAlternates(path: string, lastModified: string, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'], priority: number): MetadataRoute.Sitemap {
  return LOCALES.map(locale => ({
    url: `${SITE_URL}/${locale}${path}`,
    lastModified,
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries([
        ...LOCALES.map(l => [l, `${SITE_URL}/${l}${path}`]),
        ['x-default', `${SITE_URL}/he${path}`],
      ]),
    },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = new Date().toISOString().split('T')[0];

  // Static pages — generate for all locales
  const staticPages = [
    ...withAlternates('', today, 'daily', 1.0),
    ...withAlternates('/dictionary', today, 'daily', 0.9),
    ...withAlternates('/tutor', today, 'weekly', 0.8),
    ...withAlternates('/recipes', today, 'weekly', 0.8),
    ...withAlternates('/marketplace', today, 'weekly', 0.7),
    ...withAlternates('/family', today, 'monthly', 0.6),
    ...withAlternates('/about', today, 'monthly', 0.5),
    ...withAlternates('/contact', today, 'monthly', 0.4),
  ];

  try {
    // Dictionary words
    const [words] = await pool.query(
      `SELECT hebrew_script, updated_at FROM dictionary_entries WHERE status = 'active' ORDER BY updated_at DESC`
    ) as any[];

    const wordPages = words.flatMap((w: any) =>
      withAlternates(
        `/word/${encodeURIComponent(w.hebrew_script)}`,
        toDate(w.updated_at),
        'monthly',
        0.5
      )
    );

    // Recipes
    const [recipes] = await pool.query(
      `SELECT id, updated_at FROM recipes WHERE is_approved = 1`
    ) as any[];

    const recipePages = recipes.flatMap((r: any) =>
      withAlternates(`/recipes/${r.id}`, toDate(r.updated_at), 'monthly', 0.6)
    );

    // Marketplace vendors
    const [vendors] = await pool.query(
      `SELECT slug, updated_at FROM marketplace_vendors WHERE status = 'active'`
    ) as any[];

    const vendorPages = vendors.flatMap((v: any) =>
      withAlternates(`/marketplace/${v.slug}`, toDate(v.updated_at), 'weekly', 0.5)
    );

    return [...staticPages, ...wordPages, ...recipePages, ...vendorPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}
