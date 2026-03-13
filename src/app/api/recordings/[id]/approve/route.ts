import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

// POST /api/recordings/:id/approve - Approve a recording
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApprover(request);
    const { id } = await params;

    await pool.query("UPDATE audio_recordings SET status = 'approved' WHERE id = ?", [id]);

    return NextResponse.json({ success: true, message: 'ההקלטה אושרה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error approving recording:', error);
    return NextResponse.json({ error: 'שגיאה באישור הקלטה' }, { status: 500 });
  }
}
