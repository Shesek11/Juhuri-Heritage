import { MetadataRoute } from 'next';
import pool from '@/src/lib/db';

export const dynamic = 'force-dynamic';

const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Try DB-first for custom robots.txt content
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM seo_settings WHERE setting_key = 'robots_txt'"
    ) as any[];

    if (rows.length > 0 && rows[0].setting_value) {
      // DB has custom robots.txt — parse it into the Robots format
      // But Next.js robots() expects an object, not raw text.
      // For custom text, we'd use a route handler. For now, use standard format.
    }
  } catch {
    // DB not available, use defaults
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
