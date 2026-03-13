import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { xpForLevel, ensureSchema } from '../../_lib/gamification';

// GET /api/gamification/stats/:userId - Get user's gamification stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await ensureSchema();
    const { userId } = await params;

    const [users]: any = await pool.query(`
      SELECT xp, level, current_streak, contributions_count
      FROM users
      WHERE id = ?
    `, [userId]);

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    const level = user.level || 1;
    const currentXp = user.xp || 0;
    const xpForCurrentLevel = xpForLevel(level - 1);
    const xpForNext = xpForLevel(level);
    const progressPercent = Math.round(((currentXp - xpForCurrentLevel) / (xpForNext - xpForCurrentLevel)) * 100);

    return NextResponse.json({
      xp: currentXp,
      level,
      streak: user.current_streak || 0,
      contributions: user.contributions_count || 0,
      xpForNextLevel: xpForNext,
      progressPercent,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת סטטיסטיקות' }, { status: 500 });
  }
}
