import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// Internal endpoint for middleware to fetch active redirects.
// Protected by a shared secret header to prevent external abuse.

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-middleware-secret');
  if (secret !== (process.env.MIDDLEWARE_SECRET || '__internal__')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [rows] = await pool.query(
      `SELECT from_path, to_path, status_code FROM seo_redirects WHERE is_active = 1`
    );
    return NextResponse.json(rows);
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      return NextResponse.json([]);
    }
    return NextResponse.json([], { status: 500 });
  }
}
