import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const unread_only = request.nextUrl.searchParams.get('unread_only');

    let query = `
      SELECT n.*, o.order_number, v.name as vendor_name
      FROM marketplace_notifications n
      LEFT JOIN marketplace_orders o ON n.order_id = o.id
      LEFT JOIN marketplace_vendors v ON n.vendor_id = v.id
      WHERE n.user_id = ?
    `;

    if (unread_only === 'true') {
      query += ' AND n.is_read = FALSE';
    }

    query += ' ORDER BY n.created_at DESC LIMIT 50';

    const [notifications] = await pool.query(query, [user.id]) as any[];
    return NextResponse.json(notifications);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת ההתראות' }, { status: 500 });
  }
}
