import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';

// PUT /api/users/:id/role - Update user role (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;
    const { role } = await request.json();

    if (!['admin', 'approver', 'user'].includes(role)) {
      return NextResponse.json({ error: 'תפקיד לא תקין' }, { status: 400 });
    }

    // Get target user info
    const [users]: any = await pool.query('SELECT name, email FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'משתמש לא נמצא' }, { status: 404 });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
      [
        'USER_ROLE_CHANGE',
        `שונה תפקיד למשתמש ${users[0].name} ל-${role}`,
        user.id,
        user.name,
        JSON.stringify({ targetId: id, role }),
      ]
    );

    // Notify user about role change
    const roleNames: Record<string, string> = { admin: 'מנהל', approver: 'מאשר', user: 'משתמש' };
    if (users[0]?.email) {
      fireEventEmail('role-changed', {
        to: users[0].email,
        variables: { userName: users[0].name || '', role, roleName: roleNames[role] || role },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update role error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון תפקיד' }, { status: 500 });
  }
}
