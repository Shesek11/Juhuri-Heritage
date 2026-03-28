import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprover(request);
    const { id } = await params;

    await pool.query('UPDATE community_examples SET status = ? WHERE id = ?', ['rejected', id]);

    await logEvent('EXAMPLE_REJECTED', `פתגם ${id} נדחה`, user, { exampleId: id }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Reject example error:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית פתגם' }, { status: 500 });
  }
}
