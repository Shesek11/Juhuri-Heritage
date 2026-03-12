import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/src/lib/db';
import { generateToken } from '@/src/lib/auth';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, RATE_LIMITS.auth);
    if (limited) return limited;

    const { name, email, password } = await request.json();

    // Validation
    if (!name || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: 'שם חייב להכיל 2-100 תווים' }, { status: 400 });
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'כתובת אימייל לא חוקית' }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'הסיסמה חייבת להכיל לפחות 8 תווים' }, { status: 400 });
    }
    if (password.length > 128) {
      return NextResponse.json({ error: 'הסיסמה ארוכה מדי' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [normalizedEmail]) as any[];
    if (existing.length > 0) {
      return NextResponse.json({ error: 'כתובת האימייל כבר קיימת במערכת' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Check if this is the admin email
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const role = normalizedEmail === adminEmail ? 'admin' : 'user';

    // Insert user
    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, last_login_date)
       VALUES (?, ?, ?, ?, NOW())`,
      [normalizedEmail, passwordHash, name.trim(), role]
    ) as any[];

    const userId = result.insertId;

    // Log event
    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name) VALUES (?, ?, ?, ?)`,
      ['USER_REGISTER', `משתמש חדש נרשם: ${name.trim()}`, userId, name.trim()]
    );

    // Get full user data
    const [users] = await pool.query(
      `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak
       FROM users WHERE id = ?`,
      [userId]
    ) as any[];

    const user = users[0];
    const token = generateToken(user);

    // Set cookie
    const response = NextResponse.json({ user, token });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'שגיאה בהרשמה' }, { status: 500 });
  }
}
