import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim();
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5');

    if (!q) {
      return NextResponse.json({ suggestions: [] });
    }

    // Fuzzy match: LIKE on term and hebrew translations
    const [rows] = await pool.query(
      `SELECT de.id, de.term, t.hebrew, de.part_of_speech,
              CASE
                WHEN de.term = ? THEN 100
                WHEN t.hebrew = ? THEN 90
                WHEN de.term LIKE ? THEN 70
                WHEN t.hebrew LIKE ? THEN 60
                WHEN de.term LIKE ? THEN 40
                WHEN t.hebrew LIKE ? THEN 30
                ELSE 10
              END as score
       FROM dictionary_entries de
       LEFT JOIN translations t ON de.id = t.entry_id
       WHERE de.status = 'active'
         AND (de.term LIKE ? OR t.hebrew LIKE ? OR de.russian LIKE ?)
       GROUP BY de.id
       ORDER BY score DESC
       LIMIT ?`,
      [q, q, `${q}%`, `${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, limit]
    ) as any[];

    const suggestions = rows.map((r: any) => ({
      id: r.id,
      term: r.term,
      hebrew: r.hebrew || '',
      partOfSpeech: r.part_of_speech || '',
      score: r.score,
    }));

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    console.error('Similar search error:', err.message);
    return NextResponse.json({ suggestions: [] });
  }
}
