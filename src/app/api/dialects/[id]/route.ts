import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// DELETE /api/dialects/:id (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await params;

    // Check minimum count
    const [count]: any = await pool.query('SELECT COUNT(*) as total FROM dialects');
    if (count[0].total <= 1) {
      return NextResponse.json({ error: 'חייב להישאר לפחות ניב אחד' }, { status: 400 });
    }

    await pool.query('DELETE FROM dialects WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Delete dialect error:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת ניב' }, { status: 500 });
  }
}
