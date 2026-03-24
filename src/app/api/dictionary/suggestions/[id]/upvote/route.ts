import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Check suggestion exists and is pending
    const [suggestions] = await pool.query(
      'SELECT id FROM translation_suggestions WHERE id = ? AND status = ?',
      [id, 'pending']
    ) as any[];

    if (suggestions.length === 0) {
      return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 });
    }

    // Insert vote (ignore duplicate)
    await pool.query(
      'INSERT IGNORE INTO suggestion_votes (suggestion_id, user_id) VALUES (?, ?)',
      [id, user.id]
    );

    // Return updated count
    const [countRows] = await pool.query(
      'SELECT COUNT(*) as count FROM suggestion_votes WHERE suggestion_id = ?',
      [id]
    ) as any[];

    return NextResponse.json({ success: true, upvotes: countRows[0].count });
  } catch (error: any) {
    if (error instanceof Response) return error;
    console.error('Upvote suggestion error:', error);
    return NextResponse.json({ error: 'שגיאה בחיזוק הצעה' }, { status: 500 });
  }
}
