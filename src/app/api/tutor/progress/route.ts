import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';

// GET /api/tutor/progress — Get weekly stats for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ weeklyStats: [], totalWordsLearned: 0 });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS daily_progress (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        xp_earned INT DEFAULT 0,
        words_learned INT DEFAULT 0,
        words_reviewed INT DEFAULT 0,
        lessons_completed INT DEFAULT 0,
        UNIQUE KEY unique_user_date (user_id, date)
      )
    `);

    const [weeklyRows]: any = await pool.query(
      `SELECT date, xp_earned, words_learned, words_reviewed, lessons_completed
       FROM daily_progress
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY date`,
      [user.id]
    );

    // Total words learned
    let totalWordsLearned = 0;
    try {
      const [wl]: any = await pool.query(
        'SELECT COUNT(*) as cnt FROM word_mastery WHERE user_id = ? AND box >= 2',
        [user.id]
      );
      totalWordsLearned = wl[0]?.cnt || 0;
    } catch { /* table might not exist */ }

    // Weekly totals
    const weekTotals = weeklyRows.reduce((acc: any, r: any) => ({
      xpEarned: acc.xpEarned + (r.xp_earned || 0),
      wordsLearned: acc.wordsLearned + (r.words_learned || 0),
      wordsReviewed: acc.wordsReviewed + (r.words_reviewed || 0),
      lessonsCompleted: acc.lessonsCompleted + (r.lessons_completed || 0),
    }), { xpEarned: 0, wordsLearned: 0, wordsReviewed: 0, lessonsCompleted: 0 });

    return NextResponse.json({
      weeklyStats: weeklyRows,
      weekTotals,
      totalWordsLearned,
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}
