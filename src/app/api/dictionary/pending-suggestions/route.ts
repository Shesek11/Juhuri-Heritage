import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50') || 50;
    const [suggestions] = await pool.query(
      `SELECT ts.id, ts.entry_id, ts.dialect, ts.suggested_hebrew, ts.suggested_latin,
              ts.suggested_cyrillic, ts.user_id, ts.status, ts.created_at,
              ts.audio_url, ts.audio_duration, ts.translation_id,
              ts.field_name, ts.suggested_russian, ts.reason, ts.user_name,
              de.term,
              u.name as contributor_name
       FROM translation_suggestions ts
       JOIN dictionary_entries de ON ts.entry_id = de.id
       LEFT JOIN users u ON ts.user_id = u.id
       WHERE ts.status = 'pending'
       ORDER BY ts.created_at DESC
       LIMIT ?`,
      [limit]
    ) as any[];
    return NextResponse.json({ suggestions });
  } catch (error: any) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json({ suggestions: [] });
    }
    console.error('Pending suggestions error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הצעות' }, { status: 500 });
  }
}
