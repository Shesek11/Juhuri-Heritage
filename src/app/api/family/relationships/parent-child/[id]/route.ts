import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    await pool.query('DELETE FROM family_parent_child WHERE id = ?', [id]);
    await logEvent('FAMILY_RELATION_DELETED', 'קשר הורה-ילד נמחק', user, { relation_id: id }, request);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete relationship' }, { status: 500 });
  }
}
