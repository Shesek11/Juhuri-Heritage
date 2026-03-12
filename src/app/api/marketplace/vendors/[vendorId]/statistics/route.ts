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

    const [stats] = await pool.query(`
      SELECT * FROM marketplace_order_stats WHERE vendor_id = ?
    `, [vendorId]) as any[];

    const [dailyOrders] = await pool.query(`
      SELECT
          DATE(created_at) as order_date,
          COUNT(*) as orders_count,
          SUM(total_price) as daily_revenue
      FROM marketplace_orders
      WHERE vendor_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY order_date DESC
    `, [vendorId]) as any[];

    const [topItems] = await pool.query(`
      SELECT
          oi.item_name,
          COUNT(*) as times_ordered,
          SUM(oi.quantity) as total_quantity,
          SUM(oi.item_price * oi.quantity) as total_revenue
      FROM marketplace_order_items oi
      JOIN marketplace_orders o ON oi.order_id = o.id
      WHERE o.vendor_id = ? AND o.status = 'completed'
      GROUP BY oi.item_name
      ORDER BY times_ordered DESC
      LIMIT 5
    `, [vendorId]) as any[];

    return NextResponse.json({
      overview: stats[0] || {},
      daily_orders: dailyOrders,
      top_items: topItems
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הסטטיסטיקות' }, { status: 500 });
  }
}
