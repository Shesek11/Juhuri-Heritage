import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

// GET /api/feedback/admin - Get all feedback (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const status = request.nextUrl.searchParams.get('status');
    let query = 'SELECT * FROM site_feedback';
    const params: any[] = [];

    if (status && status !== 'all') {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const [rows] = await pool.query(query, params);
    return NextResponse.json({ feedback: rows });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הודעות' }, { status: 500 });
  }
}
