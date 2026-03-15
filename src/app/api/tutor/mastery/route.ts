import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser, requireAuth } from '@/src/lib/auth';

// Ensure tables exist
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS unit_mastery (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      unit_id VARCHAR(50) NOT NULL,
      mastery_level INT DEFAULT 0,
      best_score INT DEFAULT 0,
      attempts INT DEFAULT 0,
      completed_at TIMESTAMP NULL,
      UNIQUE KEY unique_user_unit (user_id, unit_id),
      INDEX idx_user (user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_daily_goals (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      target_xp INT DEFAULT 10,
      UNIQUE KEY unique_user_goal (user_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      date DATE NOT NULL,
      xp_earned INT DEFAULT 0,
      words_learned INT DEFAULT 0,
      words_reviewed INT DEFAULT 0,
      lessons_completed INT DEFAULT 0,
      UNIQUE KEY unique_user_date (user_id, date),
      INDEX idx_user_date (user_id, date)
    )
  `);
}

// GET /api/tutor/mastery — Get full tutor progress for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({
        unitMastery: {},
        totalWordsLearned: 0,
        wordsDueForReview: 0,
        dailyXpEarned: 0,
        dailyXpGoal: 10,
        weeklyStats: [],
      });
    }

    await ensureTables();

    // Unit mastery
    const [mastery]: any = await pool.query(
      'SELECT unit_id, mastery_level, best_score, attempts FROM unit_mastery WHERE user_id = ?',
      [user.id]
    );

    const unitMastery: Record<string, any> = {};
    for (const m of mastery) {
      unitMastery[m.unit_id] = {
        unitId: m.unit_id,
        masteryLevel: m.mastery_level,
        bestScore: m.best_score,
        attempts: m.attempts,
      };
    }

    // Total words learned (in box 2+)
    let totalWordsLearned = 0;
    let wordsDueForReview = 0;
    try {
      const [wl]: any = await pool.query(
        'SELECT COUNT(*) as cnt FROM word_mastery WHERE user_id = ? AND box >= 2',
        [user.id]
      );
      totalWordsLearned = wl[0]?.cnt || 0;

      const [wd]: any = await pool.query(
        'SELECT COUNT(*) as cnt FROM word_mastery WHERE user_id = ? AND next_review <= NOW()',
        [user.id]
      );
      wordsDueForReview = wd[0]?.cnt || 0;
    } catch { /* table might not exist yet */ }

    // Daily progress
    const today = new Date().toISOString().slice(0, 10);
    const [dailyRows]: any = await pool.query(
      'SELECT xp_earned FROM daily_progress WHERE user_id = ? AND date = ?',
      [user.id, today]
    );
    const dailyXpEarned = dailyRows[0]?.xp_earned || 0;

    // Daily goal
    const [goalRows]: any = await pool.query(
      'SELECT target_xp FROM user_daily_goals WHERE user_id = ?',
      [user.id]
    );
    const dailyXpGoal = goalRows[0]?.target_xp || 10;

    // Weekly stats (last 7 days)
    const [weeklyRows]: any = await pool.query(
      `SELECT date, xp_earned, words_learned, words_reviewed, lessons_completed
       FROM daily_progress
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       ORDER BY date`,
      [user.id]
    );

    return NextResponse.json({
      unitMastery,
      totalWordsLearned,
      wordsDueForReview,
      dailyXpEarned,
      dailyXpGoal,
      weeklyStats: weeklyRows,
    });
  } catch (error) {
    console.error('Error fetching mastery:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת התקדמות' }, { status: 500 });
  }
}

// POST /api/tutor/mastery — Update unit mastery after lesson completion
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { unitId, score, accuracy, wordsLearned = 0, wordsReviewed = 0 } = await request.json();

    if (!unitId || score === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await ensureTables();

    // Get current mastery
    const [existing]: any = await pool.query(
      'SELECT mastery_level, best_score, attempts FROM unit_mastery WHERE user_id = ? AND unit_id = ?',
      [user.id, unitId]
    );

    const currentLevel = existing[0]?.mastery_level || 0;
    const currentBest = existing[0]?.best_score || 0;
    const currentAttempts = existing[0]?.attempts || 0;

    // Determine new mastery level based on accuracy
    let newLevel = currentLevel;
    if (accuracy >= 95 && currentLevel < 5) newLevel = Math.max(currentLevel, 5);
    else if (accuracy >= 90 && currentLevel < 4) newLevel = Math.max(currentLevel, 4);
    else if (accuracy >= 80 && currentLevel < 3) newLevel = Math.max(currentLevel, 3);
    else if (accuracy >= 70 && currentLevel < 2) newLevel = Math.max(currentLevel, 2);
    else if (accuracy >= 60 && currentLevel < 1) newLevel = Math.max(currentLevel, 1);

    // Upsert unit mastery
    await pool.query(`
      INSERT INTO unit_mastery (user_id, unit_id, mastery_level, best_score, attempts, completed_at)
      VALUES (?, ?, ?, ?, 1, NOW())
      ON DUPLICATE KEY UPDATE
        mastery_level = GREATEST(mastery_level, ?),
        best_score = GREATEST(best_score, ?),
        attempts = attempts + 1,
        completed_at = NOW()
    `, [user.id, unitId, newLevel, score, newLevel, score]);

    // Award XP
    const xpEarned = Math.round(score * 0.2) + 10; // Base 10 + 20% of score
    await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [xpEarned, user.id]);

    // Update daily progress
    const today = new Date().toISOString().slice(0, 10);
    await pool.query(`
      INSERT INTO daily_progress (user_id, date, xp_earned, words_learned, words_reviewed, lessons_completed)
      VALUES (?, ?, ?, ?, ?, 1)
      ON DUPLICATE KEY UPDATE
        xp_earned = xp_earned + ?,
        words_learned = words_learned + ?,
        words_reviewed = words_reviewed + ?,
        lessons_completed = lessons_completed + 1
    `, [user.id, today, xpEarned, wordsLearned, wordsReviewed, xpEarned, wordsLearned, wordsReviewed]);

    // Also update legacy user_progress for backward compat
    await pool.query(`
      INSERT INTO user_progress (user_id, unit_id, score)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE score = GREATEST(score, ?)
    `, [user.id, unitId, score, score]);

    // Get updated user data
    const [userData]: any = await pool.query(
      'SELECT xp, level FROM users WHERE id = ?',
      [user.id]
    );

    const { calculateLevel } = await import('@/src/app/api/gamification/_lib/gamification');
    const newXp = userData[0]?.xp || 0;
    const newUserLevel = calculateLevel(newXp);
    await pool.query('UPDATE users SET level = ? WHERE id = ?', [newUserLevel, user.id]);

    return NextResponse.json({
      success: true,
      xpEarned,
      newMasteryLevel: newLevel,
      totalXp: newXp,
      level: newUserLevel,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating mastery:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון התקדמות' }, { status: 500 });
  }
}
