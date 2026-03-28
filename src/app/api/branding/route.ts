import { NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// GET /api/branding — public endpoint for site branding assets
export async function GET() {
  try {
    const [rows] = await pool.query(
      `SELECT setting_key, setting_value FROM seo_settings WHERE setting_key IN ('site_logo', 'favicon')`
    ) as [any[], any];

    const branding: Record<string, string | null> = {
      siteLogo: null,
      favicon: null,
    };

    for (const r of rows) {
      if (r.setting_key === 'site_logo') branding.siteLogo = r.setting_value;
      if (r.setting_key === 'favicon') branding.favicon = r.setting_value;
    }

    return NextResponse.json(branding, {
      headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' },
    });
  } catch {
    return NextResponse.json({ siteLogo: null, favicon: null });
  }
}
