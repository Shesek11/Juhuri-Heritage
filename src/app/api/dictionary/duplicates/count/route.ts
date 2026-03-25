import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const [[{ count: termCount }]] = await pool.query(
      `SELECT COUNT(*) as count FROM (
        SELECT term_normalized FROM dictionary_entries
        WHERE status = 'active' AND term_normalized IS NOT NULL AND term_normalized != ''
        GROUP BY term_normalized HAVING COUNT(*) > 1
      ) as dup_groups`
    ) as any[];

    const [[{ count: suggestionsCount }]] = await pool.query(
      `SELECT COUNT(*) as count FROM merge_suggestions WHERE status = 'pending'`
    ) as any[];

    return NextResponse.json({ duplicateGroups: termCount, pendingSuggestions: suggestionsCount });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Duplicates count error:', err);
    return NextResponse.json({ error: 'שגיאה בספירת כפילויות' }, { status: 500 });
  }
}
