import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

// GET /api/comments/:entryId - Fetch approved comments for a dictionary entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await params;

    const [comments] = await pool.query(`
      SELECT
        c.id,
        c.content,
        c.guest_name,
        c.likes_count,
        c.created_at,
        c.user_id,
        u.name as user_display_name,
        u.avatar as user_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.entry_id = ? AND c.status = 'approved'
      ORDER BY c.created_at DESC
    `, [entryId]);

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת תגובות' }, { status: 500 });
  }
}

// DELETE /api/comments/:id - Delete a comment (owner or admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;

    // Check ownership or admin
    const [comments]: any = await pool.query('SELECT user_id FROM comments WHERE id = ?', [id]);

    if (comments.length === 0) {
      return NextResponse.json({ error: 'תגובה לא נמצאה' }, { status: 404 });
    }

    const comment = comments[0];
    const isAdmin = user && (user.role === 'admin' || user.role === 'approver');
    const isOwner = user && String(comment.user_id) === String(user.id);

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'אין הרשאה למחוק תגובה זו' }, { status: 403 });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [id]);

    await logEvent('COMMENT_DELETED', `תגובה ${id} נמחקה`, user, { commentId: id }, request);

    return NextResponse.json({ success: true, message: 'התגובה נמחקה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת תגובה' }, { status: 500 });
  }
}
