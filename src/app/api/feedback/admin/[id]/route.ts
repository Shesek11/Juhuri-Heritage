import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

// PUT /api/feedback/admin/:id - Update feedback status (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin']);
    const { id } = await params;
    const { status, adminNote } = await request.json();

    await pool.query(
      'UPDATE site_feedback SET status = ?, admin_note = ? WHERE id = ?',
      [status, adminNote || null, id]
    );

    await logEvent('FEEDBACK_STATUS_CHANGED', `פידבק ${id} עודכן ל-${status}`, user, { feedbackId: id, status }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating feedback:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון' }, { status: 500 });
  }
}
