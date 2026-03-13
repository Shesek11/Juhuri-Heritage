import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { generateOrderNumber } from '../_shared';

// POST /api/marketplace/orders - Create order from cart
export async function POST(request: NextRequest) {
  const connection = await (pool as any).getConnection();
  try {
    const user = await requireAuth(request);
    await connection.beginTransaction();

    const { customer_name, customer_phone, customer_notes, pickup_time } = await request.json();

    if (!customer_name || !customer_phone) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ error: 'שם וטלפון נדרשים' }, { status: 400 });
    }

    const [cartItems] = await connection.query(`
      SELECT
          c.*,
          m.name as item_name,
          m.name_hebrew as item_name_hebrew,
          m.description as item_description,
          m.price as item_price,
          m.vendor_id,
          m.currency
      FROM marketplace_cart_items c
      JOIN marketplace_menu_items m ON c.menu_item_id = m.id
      WHERE c.user_id = ?
    `, [user.id]);

    if (cartItems.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ error: 'הסל ריק' }, { status: 400 });
    }

    const ordersByVendor: Record<string, any[]> = {};
    cartItems.forEach((item: any) => {
      if (!ordersByVendor[item.vendor_id]) {
        ordersByVendor[item.vendor_id] = [];
      }
      ordersByVendor[item.vendor_id].push(item);
    });

    const createdOrders = [];

    for (const [vendorId, items] of Object.entries(ordersByVendor)) {
      const totalPrice = items.reduce((sum: number, item: any) => sum + (item.item_price * item.quantity), 0);
      const currency = items[0].currency || 'ILS';
      const orderNumber = generateOrderNumber();

      const [orderResult] = await connection.query(`
        INSERT INTO marketplace_orders
        (order_number, user_id, vendor_id, status, total_price, currency, customer_name, customer_phone, customer_notes, pickup_time)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      `, [orderNumber, user.id, vendorId, totalPrice, currency, customer_name, customer_phone, customer_notes, pickup_time]);

      const orderId = orderResult.insertId;

      for (const item of items) {
        await connection.query(`
          INSERT INTO marketplace_order_items
          (order_id, menu_item_id, item_name, item_name_hebrew, item_description, item_price, quantity, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [orderId, item.menu_item_id, item.item_name, item.item_name_hebrew, item.item_description, item.item_price, item.quantity, item.notes]);
      }

      const [vendor] = await connection.query('SELECT user_id, name FROM marketplace_vendors WHERE id = ?', [vendorId]);

      if (vendor[0] && vendor[0].user_id) {
        await connection.query(`
          INSERT INTO marketplace_notifications
          (user_id, type, order_id, vendor_id, title, message)
          VALUES (?, 'new_order', ?, ?, ?, ?)
        `, [
          vendor[0].user_id,
          orderId,
          vendorId,
          'הזמנה חדשה!',
          `הזמנה חדשה מ${customer_name} - ${orderNumber}`
        ]);
      }

      createdOrders.push({ order_id: orderId, order_number: orderNumber, vendor_name: vendor[0].name });
    }

    await connection.query('DELETE FROM marketplace_cart_items WHERE user_id = ?', [user.id]);

    await connection.commit();
    connection.release();
    return NextResponse.json({ success: true, orders: createdOrders }, { status: 201 });
  } catch (error) {
    await connection.rollback();
    connection.release();
    if (error instanceof Response) return error;
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'שגיאה ביצירת ההזמנה' }, { status: 500 });
  }
}

// GET /api/marketplace/orders - Get user's orders
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const [orders] = await pool.query(`
      SELECT
          o.*,
          v.name as vendor_name,
          v.slug as vendor_slug,
          v.phone as vendor_phone,
          v.address as vendor_address
      FROM marketplace_orders o
      JOIN marketplace_vendors v ON o.vendor_id = v.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `, [user.id]) as any[];

    for (const order of orders) {
      const [items] = await pool.query(`
        SELECT * FROM marketplace_order_items WHERE order_id = ?
      `, [order.id]) as any[];
      order.items = items;
    }

    return NextResponse.json(orders);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת ההזמנות' }, { status: 500 });
  }
}
