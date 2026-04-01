import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20') || 20;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const searchCondition = search ? 'AND (de.hebrew_script LIKE ? OR t.latin_script LIKE ?)' : '';
    const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

    const [entries] = await pool.query(`
      SELECT de.id, de.hebrew_script, de.detected_language, t.latin_script, t.cyrillic_script
      FROM dictionary_entries de
      JOIN dialect_scripts t ON de.id = t.entry_id
      WHERE de.status = 'active'
      AND de.detected_language = 'Juhuri'
      AND (de.hebrew_script IS NULL OR de.hebrew_script = '')
      ${searchCondition}
      GROUP BY de.id
      ORDER BY de.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, limit, offset]) as any[];

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(DISTINCT de.id) as total FROM dictionary_entries de
      JOIN dialect_scripts t ON de.id = t.entry_id
      WHERE de.status = 'active'
      AND de.detected_language = 'Juhuri'
      AND (de.hebrew_script IS NULL OR de.hebrew_script = '')
      ${searchCondition}
    `, searchParams) as any[];

    return NextResponse.json({ entries, total });
  } catch (error) {
    console.error('Juhuri-only error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים' }, { status: 500 });
  }
}
