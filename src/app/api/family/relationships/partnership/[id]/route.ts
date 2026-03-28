import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const { status, start_date, end_date, marriage_place, notes } = await request.json();

    await pool.query(`
      UPDATE family_partnerships SET
      status=?, start_date=?, end_date=?, marriage_place=?, notes=?
      WHERE id=?
    `, [status, start_date || null, end_date || null, marriage_place, notes, id]);

    await logEvent('FAMILY_PARTNERSHIP_UPDATED', `קשר זוגי עודכן (${status})`, user, { partnership_id: id, status }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return NextResponse.json({ error: 'Failed to update partnership' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    await pool.query('DELETE FROM family_partnerships WHERE id = ?', [id]);
    await logEvent('FAMILY_PARTNERSHIP_DELETED', 'קשר זוגי נמחק', user, { partnership_id: id }, request);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete partnership' }, { status: 500 });
  }
}
