import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    const [items] = await pool.query(`
      SELECT * FROM marketplace_menu_items
      WHERE vendor_id = ? AND is_available = 1
      ORDER BY category, display_order, name
    `, [vendorId]) as any[];
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching menu:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת התפריט' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { vendorId } = await params;

    const [vendor] = await pool.query(
      'SELECT user_id FROM marketplace_vendors WHERE id = ?',
      [vendorId]
    ) as any[];

    if (!vendor.length || (vendor[0].user_id !== user.id && user.role !== 'admin')) {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const {
      name, name_hebrew, description, category,
      price, currency = 'ILS', image_url,
      is_available = true, stock_quantity, display_order = 0
    } = await request.json();

    const [result] = await pool.query(`
      INSERT INTO marketplace_menu_items
      (vendor_id, name, name_hebrew, description, category, price, currency,
       image_url, is_available, stock_quantity, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      vendorId, name, name_hebrew, description, category, price, currency,
      image_url, is_available ? 1 : 0, stock_quantity, display_order
    ]) as any[];

    return NextResponse.json({ success: true, item_id: result.insertId }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error adding menu item:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת מנה' }, { status: 500 });
  }
}
