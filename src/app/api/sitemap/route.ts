import { NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';
const URLS_PER_SITEMAP = 10000;
const LOCALES = ['he', 'en', 'ru'] as const;

/**
 * GET /api/sitemap → sitemap index XML
 * Lists sub-sitemaps: /api/sitemap/0, /api/sitemap/1, etc.
 */
export async function GET() {
  const today = new Date().toISOString().split('T')[0];

  try {
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND (slug IS NOT NULL OR hebrew_script != '')`
    ) as any[];
    const wordCount = countResult[0]?.cnt || 0;
    const totalUrls = (wordCount * LOCALES.length) + 200;
    const numSitemaps = Math.max(1, Math.ceil(totalUrls / URLS_PER_SITEMAP));

    const sitemaps = Array.from({ length: numSitemaps }, (_, i) =>
      `  <sitemap>\n    <loc>${SITE_URL}/api/sitemap/${i}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
    ).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemaps}\n</sitemapindex>`;

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    // Fallback: single sitemap
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <sitemap>\n    <loc>${SITE_URL}/api/sitemap/0</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>\n</sitemapindex>`;
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml' },
    });
  }
}
