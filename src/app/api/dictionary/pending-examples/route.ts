import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const [examples] = await pool.query(
      `SELECT ce.*, de.hebrew_script
       FROM community_examples ce
       LEFT JOIN dictionary_entries de ON ce.entry_id = de.id
       WHERE ce.status = 'pending'
       ORDER BY ce.created_at DESC
       LIMIT 50`
    ) as any[];
    return NextResponse.json({ examples });
  } catch (error: any) {
    if (error instanceof Response) return error;
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json({ examples: [] });
    }
    console.error('Pending examples error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת פתגמים ממתינים' }, { status: 500 });
  }
}
