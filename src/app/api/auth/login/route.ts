import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/src/lib/db';
import { generateToken } from '@/src/lib/auth';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, RATE_LIMITS.auth);
    if (limited) return limited;

    const { email, password } = await request.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'כתובת אימייל לא חוקית' }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: 'נדרשת סיסמה' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [normalizedEmail]
    ) as any[];

    if (users.length === 0) {
      return NextResponse.json({ error: 'אימייל או סיסמה שגויים' }, { status: 401 });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return NextResponse.json({ error: 'אימייל או סיסמה שגויים' }, { status: 401 });
    }

    // Update streak logic
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastLogin = user.last_login_date ? new Date(user.last_login_date) : null;

    let newStreak = user.current_streak || 1;
    if (lastLogin) {
      lastLogin.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak = (user.current_streak || 0) + 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login_date = NOW(), current_streak = ? WHERE id = ?',
      [newStreak, user.id]
    );

    // Log event
    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name) VALUES (?, ?, ?, ?)`,
      ['USER_LOGIN', `משתמש התחבר: ${user.name}`, user.id, user.name]
    );

    // Prepare safe user object (without password)
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      joinedAt: user.joined_at,
      contributionsCount: user.contributions_count,
      xp: user.xp,
      level: user.level,
      currentStreak: newStreak,
    };

    const token = generateToken(safeUser);

    // Set cookie
    const response = NextResponse.json({ user: safeUser, token });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'שגיאה בהתחברות' }, { status: 500 });
  }
}
