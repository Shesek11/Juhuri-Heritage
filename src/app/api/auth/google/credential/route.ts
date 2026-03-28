import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { generateToken } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

/**
 * POST /api/auth/google/credential
 * Accepts a Google Identity Services credential (JWT) and creates/logs in the user.
 * Used by the GIS One Tap and Sign In With Google button (popup mode).
 */
export async function POST(request: NextRequest) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 });
    }

    const { credential } = await request.json();
    if (!credential) {
      return NextResponse.json({ error: 'Missing credential' }, { status: 400 });
    }

    // Verify the credential JWT with Google
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!verifyRes.ok) {
      return NextResponse.json({ error: 'Invalid credential' }, { status: 401 });
    }

    const payload = await verifyRes.json();

    // Verify audience matches our client ID
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      return NextResponse.json({ error: 'Token audience mismatch' }, { status: 401 });
    }

    const email = payload.email;
    const name = payload.name || payload.given_name || email.split('@')[0];

    // Check if user exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as any[];

    let user = existingUsers[0];

    if (user) {
      // Update last login
      await pool.query('UPDATE users SET last_login_date = NOW() WHERE id = ?', [user.id]);
    } else {
      // Create new user
      const [result] = await pool.query(
        `INSERT INTO users (email, name, role, last_login_date, joined_at, contributions_count, xp, level, current_streak)
         VALUES (?, ?, 'user', NOW(), NOW(), 0, 0, 1, 0)`,
        [email, name]
      ) as any[];

      await pool.query(
        `INSERT INTO system_logs (event_type, description, user_id, user_name) VALUES (?, ?, ?, ?)`,
        ['USER_REGISTER_OAUTH', `נרשם דרך גוגל: ${name}`, result.insertId, name]
      );

      const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]) as any[];
      user = newUsers[0];

      fireEventEmail('welcome', { to: email, variables: { userName: name } });
    }

    // Generate JWT
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      joinedAt: user.joined_at,
      contributionsCount: user.contributions_count,
      xp: user.xp,
      level: user.level,
      currentStreak: user.current_streak,
    };
    const token = generateToken(safeUser);

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
    console.error('Google credential auth error:', error);
    return NextResponse.json({ error: 'שגיאה באימות Google' }, { status: 500 });
  }
}
