const express = require('express');
const router = express.Router();
const db = require('../config/db');

// XP Award Values
const XP_REWARDS = {
    DAILY_LOGIN: 10,
    ADD_COMMENT: 5,
    RECORD_AUDIO: 15,
    APPROVED_CONTRIBUTION: 25,
    COMPLETE_LESSON: 20,
    STREAK_BONUS: 5 // Per day in streak
};

// Badge Definitions
const BADGES = {
    SPROUT: { id: 'sprout', name: '🌱 נבט', description: 'התחברת לראשונה', requirement: { type: 'login', count: 1 } },
    COMMENTER: { id: 'commenter', name: '💬 מגיב', description: 'הוספת 5 תגובות', requirement: { type: 'comments', count: 5 } },
    VOICE: { id: 'voice', name: '🎙️ קול', description: 'הקלטת להגייה ראשונה', requirement: { type: 'recordings', count: 1 } },
    STREAK_7: { id: 'streak_7', name: '🔥 שבוע ברצף', description: 'התחברת 7 ימים ברציפות', requirement: { type: 'streak', count: 7 } },
    CONTRIBUTOR: { id: 'contributor', name: '⭐ תורם', description: '10 ערכים שאושרו', requirement: { type: 'contributions', count: 10 } },
    VETERAN: { id: 'veteran', name: '🏆 ותיק', description: 'הגעת לרמה 10', requirement: { type: 'level', count: 10 } }
};

// Calculate level from XP
const calculateLevel = (xp) => Math.floor(Math.sqrt(xp / 100)) + 1;

// XP needed for next level
const xpForLevel = (level) => Math.pow(level, 2) * 100;

/**
 * POST /api/gamification/award-xp
 * Award XP to a user for an action.
 */
router.post('/award-xp', async (req, res) => {
    try {
        const { userId, action, amount } = req.body;

        if (!userId || !action) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const xpAmount = amount || XP_REWARDS[action.toUpperCase()] || 0;

        if (xpAmount === 0) {
            return res.status(400).json({ error: 'Invalid action' });
        }

        // Get current user XP
        const [users] = await db.query('SELECT xp, level FROM users WHERE id = ? OR auth0_id = ?', [userId, userId]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const currentXp = users[0].xp || 0;
        const newXp = currentXp + xpAmount;
        const oldLevel = users[0].level || 1;
        const newLevel = calculateLevel(newXp);
        const leveledUp = newLevel > oldLevel;

        // Update user XP and level
        await db.query(
            'UPDATE users SET xp = ?, level = ? WHERE id = ? OR auth0_id = ?',
            [newXp, newLevel, userId, userId]
        );

        // Check for new badges
        const newBadges = await checkAndAwardBadges(userId);

        res.json({
            success: true,
            xpAwarded: xpAmount,
            totalXp: newXp,
            level: newLevel,
            leveledUp,
            newBadges
        });

    } catch (err) {
        console.error('Error awarding XP:', err);
        res.status(500).json({ error: 'שגיאה בהענקת XP' });
    }
});

/**
 * POST /api/gamification/check-login-streak
 * Check and update login streak, award daily XP.
 */
router.post('/check-login-streak', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'Missing userId' });
        }

        const [users] = await db.query(
            'SELECT id, xp, level, current_streak, last_login_date FROM users WHERE id = ? OR auth0_id = ?',
            [userId, userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
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

            await db.query(
                'UPDATE users SET xp = ?, level = ?, current_streak = ?, last_login_date = NOW() WHERE id = ?',
                [newXp, newLevel, streak, user.id]
            );
        }

        // Check for badges
        const newBadges = await checkAndAwardBadges(userId);

        res.json({
            success: true,
            streak,
            xpAwarded,
            isNewDay,
            newBadges
        });

    } catch (err) {
        console.error('Error checking login streak:', err);
        res.status(500).json({ error: 'שגיאה בבדיקת רצף התחברות' });
    }
});

/**
 * GET /api/gamification/badges/:userId
 * Get user's earned badges.
 */
router.get('/badges/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const [badges] = await db.query(`
            SELECT badge_id, earned_at
            FROM user_badges ub
            JOIN users u ON ub.user_id = u.id
            WHERE u.id = ? OR u.auth0_id = ?
        `, [userId, userId]);

        const earnedBadgeIds = badges.map(b => b.badge_id);

        // Return all badges with earned status
        const allBadges = Object.values(BADGES).map(badge => ({
            ...badge,
            earned: earnedBadgeIds.includes(badge.id),
            earnedAt: badges.find(b => b.badge_id === badge.id)?.earned_at
        }));

        res.json({ badges: allBadges });

    } catch (err) {
        console.error('Error fetching badges:', err);
        res.status(500).json({ error: 'שגיאה בטעינת תגים' });
    }
});

/**
 * GET /api/gamification/stats/:userId
 * Get user's gamification stats.
 */
router.get('/stats/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const [users] = await db.query(`
            SELECT xp, level, current_streak, contributions_count
            FROM users
            WHERE id = ? OR auth0_id = ?
        `, [userId, userId]);

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        const level = user.level || 1;
        const currentXp = user.xp || 0;
        const xpForCurrentLevel = xpForLevel(level - 1);
        const xpForNextLevel = xpForLevel(level);
        const progressPercent = Math.round(((currentXp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100);

        res.json({
            xp: currentXp,
            level,
            streak: user.current_streak || 0,
            contributions: user.contributions_count || 0,
            xpForNextLevel,
            progressPercent
        });

    } catch (err) {
        console.error('Error fetching stats:', err);
        res.status(500).json({ error: 'שגיאה בטעינת סטטיסטיקות' });
    }
});

/**
 * Check and award badges based on user stats.
 */
async function checkAndAwardBadges(userId) {
    const newBadges = [];

    try {
        // Get user stats
        const [users] = await db.query(`
            SELECT u.id, u.level, u.current_streak, u.contributions_count,
                   (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) as comments_count,
                   (SELECT COUNT(*) FROM audio_recordings ar WHERE ar.user_id = u.id) as recordings_count
            FROM users u
            WHERE u.id = ? OR u.auth0_id = ?
        `, [userId, userId]);

        if (users.length === 0) return newBadges;

        const user = users[0];

        // Get existing badges
        const [existingBadges] = await db.query(
            'SELECT badge_id FROM user_badges WHERE user_id = ?',
            [user.id]
        );
        const earnedIds = existingBadges.map(b => b.badge_id);

        // Check each badge
        const badgesToAward = [];

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
            await db.query(
                'INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)',
                [user.id, badgeId]
            );
            newBadges.push(BADGES[badgeId.toUpperCase().replace('_', '')] || { id: badgeId });
        }

    } catch (err) {
        console.error('Error checking badges:', err);
    }

    return newBadges;
}

module.exports = router;
