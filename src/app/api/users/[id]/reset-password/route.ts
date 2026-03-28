import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';

// PUT /api/users/:id/reset-password - Reset password (Admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { id } = await params;

    const newPassword = crypto.randomBytes(6).toString('base64url');
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);

    // Log password reset (without exposing the password)
    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name) VALUES (?, ?, ?, ?)`,
      ['PASSWORD_RESET', `Admin reset password for user ${id}`, user.id, user.name]
    ).catch(() => {});

    // Notify the user about the password reset
    const [targetUser] = await pool.query('SELECT email, name FROM users WHERE id = ?', [id]) as [any[], any];
    if (targetUser.length && targetUser[0].email) {
      fireEventEmail('password-reset', { to: targetUser[0].email, variables: { userName: targetUser[0].name || '' } });
    }

    return NextResponse.json({ success: true, newPassword });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'שגיאה באיפוס סיסמה' }, { status: 500 });
  }
}
