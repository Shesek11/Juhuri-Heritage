import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const { quantity, notes } = await request.json();

    await pool.query(`
      UPDATE marketplace_cart_items
      SET quantity = ?, notes = ?
      WHERE id = ? AND user_id = ?
    `, [quantity, notes, id, user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating cart:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון הסל' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    await pool.query(`
      DELETE FROM marketplace_cart_items
      WHERE id = ? AND user_id = ?
    `, [id, user.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error removing from cart:', error);
    return NextResponse.json({ error: 'שגיאה בהסרה מהסל' }, { status: 500 });
  }
}
