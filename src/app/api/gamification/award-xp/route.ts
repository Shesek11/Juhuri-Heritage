import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { checkAndAwardBadges, calculateLevel, XP_REWARDS } from '../_lib/gamification';

// POST /api/gamification/award-xp - Award XP to a user for an action
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { action } = await request.json();
    const userId = user.id;

    if (!action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const xpAmount = XP_REWARDS[action.toUpperCase() as keyof typeof XP_REWARDS];

    if (!xpAmount) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get current user XP
    const [users]: any = await pool.query('SELECT xp, level FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentXp = users[0].xp || 0;
    const newXp = currentXp + xpAmount;
    const oldLevel = users[0].level || 1;
    const newLevel = calculateLevel(newXp);
    const leveledUp = newLevel > oldLevel;

    // Update user XP and level
    await pool.query(
      'UPDATE users SET xp = ?, level = ? WHERE id = ?',
      [newXp, newLevel, userId]
    );

    // Check for new badges
    const newBadges = await checkAndAwardBadges(userId);

    return NextResponse.json({
      success: true,
      xpAwarded: xpAmount,
      totalXp: newXp,
      level: newLevel,
      leveledUp,
      newBadges,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error awarding XP:', error);
    return NextResponse.json({ error: 'שגיאה בהענקת XP' }, { status: 500 });
  }
}
