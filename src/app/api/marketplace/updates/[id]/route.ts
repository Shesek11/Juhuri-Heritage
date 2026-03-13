import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const [update] = await pool.query(`
      SELECT u.*, v.user_id
      FROM marketplace_updates u
      JOIN marketplace_vendors v ON u.vendor_id = v.id
      WHERE u.id = ?
    `, [id]) as any[];

    if (!update.length || (update[0].user_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    await pool.query('DELETE FROM marketplace_updates WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting update:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת עדכון' }, { status: 500 });
  }
}
