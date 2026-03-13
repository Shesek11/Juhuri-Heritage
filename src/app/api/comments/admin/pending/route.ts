import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

// GET /api/comments/admin/pending - Fetch pending comments for moderation
export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const [comments] = await pool.query(`
      SELECT
        c.id,
        c.content,
        c.guest_name,
        c.created_at,
        c.entry_id,
        de.term as entry_term
      FROM comments c
      LEFT JOIN dictionary_entries de ON c.entry_id = de.id
      WHERE c.status = 'pending'
      ORDER BY c.created_at ASC
    `);

    return NextResponse.json({ comments });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching pending comments:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת תגובות ממתינות' }, { status: 500 });
  }
}
