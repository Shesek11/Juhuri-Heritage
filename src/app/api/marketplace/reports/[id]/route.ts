import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, ['admin']);
    const { id } = await params;
    const { status, admin_notes } = await request.json();

    await pool.query(`
      UPDATE marketplace_reports
      SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [status, admin_notes, user.id, id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating report:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון דיווח' }, { status: 500 });
  }
}
