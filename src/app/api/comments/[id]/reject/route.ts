import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';
import { fireEventEmail } from '@/src/lib/email';

// POST /api/comments/:id/reject - Reject a pending comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprover(request);
    const { id } = await params;

    // Get comment author info before rejecting
    const [commentRows] = await pool.query('SELECT user_id FROM comments WHERE id = ?', [id]) as any[];
    const commentUserId = commentRows[0]?.user_id;

    await pool.query("UPDATE comments SET status = 'rejected' WHERE id = ?", [id]);

    await logEvent('COMMENT_REJECTED', `Comment ${id} rejected`, user, { commentId: id }, request);

    if (commentUserId) {
      const [userRows] = await pool.query('SELECT email, name FROM users WHERE id = ?', [commentUserId]) as any[];
      if (userRows.length && userRows[0].email) {
        fireEventEmail('comment-rejected', { to: userRows[0].email, variables: { userName: userRows[0].name || '' } });
      }
    }

    return NextResponse.json({ success: true, message: 'התגובה נדחתה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error rejecting comment:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית תגובה' }, { status: 500 });
  }
}
