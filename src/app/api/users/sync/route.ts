import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { generateToken } from '@/src/lib/auth';

// POST /api/users/sync - Sync Auth0 user with local DB
export async function POST(request: NextRequest) {
  try {
    const { id, email, name, picture } = await request.json();

    if (!id || !email) {
      return NextResponse.json({ error: 'Missing required user fields' }, { status: 400 });
    }

    // Upsert user: Insert if new, update name/email/last_login if exists
    // Note: We do NOT update 'role' here to prevent resetting admins to users
    await pool.query(`
      INSERT INTO users (id, email, name, role, joined_at, last_login, contributions_count, xp, level, current_streak)
      VALUES (?, ?, ?, 'user', NOW(), NOW(), 0, 0, 1, 0)
      ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      email = VALUES(email),
      last_login = NOW()
    `, [id, email, name || email.split('@')[0]]);

    // Fetch the full user object (including role, xp, etc.) to return to client
    const [users]: any = await pool.query(
      `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak
       FROM users WHERE id = ?`,
      [id]
    );

    if (users.length > 0) {
      const user = users[0];

      // Generate token for the user
      const token = generateToken(user);

      return NextResponse.json({
        success: true,
        user: {
          ...user,
          joinedAt: new Date(user.joined_at).getTime(),
          lastLoginDate: Date.now(),
        },
        token,
      });
    } else {
      return NextResponse.json({ error: 'Failed to retrieve synced user' }, { status: 500 });
    }
  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
