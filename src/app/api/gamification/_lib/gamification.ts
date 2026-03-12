import pool from '@/src/lib/db';

// XP Award Values
export const XP_REWARDS = {
  DAILY_LOGIN: 10,
  ADD_COMMENT: 5,
  RECORD_AUDIO: 15,
  APPROVED_CONTRIBUTION: 25,
  COMPLETE_LESSON: 20,
  STREAK_BONUS: 5, // Per day in streak
} as const;

// Badge Definitions
export const BADGES: Record<string, { id: string; name: string; description: string; requirement: { type: string; count: number } }> = {
  SPROUT: { id: 'sprout', name: '🌱 נבט', description: 'התחברת לראשונה', requirement: { type: 'login', count: 1 } },
  COMMENTER: { id: 'commenter', name: '💬 מגיב', description: 'הוספת 5 תגובות', requirement: { type: 'comments', count: 5 } },
  VOICE: { id: 'voice', name: '🎙️ קול', description: 'הקלטת להגייה ראשונה', requirement: { type: 'recordings', count: 1 } },
  STREAK_7: { id: 'streak_7', name: '🔥 שבוע ברצף', description: 'התחברת 7 ימים ברציפות', requirement: { type: 'streak', count: 7 } },
  CONTRIBUTOR: { id: 'contributor', name: '⭐ תורם', description: '10 ערכים שאושרו', requirement: { type: 'contributions', count: 10 } },
  VETERAN: { id: 'veteran', name: '🏆 ותיק', description: 'הגעת לרמה 10', requirement: { type: 'level', count: 10 } },
};

// Calculate level from XP
export const calculateLevel = (xp: number): number => Math.floor(Math.sqrt(xp / 100)) + 1;

// XP needed for next level
export const xpForLevel = (level: number): number => Math.pow(level, 2) * 100;

/**
 * Check and award badges based on user stats.
 */
export async function checkAndAwardBadges(userId: number | string): Promise<any[]> {
  const newBadges: any[] = [];

  try {
    // Get user stats
    const [users]: any = await pool.query(`
      SELECT u.id, u.level, u.current_streak, u.contributions_count,
             (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) as comments_count,
             (SELECT COUNT(*) FROM audio_recordings ar WHERE ar.user_id = u.id) as recordings_count
      FROM users u
      WHERE u.id = ? OR u.auth0_id = ?
    `, [userId, userId]);

    if (users.length === 0) return newBadges;

    const user = users[0];

    // Get existing badges
    const [existingBadges]: any = await pool.query(
      'SELECT badge_id FROM user_badges WHERE user_id = ?',
      [user.id]
    );
    const earnedIds = existingBadges.map((b: any) => b.badge_id);

    // Check each badge
    const badgesToAward: string[] = [];

    if (!earnedIds.includes('sprout')) {
      badgesToAward.push('sprout'); // First login = earned
    }

    if (!earnedIds.includes('commenter') && user.comments_count >= 5) {
      badgesToAward.push('commenter');
    }

    if (!earnedIds.includes('voice') && user.recordings_count >= 1) {
      badgesToAward.push('voice');
    }

    if (!earnedIds.includes('streak_7') && user.current_streak >= 7) {
      badgesToAward.push('streak_7');
    }

    if (!earnedIds.includes('contributor') && user.contributions_count >= 10) {
      badgesToAward.push('contributor');
    }

    if (!earnedIds.includes('veteran') && user.level >= 10) {
      badgesToAward.push('veteran');
    }

    // Award new badges
    for (const badgeId of badgesToAward) {
      await pool.query(
        'INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)',
        [user.id, badgeId]
      );
      const badgeKey = badgeId.toUpperCase().replace('_', '') as keyof typeof BADGES;
      newBadges.push(BADGES[badgeKey] || { id: badgeId });
    }
  } catch (err) {
    console.error('Error checking badges:', err);
  }

  return newBadges;
}
