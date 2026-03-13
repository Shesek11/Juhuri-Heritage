import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { vendorId } = await params;

    const [vendor] = await pool.query('SELECT user_id FROM marketplace_vendors WHERE id = ?', [vendorId]) as any[];
    if (!vendor.length) {
      return NextResponse.json({ error: 'חנות לא נמצאה' }, { status: 404 });
    }

    if (vendor[0].user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const [orders] = await pool.query(`
      SELECT o.*
      FROM marketplace_orders o
      WHERE o.vendor_id = ?
      ORDER BY
          CASE o.status
              WHEN 'pending' THEN 1
              WHEN 'confirmed' THEN 2
              WHEN 'ready' THEN 3
              WHEN 'completed' THEN 4
              WHEN 'cancelled' THEN 5
          END,
          o.created_at DESC
    `, [vendorId]) as any[];

    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM marketplace_order_items WHERE order_id = ?', [order.id]) as any[];
      order.items = items;
    }

    return NextResponse.json(orders);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching vendor orders:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת ההזמנות' }, { status: 500 });
  }
}
