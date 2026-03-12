import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { checkAndAwardBadges, calculateLevel, XP_REWARDS } from '../_lib/gamification';

// POST /api/gamification/check-login-streak - Check and update login streak, award daily XP
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth(request);
    const userId = authUser.id;

    const [users]: any = await pool.query(
      'SELECT id, xp, level, current_streak, last_login_date FROM users WHERE id = ? OR auth0_id = ?',
      [userId, userId]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    const today = new Date().toDateString();
    const lastLogin = user.last_login_date ? new Date(user.last_login_date).toDateString() : null;

    let streak = user.current_streak || 0;
    let xpAwarded = 0;
    let isNewDay = false;

    if (lastLogin !== today) {
      isNewDay = true;

      // Check if consecutive day
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastLogin === yesterday.toDateString()) {
        streak += 1;
      } else if (lastLogin !== today) {
        streak = 1; // Reset streak
      }

      // Award daily XP + streak bonus
      xpAwarded = XP_REWARDS.DAILY_LOGIN + (streak > 1 ? XP_REWARDS.STREAK_BONUS * Math.min(streak, 7) : 0);
      const newXp = (user.xp || 0) + xpAwarded;
      const newLevel = calculateLevel(newXp);

      await pool.query(
        'UPDATE users SET xp = ?, level = ?, current_streak = ?, last_login_date = NOW() WHERE id = ?',
        [newXp, newLevel, streak, user.id]
      );
    }

    // Check for badges
    const newBadges = await checkAndAwardBadges(userId);

    return NextResponse.json({
      success: true,
      streak,
      xpAwarded,
      isNewDay,
      newBadges,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error checking login streak:', error);
    return NextResponse.json({ error: 'שגיאה בבדיקת רצף התחברות' }, { status: 500 });
  }
}
