import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// DELETE /api/admin/seo/redirects/:id - Remove redirect
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;

    await pool.query('DELETE FROM seo_redirects WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Delete redirect error:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת הפניה' }, { status: 500 });
  }
}
