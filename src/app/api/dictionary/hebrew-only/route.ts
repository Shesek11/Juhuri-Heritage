import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20') || 20;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const searchCondition = search ? 'AND (de.term LIKE ? OR t.hebrew LIKE ?)' : '';
    const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

    // "הוסף ג'והורי" = entries where:
    // 1. Term is NOT in Hebrew script (missing Hebrew transliteration), OR
    // 2. Has Hebrew translation but no Juhuri latin transliteration
    const [entries] = await pool.query(`
      SELECT de.id, de.term, de.detected_language, t.hebrew
      FROM dictionary_entries de
      LEFT JOIN translations t ON de.id = t.entry_id
      WHERE de.status = 'active'
      AND (
        de.term NOT REGEXP '^[א-ת]'
        OR (t.hebrew IS NOT NULL AND t.hebrew != '' AND (t.latin IS NULL OR t.latin = ''))
      )
      ${searchCondition}
      GROUP BY de.id
      ORDER BY de.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, limit, offset]) as any[];

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(DISTINCT de.id) as total FROM dictionary_entries de
      LEFT JOIN translations t ON de.id = t.entry_id
      WHERE de.status = 'active'
      AND (
        de.term NOT REGEXP '^[א-ת]'
        OR (t.hebrew IS NOT NULL AND t.hebrew != '' AND (t.latin IS NULL OR t.latin = ''))
      )
      ${searchCondition}
    `, searchParams) as any[];

    return NextResponse.json({ entries, total });
  } catch (error) {
    console.error('Hebrew-only error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים' }, { status: 500 });
  }
}
