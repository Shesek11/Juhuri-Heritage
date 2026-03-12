import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/admin/seo/assets - Get current asset paths
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const [rows] = await pool.query(
      `SELECT setting_key, setting_value FROM seo_settings WHERE setting_key IN ('og_image', 'site_logo', 'favicon')`
    ) as [any[], any];

    const assets: Record<string, string> = {};
    for (const r of rows) {
      assets[r.setting_key] = r.setting_value;
    }

    return NextResponse.json(assets);
  } catch (error) {
    if (error instanceof Response) return error;
    if ((error as any)?.code === 'ER_NO_SUCH_TABLE') return NextResponse.json({});
    console.error('Assets error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת נכסים' }, { status: 500 });
  }
}
