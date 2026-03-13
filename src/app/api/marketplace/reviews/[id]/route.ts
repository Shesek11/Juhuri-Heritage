import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const [review] = await pool.query(
      'SELECT user_id FROM marketplace_reviews WHERE id = ?',
      [id]
    ) as any[];

    if (!review.length || (review[0].user_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    await pool.query('DELETE FROM marketplace_reviews WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת תגובה' }, { status: 500 });
  }
}
