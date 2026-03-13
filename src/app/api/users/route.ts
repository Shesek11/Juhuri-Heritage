import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/users - Get all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [users] = await pool.query(
      `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak
       FROM users ORDER BY joined_at DESC`
    );

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת משתמשים' }, { status: 500 });
  }
}
