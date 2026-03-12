import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { generateToken } from '@/src/lib/auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CALLBACK_URL = `${process.env.SITE_URL || 'https://jun-juhuri.com'}/api/auth/google/callback`;

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.redirect(new URL('/login?error=no_code', request.url));
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(new URL('/login?error=token_failed', request.url));
    }

    const tokenData = await tokenRes.json();

    // Get user profile from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(new URL('/login?error=profile_failed', request.url));
    }

    const profile = await profileRes.json();
    const email = profile.email;
    const name = profile.name;

    // Check if user exists by email
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]) as any[];
    let user = existingUsers[0];

    if (user) {
      // User exists, update last login
      await pool.query('UPDATE users SET last_login_date = NOW() WHERE id = ?', [user.id]);
    } else {
      // Create new user
      const role = 'user';
      const [result] = await pool.query(
        `INSERT INTO users (email, name, role, last_login_date, joined_at, contributions_count, xp, level, current_streak)
         VALUES (?, ?, ?, NOW(), NOW(), 0, 0, 1, 0)`,
        [email, name, role]
      ) as any[];

      // Log registration
      await pool.query(
        `INSERT INTO system_logs (event_type, description, user_id, user_name) VALUES (?, ?, ?, ?)`,
        ['USER_REGISTER_OAUTH', `נרשם דרך גוגל: ${name}`, result.insertId, name]
      );

      // Fetch the new user
      const [newUsers] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]) as any[];
      user = newUsers[0];
    }

    // Generate JWT
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = generateToken(safeUser);

    // Redirect to home with cookie
    const response = NextResponse.redirect(new URL('/?login=success', request.url));
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(new URL('/login?error=failed', request.url));
  }
}
