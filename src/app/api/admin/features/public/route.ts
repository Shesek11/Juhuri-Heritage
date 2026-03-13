import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';

// GET /api/admin/features/public - Get public feature flags
// Returns 'active' features for regular users, 'admin_only' for admins
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const isAdmin = user?.role === 'admin';

    let query = "SELECT feature_key, status FROM feature_flags WHERE status IN ('active', 'coming_soon')";
    if (isAdmin) {
      query = "SELECT feature_key, status FROM feature_flags WHERE status IN ('active', 'coming_soon', 'admin_only')";
    }

    const [flags]: any = await pool.query(query);

    // Return as a map for easy lookup
    const flagsMap: Record<string, string> = {};
    flags.forEach((f: any) => {
      flagsMap[f.feature_key] = f.status;
    });

    return NextResponse.json(flagsMap);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching public feature flags:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הגדרות' }, { status: 500 });
  }
}
