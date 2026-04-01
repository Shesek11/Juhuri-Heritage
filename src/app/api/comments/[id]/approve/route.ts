import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';

// POST /api/comments/:id/approve - Approve a pending comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprover(request);
    const { id } = await params;

    // Get comment + entry info before approving
    const [commentRows] = await pool.query(
      `SELECT c.user_id, c.guest_name, c.entry_id, de.hebrew_script as term
       FROM comments c
       LEFT JOIN dictionary_entries de ON c.entry_id = de.id
       WHERE c.id = ?`, [id]
    ) as any[];

    await pool.query("UPDATE comments SET status = 'approved' WHERE id = ?", [id]);

    // Notify comment author if they are a registered user
    if (commentRows[0]?.user_id) {
      const [authorRows] = await pool.query('SELECT email, name FROM users WHERE id = ?', [commentRows[0].user_id]) as any[];
      if (authorRows.length && authorRows[0].email) {
        fireEventEmail('comment-approved', {
          to: authorRows[0].email,
          variables: { commentId: id, userName: authorRows[0].name || '', term: commentRows[0]?.term || '', entryId: String(commentRows[0]?.entry_id || '') },
        });
      }
    }

    await logEvent('COMMENT_APPROVED', `Comment ${id} approved`, user, { commentId: id }, request);

    return NextResponse.json({ success: true, message: 'התגובה אושרה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error approving comment:', error);
    return NextResponse.json({ error: 'שגיאה באישור תגובה' }, { status: 500 });
  }
}
