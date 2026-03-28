import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const [suggestions] = await pool.query(
      `SELECT ms.*,
              a.hebrew_script as term_a, b.hebrew_script as term_b,
              (SELECT t.hebrew_script FROM dialect_scripts t WHERE t.entry_id = ms.entry_id_a LIMIT 1) as hebrew_a,
              (SELECT t.hebrew_script FROM dialect_scripts t WHERE t.entry_id = ms.entry_id_b LIMIT 1) as hebrew_b,
              (SELECT t.latin_script FROM dialect_scripts t WHERE t.entry_id = ms.entry_id_a LIMIT 1) as latin_a,
              (SELECT t.latin_script FROM dialect_scripts t WHERE t.entry_id = ms.entry_id_b LIMIT 1) as latin_b
       FROM merge_suggestions ms
       JOIN dictionary_entries a ON ms.entry_id_a = a.id
       JOIN dictionary_entries b ON ms.entry_id_b = b.id
       WHERE ms.status = 'pending'
       ORDER BY ms.created_at DESC`
    ) as any[];

    return NextResponse.json({ suggestions });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('List merge suggestions error:', err);
    return NextResponse.json({ error: 'שגיאה בטעינת הצעות מיזוג' }, { status: 500 });
  }
}
