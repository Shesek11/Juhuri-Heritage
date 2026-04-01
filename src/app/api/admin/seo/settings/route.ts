import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

// GET /api/admin/seo/settings - Get all SEO settings
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const [settings] = await pool.query(
      `SELECT setting_key, setting_value, updated_at
       FROM seo_settings ORDER BY setting_key ASC`
    ) as [any[], any];

    // Convert to object for easy frontend consumption
    const obj: Record<string, any> = {};
    for (const s of settings) {
      try {
        obj[s.setting_key] = JSON.parse(s.setting_value);
      } catch {
        obj[s.setting_key] = s.setting_value;
      }
    }
    return NextResponse.json(obj);
  } catch (error) {
    if (error instanceof Response) return error;
    // Table might not exist yet
    if ((error as any)?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json({});
    }
    console.error('SEO settings error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הגדרות SEO' }, { status: 500 });
  }
}

// PUT /api/admin/seo/settings - Bulk update SEO settings
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const settings = await request.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'נדרשים הגדרות' }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      const strValue = typeof value === 'string' ? value : JSON.stringify(value);
      await pool.query(
        `INSERT INTO seo_settings (setting_key, setting_value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
            setting_value = VALUES(setting_value),
            updated_by = VALUES(updated_by),
            updated_at = CURRENT_TIMESTAMP`,
        [key, strValue, (user as any).id]
      );
    }

    await logEvent('SEO_SETTINGS_CHANGED', 'הגדרות SEO עודכנו', user, { keys: Object.keys(settings) }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('SEO settings update error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון הגדרות SEO' }, { status: 500 });
  }
}
