import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [directExamples] = await pool.query(
      `SELECT ce.id, ce.origin, ce.translated, ce.transliteration, ce.user_name, ce.source_type, ce.created_at
       FROM community_examples ce
       WHERE ce.entry_id = ? AND ce.status = 'approved'
       ORDER BY ce.created_at DESC`,
      [id]
    ) as any[];

    const [linkedExamples] = await pool.query(
      `SELECT DISTINCT ce.id, ce.origin, ce.translated, ce.transliteration, ce.user_name, ce.source_type, ce.created_at
       FROM example_word_links ewl
       JOIN community_examples ce ON ewl.example_id = ce.id
       WHERE ewl.entry_id = ? AND ce.status = 'approved' AND ce.entry_id != ?
       ORDER BY ce.created_at DESC
       LIMIT 5`,
      [id, id]
    ) as any[];

    return NextResponse.json({ directExamples, linkedExamples });
  } catch (error: any) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json({ directExamples: [], linkedExamples: [] });
    }
    console.error('Community examples error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת פתגמים' }, { status: 500 });
  }
}
