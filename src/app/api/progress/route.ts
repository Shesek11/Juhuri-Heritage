import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// GET /api/progress - Get user's progress
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const [progress]: any = await pool.query(
      'SELECT unit_id, score, completed_at FROM user_progress WHERE user_id = ?',
      [user.id]
    );

    const [userRows]: any = await pool.query(
      'SELECT xp, level, current_streak FROM users WHERE id = ?',
      [user.id]
    );

    return NextResponse.json({
      completedUnits: progress.map((p: any) => p.unit_id),
      xp: userRows[0]?.xp || 0,
      level: userRows[0]?.level || 1,
      currentStreak: userRows[0]?.current_streak || 0,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get progress error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת התקדמות' }, { status: 500 });
  }
}
