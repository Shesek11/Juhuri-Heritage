import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const connection = await (pool as any).getConnection();
  try {
    const user = await requireAuth(request);
    await connection.beginTransaction();

    const { orderId } = await params;
    const { status, cancellation_reason } = await request.json();

    if (!['pending', 'confirmed', 'ready', 'completed', 'cancelled'].includes(status)) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ error: 'סטטוס לא תקין' }, { status: 400 });
    }

    const [orders] = await connection.query(`
      SELECT o.*, v.user_id as vendor_owner
      FROM marketplace_orders o
      JOIN marketplace_vendors v ON o.vendor_id = v.id
      WHERE o.id = ?
    `, [orderId]);

    if (!orders.length) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ error: 'הזמנה לא נמצאה' }, { status: 404 });
    }

    const order = orders[0];

    const isVendorOwner = order.vendor_owner === user.id;
    const isCustomer = order.user_id === user.id;
    const isAdmin = user.role === 'admin';

    if (!isVendorOwner && !isAdmin && !(isCustomer && status === 'cancelled')) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
    }

    const updates = ['status = ?'];
    const queryParams: any[] = [status];

    if (status === 'confirmed' && !order.confirmed_at) {
      updates.push('confirmed_at = NOW()');
    } else if (status === 'ready' && !order.ready_at) {
      updates.push('ready_at = NOW()');
    } else if (status === 'completed' && !order.completed_at) {
      updates.push('completed_at = NOW()');
    } else if (status === 'cancelled') {
      updates.push('cancelled_at = NOW()');
      if (cancellation_reason) {
        updates.push('cancellation_reason = ?');
        queryParams.push(cancellation_reason);
      }
    }

    queryParams.push(orderId);

    await connection.query(`
      UPDATE marketplace_orders SET ${updates.join(', ')} WHERE id = ?
    `, queryParams);

    let notificationType = null;
    let recipientId = null;
    let title = '';
    let message = '';

    if (status === 'confirmed') {
      notificationType = 'order_confirmed';
      recipientId = order.user_id;
      title = 'ההזמנה אושרה!';
      message = `הזמנתך ${order.order_number} אושרה על ידי המוכר`;
    } else if (status === 'ready') {
      notificationType = 'order_ready';
      recipientId = order.user_id;
      title = 'ההזמנה מוכנה!';
      message = `הזמנתך ${order.order_number} מוכנה לאיסוף`;
    } else if (status === 'completed') {
      notificationType = 'order_completed';
      recipientId = order.user_id;
      title = 'ההזמנה הושלמה';
      message = `הזמנתך ${order.order_number} הושלמה. תודה!`;
    } else if (status === 'cancelled') {
      notificationType = 'order_cancelled';
      recipientId = isCustomer ? order.vendor_owner : order.user_id;
      title = 'ההזמנה בוטלה';
      message = `הזמנה ${order.order_number} בוטלה`;
    }

    if (notificationType && recipientId) {
      await connection.query(`
        INSERT INTO marketplace_notifications
        (user_id, type, order_id, vendor_id, title, message)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [recipientId, notificationType, orderId, order.vendor_id, title, message]);
    }

    await connection.commit();
    connection.release();

    await logEvent('ORDER_STATUS_CHANGED', `הזמנה ${orderId} → ${status}`, user, { orderId, status, orderNumber: order.order_number }, request);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    await connection.rollback();
    connection.release();
    if (error instanceof Response) return error;
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון ההזמנה' }, { status: 500 });
  }
}
