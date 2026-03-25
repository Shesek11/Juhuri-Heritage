import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20') || 20;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const searchCondition = search ? 'AND (de.term LIKE ? OR t.hebrew LIKE ? OR t.latin LIKE ?)' : '';
    const searchParams = search ? [`%${search}%`, `%${search}%`, `%${search}%`] : [];

    // "הוסף ג'והורי" = entries that have latin or cyrillic but NO Hebrew term.
    // These need someone to add the Hebrew transliteration.
    const [entries] = await pool.query(`
      SELECT de.id, de.term, de.detected_language, t.hebrew, t.latin, t.cyrillic
      FROM dictionary_entries de
      JOIN translations t ON de.id = t.entry_id
      WHERE de.status = 'active'
      AND (de.term = '' OR de.term IS NULL OR de.term NOT REGEXP '^[א-ת]')
      AND (t.latin IS NOT NULL AND t.latin != '' OR t.cyrillic IS NOT NULL AND t.cyrillic != '')
      ${searchCondition}
      GROUP BY de.id
      ORDER BY de.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, limit, offset]) as any[];

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(DISTINCT de.id) as total FROM dictionary_entries de
      JOIN translations t ON de.id = t.entry_id
      WHERE de.status = 'active'
      AND (de.term = '' OR de.term IS NULL OR de.term NOT REGEXP '^[א-ת]')
      AND (t.latin IS NOT NULL AND t.latin != '' OR t.cyrillic IS NOT NULL AND t.cyrillic != '')
      ${searchCondition}
    `, searchParams) as any[];

    return NextResponse.json({ entries, total });
  } catch (error) {
    console.error('Hebrew-only error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים' }, { status: 500 });
  }
}
