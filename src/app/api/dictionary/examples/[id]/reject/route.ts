import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApprover(request);
    const { id } = await params;

    await pool.query('UPDATE community_examples SET status = ? WHERE id = ?', ['rejected', id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Reject example error:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית פתגם' }, { status: 500 });
  }
}
