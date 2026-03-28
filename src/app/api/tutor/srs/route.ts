import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth, getAuthUser } from '@/src/lib/auth';

// Ensure word_mastery table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS word_mastery (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      entry_id INT NOT NULL,
      box INT DEFAULT 1,
      next_review DATETIME DEFAULT CURRENT_TIMESTAMP,
      times_correct INT DEFAULT 0,
      times_incorrect INT DEFAULT 0,
      last_reviewed DATETIME NULL,
      UNIQUE KEY unique_user_word (user_id, entry_id),
      INDEX idx_user_review (user_id, next_review)
    )
  `);
}

const LEITNER_INTERVALS: Record<number, number> = {
  1: 0, 2: 1, 3: 3, 4: 7, 5: 14,
};

// GET /api/tutor/srs — Get words due for review
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ words: [], count: 0 });
    }

    await ensureTable();

    const [rows]: any = await pool.query(`
      SELECT
        wm.entry_id as id,
        de.hebrew_script,
        t.hebrew_script as t_hebrew_script,
        t.latin_script,
        t.pronunciation_guide as pronunciation,
        wm.box,
        wm.times_correct,
        wm.times_incorrect
      FROM word_mastery wm
      JOIN dictionary_entries de ON de.id = wm.entry_id
      LEFT JOIN dialect_scripts t ON t.entry_id = de.id
      WHERE wm.user_id = ? AND wm.next_review <= NOW()
      GROUP BY de.id
      ORDER BY wm.box ASC, wm.next_review ASC
      LIMIT 20
    `, [user.id]);

    return NextResponse.json({ words: rows, count: rows.length });
  } catch (error) {
    console.error('Error fetching SRS words:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים לחזרה' }, { status: 500 });
  }
}

// POST /api/tutor/srs — Update word mastery after answer
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { entryId, isCorrect } = await request.json();

    if (!entryId || isCorrect === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await ensureTable();

    // Get current box
    const [existing]: any = await pool.query(
      'SELECT box FROM word_mastery WHERE user_id = ? AND entry_id = ?',
      [user.id, entryId]
    );

    const currentBox = existing[0]?.box || 1;
    const newBox = isCorrect ? Math.min(currentBox + 1, 5) : 1;
    const intervalDays = LEITNER_INTERVALS[newBox] || 0;

    if (existing.length > 0) {
      await pool.query(`
        UPDATE word_mastery
        SET box = ?,
            next_review = DATE_ADD(NOW(), INTERVAL ? DAY),
            times_correct = times_correct + ?,
            times_incorrect = times_incorrect + ?,
            last_reviewed = NOW()
        WHERE user_id = ? AND entry_id = ?
      `, [newBox, intervalDays, isCorrect ? 1 : 0, isCorrect ? 0 : 1, user.id, entryId]);
    } else {
      await pool.query(`
        INSERT INTO word_mastery (user_id, entry_id, box, next_review, times_correct, times_incorrect, last_reviewed)
        VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?, ?, NOW())
      `, [user.id, entryId, newBox, intervalDays, isCorrect ? 1 : 0, isCorrect ? 0 : 1]);
    }

    return NextResponse.json({
      success: true,
      newBox,
      nextReviewDays: intervalDays,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating SRS:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון SRS' }, { status: 500 });
  }
}
