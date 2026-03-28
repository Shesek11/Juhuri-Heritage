import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { generateToken } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

/**
 * POST /api/auth/facebook/token
 * Accepts a Facebook access token from the JS SDK (popup flow)
 * and creates/logs in the user.
 */
export async function POST(request: NextRequest) {
  try {
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      return NextResponse.json({ error: 'Facebook not configured' }, { status: 500 });
    }

    const { accessToken } = await request.json();
    if (!accessToken) {
      return NextResponse.json({ error: 'Missing access token' }, { status: 400 });
    }

    // Verify the token is for our app
    const debugRes = await fetch(
      `https://graph.facebook.com/debug_token?input_token=${accessToken}&access_token=${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`
    );
    const debugData = await debugRes.json();

    if (!debugData.data?.is_valid || debugData.data?.app_id !== FACEBOOK_APP_ID) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user profile
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Failed to get profile' }, { status: 502 });
    }

    const profile = await profileRes.json();
    const email = profile.email;
    const name = profile.name;

    if (!email) {
      return NextResponse.json({ error: 'Facebook did not provide email' }, { status: 400 });
    }

    // Check if user exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    ) as any[];

    let user = existingUsers[0];

    if (user) {
      await pool.query('UPDATE users SET last_login_date = NOW() WHERE id = ?', [user.id]);
    } else {
      const [result] = await pool.query(
        `INSERT INTO users (email, name, role, last_login_date, joined_at, contributions_count, xp, level, current_streak)
         VALUES (?, ?, 'user', NOW(), NOW(), 0, 0, 1, 0)`,
        [email, name]
      ) as any[];

      await pool.query(
        `INSERT INTO system_logs (event_type, description, user_id, user_name) VALUES (?, ?, ?, ?)`,
        ['USER_REGISTER_OAUTH', `נרשם דרך פייסבוק: ${name}`, result.insertId, name]
      );

      const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]) as any[];
      user = newUsers[0];

      fireEventEmail('welcome', { to: email, variables: { userName: name } });
    }

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
    console.error('Facebook token auth error:', error);
    return NextResponse.json({ error: 'שגיאה באימות Facebook' }, { status: 500 });
  }
}
