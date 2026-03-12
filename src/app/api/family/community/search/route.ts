import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20') || 20;

    if (!q || q.length < 2) {
      return NextResponse.json([]);
    }

    const [results] = await pool.query(`
      SELECT id, first_name, last_name, birth_date, photo_url, gender,
          CASE
              WHEN last_name = ? OR first_name = ? THEN 100
              WHEN SOUNDEX(last_name) = SOUNDEX(?) OR SOUNDEX(first_name) = SOUNDEX(?) THEN 80
              WHEN last_name LIKE ? OR first_name LIKE ? THEN 60
          END as match_score
      FROM family_members
      WHERE merged_into IS NULL
        AND (
            last_name LIKE ?
            OR first_name LIKE ?
            OR SOUNDEX(last_name) = SOUNDEX(?)
            OR SOUNDEX(first_name) = SOUNDEX(?)
        )
      ORDER BY match_score DESC, last_name, first_name
      LIMIT ?
    `, [q, q, q, q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, q, q, limit]) as any[];

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching members:', error);
    return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
  }
}
