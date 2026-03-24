import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5') || 5;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const [allDialects] = await pool.query('SELECT id, name FROM dialects') as any[];
    const dialectIds = allDialects.map((d: any) => d.id);

    const searchCondition = search ? 'AND de.term LIKE ?' : '';
    const searchParams = search ? [`%${search}%`] : [];

    // Count dialect translations per entry. LEFT JOIN so entries with NULL dialect_id
    // show dialect_count = 0 (meaning they need ALL dialects).
    // Only show entries with Hebrew term so the card is readable.
    const [entries] = await pool.query(
      `SELECT de.id, de.term, de.detected_language,
              GROUP_CONCAT(DISTINCT d.name) as existing_dialects,
              COUNT(DISTINCT CASE WHEN t.dialect_id IS NOT NULL THEN t.dialect_id END) as dialect_count
       FROM dictionary_entries de
       JOIN translations t ON de.id = t.entry_id
       LEFT JOIN dialects d ON t.dialect_id = d.id
       WHERE de.status = 'active'
       AND de.term REGEXP '^[\u0590-\u05FF]'
       ${searchCondition}
       GROUP BY de.id
       HAVING dialect_count < ?
       ORDER BY dialect_count DESC, de.created_at DESC
       LIMIT ? OFFSET ?`,
      [...searchParams, dialectIds.length, limit, offset]
    ) as any[];

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM (
          SELECT de.id,
                 COUNT(DISTINCT CASE WHEN t.dialect_id IS NOT NULL THEN t.dialect_id END) as dialect_count
          FROM dictionary_entries de
          JOIN translations t ON de.id = t.entry_id
          WHERE de.status = 'active'
          AND de.term REGEXP '^[\u0590-\u05FF]'
          ${searchCondition}
          GROUP BY de.id
          HAVING dialect_count < ?
      ) sub`,
      [...searchParams, dialectIds.length]
    ) as any[];

    const result = entries.map((e: any) => {
      const existing = (e.existing_dialects || '').split(',').filter(Boolean);
      const missing = allDialects.filter((d: any) => !existing.includes(d.name)).map((d: any) => d.name);
      return {
        id: e.id,
        term: e.term,
        detectedLanguage: e.detected_language,
        existingDialects: existing,
        missingDialects: missing
      };
    });

    return NextResponse.json({ entries: result, total });
  } catch (error) {
    console.error('Missing dialects error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים' }, { status: 500 });
  }
}
