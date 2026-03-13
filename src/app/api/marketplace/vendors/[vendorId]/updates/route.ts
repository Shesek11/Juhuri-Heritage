import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
) {
  try {
    const { vendorId } = await params;
    const [updates] = await pool.query(`
      SELECT * FROM marketplace_updates
      WHERE vendor_id = ? AND is_active = 1
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
    `, [vendorId]) as any[];
    return NextResponse.json(updates);
  } catch (error) {
    console.error('Error fetching updates:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת עדכונים' }, { status: 500 });
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

    const { title, content, image_url, expires_at } = await request.json();

    await pool.query(`
      INSERT INTO marketplace_updates (vendor_id, title, content, image_url, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [vendorId, title, content, image_url, expires_at]);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error adding update:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת עדכון' }, { status: 500 });
  }
}
