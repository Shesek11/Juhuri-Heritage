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

    const [item] = await pool.query(`
      SELECT mi.*, v.user_id
      FROM marketplace_menu_items mi
      JOIN marketplace_vendors v ON mi.vendor_id = v.id
      WHERE mi.id = ?
    `, [id]) as any[];

    if (!item.length || (item[0].user_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const {
      name, name_hebrew, description, category,
      price, image_url, is_available, stock_quantity, display_order
    } = await request.json();

    await pool.query(`
      UPDATE marketplace_menu_items SET
      name = ?, name_hebrew = ?, description = ?, category = ?,
      price = ?, image_url = ?, is_available = ?, stock_quantity = ?, display_order = ?
      WHERE id = ?
    `, [
      name, name_hebrew, description, category,
      price, image_url, is_available ? 1 : 0, stock_quantity, display_order,
      id
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון המנה' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const [item] = await pool.query(`
      SELECT mi.*, v.user_id
      FROM marketplace_menu_items mi
      JOIN marketplace_vendors v ON mi.vendor_id = v.id
      WHERE mi.id = ?
    `, [id]) as any[];

    if (!item.length || (item[0].user_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    await pool.query('DELETE FROM marketplace_menu_items WHERE id = ?', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת המנה' }, { status: 500 });
  }
}
