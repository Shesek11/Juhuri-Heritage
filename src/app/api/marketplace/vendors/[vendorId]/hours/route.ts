import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    const [hours] = await pool.query(`
      SELECT * FROM marketplace_hours
      WHERE vendor_id = ?
      ORDER BY day_of_week
    `, [vendorId]) as any[];
    return NextResponse.json(hours);
  } catch (error) {
    console.error('Error fetching hours:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת שעות' }, { status: 500 });
  }
}

export async function PUT(
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

    const { hours } = await request.json();

    await pool.query('DELETE FROM marketplace_hours WHERE vendor_id = ?', [vendorId]);

    for (const h of hours) {
      await pool.query(`
        INSERT INTO marketplace_hours (vendor_id, day_of_week, open_time, close_time, is_closed, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [vendorId, h.day_of_week, h.open_time, h.close_time, h.is_closed ? 1 : 0, h.notes]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating hours:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון שעות' }, { status: 500 });
  }
}
