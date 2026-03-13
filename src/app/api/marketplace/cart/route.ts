import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const [items] = await pool.query(`
      SELECT c.*,
             m.name, m.name_hebrew, m.price, m.image_url,
             v.name as vendor_name, v.slug as vendor_slug
      FROM marketplace_cart_items c
      JOIN marketplace_menu_items m ON c.menu_item_id = m.id
      JOIN marketplace_vendors v ON m.vendor_id = v.id
      WHERE c.user_id = ?
    `, [user.id]) as any[];
    return NextResponse.json(items);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching cart:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הסל' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { menu_item_id, quantity = 1, notes } = await request.json();

    await pool.query(`
      INSERT INTO marketplace_cart_items (user_id, menu_item_id, quantity, notes)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE quantity = quantity + ?, notes = ?
    `, [user.id, menu_item_id, quantity, notes, quantity, notes]);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'שגיאה בהוספה לסל' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await pool.query('DELETE FROM marketplace_cart_items WHERE user_id = ?', [user.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error clearing cart:', error);
    return NextResponse.json({ error: 'שגיאה בניקוי הסל' }, { status: 500 });
  }
}
