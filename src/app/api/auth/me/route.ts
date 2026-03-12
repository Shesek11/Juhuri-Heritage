import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);

    const [users] = await pool.query(
      `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak
       FROM users WHERE id = ?`,
      [authUser.id]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
    }

    // Get completed units
    const [progress] = await pool.query(
      'SELECT unit_id FROM user_progress WHERE user_id = ?',
      [authUser.id]
    ) as any[];

    const user = {
      ...users[0],
      joinedAt: users[0].joined_at,
      contributionsCount: users[0].contributions_count,
      currentStreak: users[0].current_streak,
      completedUnits: progress.map((p: any) => p.unit_id),
    };

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get user error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת משתמש' }, { status: 500 });
  }
}
