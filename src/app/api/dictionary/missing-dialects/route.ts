import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '5') || 5;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const [allDialects] = await pool.query('SELECT id, name FROM dialects') as any[];
    const dialectCount = allDialects.length;

    const searchCondition = search ? 'AND de.hebrew_script LIKE ?' : '';
    const searchParams = search ? [`%${search}%`] : [];

    // Entries that don't have dialect_scripts for ALL dialects.
    // Most entries have dialect_id = NULL, so they count as 0 dialects.
    const [entries] = await pool.query(
      `SELECT de.id, de.hebrew_script, de.detected_language,
              de.hebrew_script as t_hebrew_script, MAX(t.latin_script) as t_latin_script,
              MAX(t.cyrillic_script) as t_cyrillic_script,
              GROUP_CONCAT(DISTINCT d.name) as existing_dialects,
              COUNT(DISTINCT CASE WHEN t.dialect_id IS NOT NULL THEN t.dialect_id END) as dc
       FROM dictionary_entries de
       JOIN dialect_scripts t ON de.id = t.entry_id
       LEFT JOIN dialects d ON t.dialect_id = d.id
       WHERE de.status = 'active'
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
          JOIN dialect_scripts t ON de.id = t.entry_id
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
        term: e.t_hebrew_script || e.t_latin_script || e.t_cyrillic_script || e.hebrew_script || '',
        hebrew: e.t_hebrew_script || null,
        latin: e.t_latin_script || null,
        cyrillic: e.t_cyrillic_script || null,
        hebrewScript: e.hebrew_script,
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
