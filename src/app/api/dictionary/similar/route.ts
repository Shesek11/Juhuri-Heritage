import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');

    if (!q) {
      return NextResponse.json({ suggestions: [] });
    }

    // Fuzzy match: LIKE on hebrew_script and hebrew_script translations
    const [rows] = await pool.query(
      `SELECT de.id, de.hebrew_script, t.hebrew_script as t_hebrew_script, de.part_of_speech,
              CASE
                WHEN de.hebrew_script = ? THEN 100
                WHEN t.hebrew_script = ? THEN 90
                WHEN de.hebrew_script LIKE ? THEN 70
                WHEN t.hebrew_script LIKE ? THEN 60
                WHEN de.hebrew_script LIKE ? THEN 40
                WHEN t.hebrew_script LIKE ? THEN 30
                ELSE 10
              END as score
       FROM dictionary_entries de
       LEFT JOIN dialect_scripts t ON de.id = t.entry_id
       WHERE de.status = 'active'
         AND (de.hebrew_script LIKE ? OR t.hebrew_script LIKE ? OR de.russian_short LIKE ?)
       GROUP BY de.id
       ORDER BY score DESC
       LIMIT ?`,
      [q, q, `${q}%`, `${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, limit]
    ) as any[];

    const suggestions = rows.map((r: any) => ({
      id: r.id,
      hebrewScript: r.hebrew_script,
      tHebrewScript: r.t_hebrew_script || '',
      partOfSpeech: r.part_of_speech || '',
      score: r.score,
    }));

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error('Similar search error:', err.message);
    return NextResponse.json({ suggestions: [] });
  }
}
