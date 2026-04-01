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

    // Get comment + entry info before rejecting
    const [commentRows] = await pool.query(
      `SELECT c.user_id, c.content, c.entry_id, de.hebrew_script as term
       FROM comments c
       LEFT JOIN dictionary_entries de ON c.entry_id = de.id
       WHERE c.id = ?`, [id]
    ) as any[];
    const comment = commentRows[0];

    await pool.query("UPDATE comments SET status = 'rejected' WHERE id = ?", [id]);

    await logEvent('COMMENT_REJECTED', `Comment ${id} rejected`, user, { commentId: id }, request);

    if (comment?.user_id) {
      const [userRows] = await pool.query('SELECT email, name FROM users WHERE id = ?', [comment.user_id]) as any[];
      if (userRows.length && userRows[0].email) {
        fireEventEmail('comment-rejected', {
          to: userRows[0].email,
          variables: { userName: userRows[0].name || '', term: comment.term || '', commentContent: comment.content || '' },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'התגובה נדחתה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error rejecting comment:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית תגובה' }, { status: 500 });
  }
}
