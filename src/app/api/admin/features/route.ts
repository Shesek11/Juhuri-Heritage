import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/admin/features - Get all feature flags (Admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const [flags] = await pool.query(
      'SELECT * FROM feature_flags ORDER BY name ASC'
    );
    return NextResponse.json(flags);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching feature flags:', error);
    return NextResponse.json({ error: "שגיאה בטעינת הגדרות הפיצ'רים" }, { status: 500 });
  }
}
