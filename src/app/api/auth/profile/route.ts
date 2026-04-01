import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { name, password } = await request.json();

    const updates: string[] = [];
    const params: any[] = [];

    if (name) {
      updates.push('name = ?');
      params.push(name);
    }

    if (password && password.length >= 8) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'אין שינויים לשמור' }, { status: 400 });
    }

    params.push(user.id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    await logEvent('PROFILE_UPDATED', `פרופיל עודכן`, user, { changedFields: Object.keys({ ...(name ? { name } : {}), ...(password ? { password: true } : {}) }) }, request);

    // Get updated user
    const [users] = await pool.query(
      `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak
       FROM users WHERE id = ?`,
      [user.id]
    ) as any[];

    return NextResponse.json({ user: users[0] });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון פרופיל' }, { status: 500 });
  }
}
