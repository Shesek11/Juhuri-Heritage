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

    await pool.query("UPDATE comments SET status = 'approved' WHERE id = ?", [id]);

    fireEventEmail('comment-approved', { variables: { commentId: id } });

    await logEvent('COMMENT_APPROVED', `Comment ${id} approved`, user, { commentId: id }, request);

    return NextResponse.json({ success: true, message: 'התגובה אושרה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error approving comment:', error);
    return NextResponse.json({ error: 'שגיאה באישור תגובה' }, { status: 500 });
  }
}
