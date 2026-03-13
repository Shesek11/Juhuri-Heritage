import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    await pool.query(`
      UPDATE marketplace_notifications
      SET is_read = TRUE
      WHERE user_id = ? AND is_read = FALSE
    `, [user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון התראות' }, { status: 500 });
  }
}
