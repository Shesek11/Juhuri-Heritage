import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/users - Get all users (Admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const [rows] = await pool.query(
      `SELECT id, email, name, role, joined_at, last_login_date, contributions_count, xp, level, current_streak
       FROM users ORDER BY joined_at DESC`
    );

    const users = (rows as any[]).map(r => ({
      id: String(r.id),
      email: r.email,
      name: r.name,
      role: r.role,
      joinedAt: r.joined_at ? new Date(r.joined_at).toISOString() : null,
      lastLoginDate: r.last_login_date ? new Date(r.last_login_date).toISOString() : null,
      contributionsCount: r.contributions_count || 0,
      xp: r.xp || 0,
      level: r.level || 1,
      currentStreak: r.current_streak || 0,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת משתמשים' }, { status: 500 });
  }
}
