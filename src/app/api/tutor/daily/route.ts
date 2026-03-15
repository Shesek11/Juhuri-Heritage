import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// POST /api/tutor/daily — Set daily XP goal
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { targetXp } = await request.json();

    const validTargets = [5, 10, 15, 20];
    if (!validTargets.includes(targetXp)) {
      return NextResponse.json({ error: 'Invalid target' }, { status: 400 });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_daily_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        target_xp INT DEFAULT 10,
        UNIQUE KEY unique_user_goal (user_id)
      )
    `);

    await pool.query(`
      INSERT INTO user_daily_goals (user_id, target_xp) VALUES (?, ?)
      ON DUPLICATE KEY UPDATE target_xp = ?
    `, [user.id, targetXp, targetXp]);

    return NextResponse.json({ success: true, targetXp });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error setting daily goal:', error);
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}
