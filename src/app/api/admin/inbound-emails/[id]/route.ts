import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireRole } from '@/src/lib/auth';

// GET /api/admin/inbound-emails/:id — get full email
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ['admin']);
    const { id } = await params;

    const [rows] = await pool.query('SELECT * FROM inbound_emails WHERE id = ?', [id]) as any[];
    if (!rows.length) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });

    // Mark as read
    await pool.query('UPDATE inbound_emails SET is_read = 1 WHERE id = ?', [id]);

    return NextResponse.json({ email: rows[0] });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}

// PUT /api/admin/inbound-emails/:id — update (archive, mark read/unread)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ['admin']);
    const { id } = await params;
    const body = await request.json();

    const updates: string[] = [];
    const values: any[] = [];

    if (body.is_read !== undefined) { updates.push('is_read = ?'); values.push(body.is_read ? 1 : 0); }
    if (body.is_archived !== undefined) { updates.push('is_archived = ?'); values.push(body.is_archived ? 1 : 0); }

    if (!updates.length) return NextResponse.json({ error: 'אין שינויים' }, { status: 400 });

    values.push(id);
    await pool.query(`UPDATE inbound_emails SET ${updates.join(', ')} WHERE id = ?`, values);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}
