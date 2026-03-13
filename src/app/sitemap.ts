import { MetadataRoute } from 'next';
import pool from '@/src/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

function toDate(d: any): string {
  return d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const today = new Date().toISOString().split('T')[0];

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: today, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/dictionary`, lastModified: today, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/tutor`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/recipes`, lastModified: today, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/marketplace`, lastModified: today, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/family`, lastModified: today, changeFrequency: 'monthly', priority: 0.6 },
  ];

  try {
    // Dictionary words
    const [words] = await pool.query(
      `SELECT term, updated_at FROM dictionary_entries WHERE status = 'active' ORDER BY updated_at DESC`
    ) as any[];

    const wordPages: MetadataRoute.Sitemap = words.map((w: any) => ({
      url: `${SITE_URL}/word/${encodeURIComponent(w.term)}`,
      lastModified: toDate(w.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));

    // Recipes
    const [recipes] = await pool.query(
      `SELECT id, updated_at FROM recipes WHERE is_approved = 1`
    ) as any[];

    const recipePages: MetadataRoute.Sitemap = recipes.map((r: any) => ({
      url: `${SITE_URL}/recipes/${r.id}`,
      lastModified: toDate(r.updated_at),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    }));

    // Marketplace vendors
    const [vendors] = await pool.query(
      `SELECT slug, updated_at FROM marketplace_vendors WHERE status = 'active'`
    ) as any[];

    const vendorPages: MetadataRoute.Sitemap = vendors.map((v: any) => ({
      url: `${SITE_URL}/marketplace/${v.slug}`,
      lastModified: toDate(v.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    return [...staticPages, ...wordPages, ...recipePages, ...vendorPages];
  } catch (error) {
    console.error('Sitemap generation error:', error);
    return staticPages;
  }
}
