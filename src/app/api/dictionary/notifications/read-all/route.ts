import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
      [user.id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Mark all notifications read error:', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
