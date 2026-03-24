import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5') || 5;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const [allDialects] = await pool.query('SELECT id, name FROM dialects') as any[];
    const dialectCount = allDialects.length;

    const searchCondition = search ? 'AND de.term LIKE ?' : '';
    const searchParams = search ? [`%${search}%`] : [];

    // Entries that don't have translations for ALL dialects.
    // Most entries have dialect_id = NULL, so they count as 0 dialects.
    const [entries] = await pool.query(
      `SELECT de.id, de.term, de.detected_language,
              GROUP_CONCAT(DISTINCT d.name) as existing_dialects,
              COUNT(DISTINCT CASE WHEN t.dialect_id IS NOT NULL THEN t.dialect_id END) as dc
       FROM dictionary_entries de
       JOIN translations t ON de.id = t.entry_id
       LEFT JOIN dialects d ON t.dialect_id = d.id
       WHERE de.status = 'active'
       AND de.term REGEXP '^[א-ת]'
       ${searchCondition}
       GROUP BY de.id
       HAVING dc < ?
       ORDER BY dc DESC, de.created_at DESC
       LIMIT ? OFFSET ?`,
      [...searchParams, dialectCount, limit, offset]
    ) as any[];

    // Total count without Hebrew filter — shows real scope of work
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM (
          SELECT de.id,
                 COUNT(DISTINCT CASE WHEN t.dialect_id IS NOT NULL THEN t.dialect_id END) as dc
          FROM dictionary_entries de
          JOIN translations t ON de.id = t.entry_id
          WHERE de.status = 'active'
          ${searchCondition}
          GROUP BY de.id
          HAVING dc < ?
      ) sub`,
      [...searchParams, dialectCount]
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
