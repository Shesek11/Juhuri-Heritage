import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    await pool.query(`
      UPDATE marketplace_notifications
      SET is_read = TRUE
      WHERE id = ? AND user_id = ?
    `, [id, user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון התראה' }, { status: 500 });
  }
}
