import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { generateToken } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';
const CALLBACK_URL = `${SITE_URL}/api/auth/facebook/callback`;

// GET /api/auth/facebook/callback
export async function GET(request: NextRequest) {
  try {
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
      return NextResponse.redirect(`${SITE_URL}/?error=fb_not_configured`);
    }

    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.redirect(`${SITE_URL}/?error=no_code`);
    }

    // Exchange code for access token
    const tokenParams = new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      client_secret: FACEBOOK_APP_SECRET,
      redirect_uri: CALLBACK_URL,
      code,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?${tokenParams}`
    );

    if (!tokenRes.ok) {
      console.error('Facebook token exchange failed:', await tokenRes.text());
      return NextResponse.redirect(`${SITE_URL}/?error=fb_token_failed`);
    }

    const { access_token } = await tokenRes.json();

    // Get user profile
    const profileRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name,email,picture&access_token=${access_token}`
    );

    if (!profileRes.ok) {
      return NextResponse.redirect(`${SITE_URL}/?error=fb_profile_failed`);
    }

    const profile = await profileRes.json();
    const email = profile.email;
    const name = profile.name;

    if (!email) {
      return NextResponse.redirect(`${SITE_URL}/?error=fb_no_email`);
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

    // Generate JWT
    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = generateToken(safeUser);

    // Redirect back
    const rawState = request.nextUrl.searchParams.get('state') || '';
    let returnPath = '/';
    try {
      const decoded = Buffer.from(rawState, 'base64url').toString();
      if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) {
        returnPath = decoded;
      }
    } catch {}

    const separator = returnPath.includes('?') ? '&' : '?';
    const response = NextResponse.redirect(`${SITE_URL}${returnPath}${separator}login=success`);
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Facebook OAuth callback error:', error);
    return NextResponse.redirect(`${SITE_URL}/?error=fb_failed`);
  }
}
