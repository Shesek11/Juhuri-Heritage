import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

// PUT /api/feedback/admin/:id - Update feedback status (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ['admin']);
    const { id } = await params;
    const { status, adminNote } = await request.json();

    await pool.query(
      'UPDATE site_feedback SET status = ?, admin_note = ? WHERE id = ?',
      [status, adminNote || null, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating feedback:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון' }, { status: 500 });
  }
}
