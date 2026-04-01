import { NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';
const LOCALES = ['he', 'en', 'ru'] as const;
const URLS_PER_SITEMAP = 10000;

function toDate(d: any): string {
  return d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
}

function urlEntry(path: string, lastmod: string, changefreq: string, priority: number): string {
  const alternates = LOCALES.map(l =>
    `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}/${l}${path}" />`
  ).join('\n');
  const xdefault = `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/he${path}" />`;

  return LOCALES.map(locale =>
    `  <url>\n    <loc>${SITE_URL}/${locale}${path}</loc>\n${alternates}\n${xdefault}\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  ).join('\n');
}

/**
 * GET /api/sitemap/[id] → sub-sitemap XML
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return new NextResponse('Invalid sitemap ID', { status: 400 });
  }

  const today = new Date().toISOString().split('T')[0];
  const entries: string[] = [];

  try {
    if (id === 0) {
      // Static pages
      const staticPaths = [
        { path: '', freq: 'daily', priority: 1.0 },
        { path: '/dictionary', freq: 'daily', priority: 0.9 },
        { path: '/tutor', freq: 'weekly', priority: 0.8 },
        { path: '/recipes', freq: 'weekly', priority: 0.8 },
        { path: '/marketplace', freq: 'weekly', priority: 0.7 },
        { path: '/family', freq: 'monthly', priority: 0.6 },
        { path: '/about', freq: 'monthly', priority: 0.5 },
        { path: '/contact', freq: 'monthly', priority: 0.4 },
      ];
      for (const p of staticPaths) {
        entries.push(urlEntry(p.path, today, p.freq, p.priority));
      }

      // Recipes
      const [recipes] = await pool.query(
        `SELECT id, updated_at FROM recipes WHERE is_approved = 1`
      ) as any[];
      for (const r of recipes as any[]) {
        entries.push(urlEntry(`/recipes/${r.id}`, toDate(r.updated_at), 'monthly', 0.6));
      }

      // Vendors
      const [vendors] = await pool.query(
        `SELECT slug, updated_at FROM marketplace_vendors WHERE status = 'active'`
      ) as any[];
      for (const v of vendors as any[]) {
        entries.push(urlEntry(`/marketplace/${v.slug}`, toDate(v.updated_at), 'weekly', 0.5));
      }

      // First batch of words
      const usedUrls = (staticPaths.length + (recipes as any[]).length + (vendors as any[]).length) * LOCALES.length;
      const wordsSlots = Math.floor((URLS_PER_SITEMAP - usedUrls) / LOCALES.length);

      if (wordsSlots > 0) {
        const [words] = await pool.query(
          `SELECT slug, hebrew_script, updated_at FROM dictionary_entries WHERE status = 'active' AND (slug IS NOT NULL OR hebrew_script != '') ORDER BY slug, hebrew_script LIMIT ?`,
          [wordsSlots]
        ) as any[];
        for (const w of words as any[]) {
          const wordSlug = w.slug || encodeURIComponent(w.hebrew_script);
          entries.push(urlEntry(`/word/${wordSlug}`, toDate(w.updated_at), 'monthly', 0.5));
        }
      }
    } else {
      // Subsequent sitemaps: words only
      const wordsPerSitemap = Math.floor(URLS_PER_SITEMAP / LOCALES.length);
      // Estimate words in first sitemap (static pages take ~300 URL slots)
      const wordsInFirst = Math.floor((URLS_PER_SITEMAP - 300) / LOCALES.length);
      const offset = wordsInFirst + (id - 1) * wordsPerSitemap;

      const [words] = await pool.query(
        `SELECT slug, hebrew_script, updated_at FROM dictionary_entries WHERE status = 'active' AND (slug IS NOT NULL OR hebrew_script != '') ORDER BY slug, hebrew_script LIMIT ? OFFSET ?`,
        [wordsPerSitemap, offset]
      ) as any[];
      for (const w of words as any[]) {
        const wordSlug = w.slug || encodeURIComponent(w.hebrew_script);
        entries.push(urlEntry(`/word/${wordSlug}`, toDate(w.updated_at), 'monthly', 0.5));
      }
    }
  } catch (error) {
    console.error(`Sitemap ${id} generation error:`, error);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${entries.join('\n')}\n</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
