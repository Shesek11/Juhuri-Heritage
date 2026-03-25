import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprover(request);
    const { id } = await params;
    await pool.query(
      `UPDATE merge_suggestions SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
      [user.id, id]
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Dismiss merge suggestion error:', err);
    return NextResponse.json({ error: 'שגיאה בדחיית הצעת מיזוג' }, { status: 500 });
  }
}
