import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// POST /api/progress/complete-unit
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { unitId, score } = await request.json();

    if (!unitId) {
      return NextResponse.json({ error: 'נדרש מזהה יחידה' }, { status: 400 });
    }

    // Check if already completed
    const [existing]: any = await pool.query(
      'SELECT id FROM user_progress WHERE user_id = ? AND unit_id = ?',
      [user.id, unitId]
    );

    const xpGained = score ? Math.round(score * 2) : 100;

    if (existing.length === 0) {
      // First completion
      await pool.query(
        'INSERT INTO user_progress (user_id, unit_id, score) VALUES (?, ?, ?)',
        [user.id, unitId, score || 0]
      );

      // Award XP
      await pool.query(
        'UPDATE users SET xp = xp + ?, level = FLOOR((xp + ?) / 1000) + 1 WHERE id = ?',
        [xpGained, xpGained, user.id]
      );
    } else {
      // Update score if better
      await pool.query(
        'UPDATE user_progress SET score = GREATEST(score, ?), completed_at = NOW() WHERE user_id = ? AND unit_id = ?',
        [score || 0, user.id, unitId]
      );
    }

    // Get updated user info
    const [userRows]: any = await pool.query(
      'SELECT xp, level FROM users WHERE id = ?',
      [user.id]
    );

    return NextResponse.json({
      success: true,
      xp: userRows[0]?.xp || 0,
      level: userRows[0]?.level || 1,
      xpGained: existing.length === 0 ? xpGained : 0,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Complete unit error:', error);
    return NextResponse.json({ error: 'שגיאה בשמירת התקדמות' }, { status: 500 });
  }
}
