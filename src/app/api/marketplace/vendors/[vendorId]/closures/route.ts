import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

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

    const { closure_date, reason } = await request.json();

    await pool.query(`
      INSERT INTO marketplace_closures (vendor_id, closure_date, reason)
      VALUES (?, ?, ?)
    `, [vendorId, closure_date, reason]);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error adding closure:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת סגירה' }, { status: 500 });
  }
}
