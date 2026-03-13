import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

// POST /api/comments/:id/reject - Reject a pending comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApprover(request);
    const { id } = await params;

    await pool.query("UPDATE comments SET status = 'rejected' WHERE id = ?", [id]);

    return NextResponse.json({ success: true, message: 'התגובה נדחתה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error rejecting comment:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית תגובה' }, { status: 500 });
  }
}
