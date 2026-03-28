import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '10') || 10;

    const [entries] = await pool.query(
      `SELECT de.id, de.hebrew_script, de.detected_language, de.created_at,
              t.hebrew_script as t_hebrew_script, t.latin_script
       FROM dictionary_entries de
       LEFT JOIN dialect_scripts t ON de.id = t.entry_id
       WHERE de.status = 'active'
       GROUP BY de.id
       ORDER BY de.created_at DESC
       LIMIT ?`,
      [limit]
    ) as any[];

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Recent entries error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים אחרונות' }, { status: 500 });
  }
}
