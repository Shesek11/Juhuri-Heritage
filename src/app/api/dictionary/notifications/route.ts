import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = request.nextUrl;
    const unreadOnly = searchParams.get('unread') === 'true';
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10') || 10);

    const whereClause = unreadOnly
      ? 'WHERE user_id = ? AND is_read = FALSE'
      : 'WHERE user_id = ?';

    const [notifications] = await pool.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ?`,
      [user.id, limit]
    );

    const [[{ count: unreadCount }]] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [user.id]
    ) as any;

    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Notifications error:', err);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
