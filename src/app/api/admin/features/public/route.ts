import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';

// GET /api/admin/features/public - Get public feature flags
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const isAdmin = user?.role === 'admin';

    const statuses = isAdmin
      ? "('active', 'coming_soon', 'admin_only')"
      : "('active', 'coming_soon')";

    const [flags]: any = await pool.query(
      `SELECT feature_key, name, name_en, name_ru, status, sort_order, icon, link, show_in_nav, show_in_footer
       FROM feature_flags WHERE status IN ${statuses} ORDER BY sort_order`
    );

    // Return both: ordered list + legacy map for backward compatibility
    const flagsMap: Record<string, string> = {};
    flags.forEach((f: any) => {
      flagsMap[f.feature_key] = f.status;
    });

    return NextResponse.json({ features: flags, map: flagsMap });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching public feature flags:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הגדרות' }, { status: 500 });
  }
}
