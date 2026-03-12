import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// POST /api/progress/add-xp
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { xp } = await request.json();

    if (!xp || xp <= 0) {
      return NextResponse.json({ error: 'נדרש XP חיובי' }, { status: 400 });
    }

    await pool.query(
      'UPDATE users SET xp = xp + ?, level = FLOOR((xp + ?) / 1000) + 1 WHERE id = ?',
      [xp, xp, user.id]
    );

    const [userRows]: any = await pool.query(
      'SELECT xp, level FROM users WHERE id = ?',
      [user.id]
    );

    return NextResponse.json({
      success: true,
      xp: userRows[0]?.xp || 0,
      level: userRows[0]?.level || 1,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Add XP error:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת XP' }, { status: 500 });
  }
}
