import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// DELETE /api/users/:id (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;

    // Prevent self-deletion
    if (parseInt(id) === user.id) {
      return NextResponse.json({ error: 'לא ניתן למחוק את עצמך' }, { status: 400 });
    }

    // Get user for logging
    const [users]: any = await pool.query('SELECT name FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
      ['USER_DELETED', `נמחק משתמש: ${users[0].name}`, user.id, user.name, JSON.stringify({ targetId: id })]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת משתמש' }, { status: 500 });
  }
}
