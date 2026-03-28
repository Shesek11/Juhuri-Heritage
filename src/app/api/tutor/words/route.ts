import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// GET /api/tutor/words?unitId=unit_greetings
// Returns dictionary words assigned to a curriculum unit
export async function GET(request: NextRequest) {
  try {
    const unitId = request.nextUrl.searchParams.get('unitId');

    if (!unitId) {
      return NextResponse.json({ error: 'unitId is required' }, { status: 400 });
    }

    // Ensure unit_words table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS unit_words (
        id INT AUTO_INCREMENT PRIMARY KEY,
        unit_id VARCHAR(50) NOT NULL,
        entry_id INT NOT NULL,
        display_order INT DEFAULT 0,
        UNIQUE KEY unique_unit_word (unit_id, entry_id),
        INDEX idx_unit (unit_id)
      )
    `);

    const [rows]: any = await pool.query(`
      SELECT
        de.id,
        de.hebrew_script,
        t.pronunciation_guide as pronunciation,
        t.hebrew_script as t_hebrew_script,
        t.latin_script,
        e.origin as example,
        e.translated as exampleTranslation
      FROM unit_words uw
      JOIN dictionary_entries de ON de.id = uw.entry_id
      LEFT JOIN dialect_scripts t ON t.entry_id = de.id
      LEFT JOIN examples e ON e.entry_id = de.id
      WHERE uw.unit_id = ?
        AND de.status = 'active'
      GROUP BY de.id
      ORDER BY uw.display_order, de.id
    `, [unitId]);

    return NextResponse.json({ words: rows });
  } catch (error) {
    console.error('Error fetching unit words:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים' }, { status: 500 });
  }
}
