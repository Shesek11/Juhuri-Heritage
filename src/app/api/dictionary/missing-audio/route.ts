import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20') || 20;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const searchCondition = search ? 'AND (de.hebrew_script LIKE ? OR t.hebrew_script LIKE ?)' : '';
    const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

    // Entries with Hebrew term that have no approved audio recording
    const [entries] = await pool.query(`
      SELECT de.id, de.hebrew_script, de.detected_language, t.hebrew_script as t_hebrew_script, t.latin_script
      FROM dictionary_entries de
      LEFT JOIN dialect_scripts t ON de.id = t.entry_id
      LEFT JOIN audio_recordings ar ON de.id = ar.entry_id AND ar.status = 'approved'
      WHERE de.status = 'active'
        AND ar.id IS NULL
        AND de.hebrew_script REGEXP '^[א-ת]'
        ${searchCondition}
      GROUP BY de.id
      ORDER BY de.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, limit, offset]) as any[];

    // Total count without Hebrew filter — shows real scope
    const [[{ total }]] = await pool.query(`
      SELECT COUNT(DISTINCT de.id) as total
      FROM dictionary_entries de
      LEFT JOIN audio_recordings ar ON de.id = ar.entry_id AND ar.status = 'approved'
      WHERE de.status = 'active'
        AND ar.id IS NULL
        ${searchCondition}
    `, searchParams) as any[];

    return NextResponse.json({ entries, total });
  } catch (error) {
    console.error('Missing audio error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים' }, { status: 500 });
  }
}
