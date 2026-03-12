import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireApprover(request);
    const { entryIds } = await request.json();

    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json({ error: 'נדרשים מזהי ערכים' }, { status: 400 });
    }

    const placeholders = entryIds.map(() => '?').join(',');
    const [result] = await pool.query(
      `UPDATE field_sources SET source_type = 'community'
       WHERE entry_id IN (${placeholders}) AND source_type = 'ai'`,
      entryIds
    ) as any[];

    return NextResponse.json({
      success: true,
      confirmed: result.affectedRows,
      message: `${result.affectedRows} שדות AI אושרו בהצלחה`
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Bulk confirm error:', error);
    return NextResponse.json({ error: 'שגיאה באישור מרובה' }, { status: 500 });
  }
}
