import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { BADGES } from '../../_lib/gamification';

// GET /api/gamification/badges/:userId - Get user's earned badges
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    const [badges]: any = await pool.query(`
      SELECT badge_id, earned_at
      FROM user_badges ub
      JOIN users u ON ub.user_id = u.id
      WHERE u.id = ? OR u.auth0_id = ?
    `, [userId, userId]);

    const earnedBadgeIds = badges.map((b: any) => b.badge_id);

    // Return all badges with earned status
    const allBadges = Object.values(BADGES).map(badge => ({
      ...badge,
      earned: earnedBadgeIds.includes(badge.id),
      earnedAt: badges.find((b: any) => b.badge_id === badge.id)?.earned_at,
    }));

    return NextResponse.json({ badges: allBadges });
  } catch (error) {
    console.error('Error fetching badges:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת תגים' }, { status: 500 });
  }
}
