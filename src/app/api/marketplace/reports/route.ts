import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth, requireRole } from '@/src/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const [reports] = await pool.query(`
      SELECT r.*, u.name as reporter_name
      FROM marketplace_reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.status, r.created_at DESC
    `) as any[];

    return NextResponse.json(reports);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת דיווחים' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { vendor_id, vendor_name, vendor_address, vendor_phone, description } = await request.json();

    await pool.query(`
      INSERT INTO marketplace_reports
      (reporter_id, vendor_id, vendor_name, vendor_address, vendor_phone, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.id, vendor_id, vendor_name, vendor_address, vendor_phone, description]);

    return NextResponse.json({ success: true, message: 'הדיווח נשלח בהצלחה' }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: 'שגיאה בשליחת דיווח' }, { status: 500 });
  }
}
