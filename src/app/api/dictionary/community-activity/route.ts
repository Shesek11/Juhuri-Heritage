import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20') || 20;

    const [activities] = await pool.query(
      `SELECT sl.event_type, sl.description, sl.user_name, sl.created_at, sl.metadata
       FROM system_logs sl
       WHERE sl.event_type IN ('ENTRY_ADDED', 'ENTRY_APPROVED', 'USER_REGISTER')
       ORDER BY sl.created_at DESC
       LIMIT ?`,
      [limit]
    ) as any[];

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Community activity error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת פעילות קהילתית' }, { status: 500 });
  }
}
