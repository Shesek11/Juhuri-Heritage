import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const page = parseInt(request.nextUrl.searchParams.get('page') || '1') || 1;
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30') || 30;
    const offset = (page - 1) * limit;

    const [countRows] = await pool.query(
      `SELECT COUNT(DISTINCT fs.entry_id) as total
       FROM field_sources fs
       WHERE fs.source_type = 'ai'`
    ) as any[];
    const total = countRows[0]?.total || 0;

    const [entries] = await pool.query(
      `SELECT de.id, de.term, de.pronunciation_guide,
              GROUP_CONCAT(DISTINCT fs.field_name ORDER BY fs.field_name SEPARATOR ', ') as ai_fields,
              t.hebrew, t.latin, t.cyrillic
       FROM field_sources fs
       JOIN dictionary_entries de ON fs.entry_id = de.id
       LEFT JOIN translations t ON de.id = t.entry_id
       WHERE fs.source_type = 'ai'
       GROUP BY de.id
       ORDER BY de.term
       LIMIT ? OFFSET ?`,
      [limit, offset]
    ) as any[];

    return NextResponse.json({
      entries,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('AI fields error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת שדות AI' }, { status: 500 });
  }
}
