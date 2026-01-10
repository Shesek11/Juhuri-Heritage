const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/progress - Get user's progress
router.get('/', authenticate, async (req, res) => {
    try {
        const [progress] = await db.query(
            'SELECT unit_id, score, completed_at FROM user_progress WHERE user_id = ?',
            [req.user.id]
        );

        const [user] = await db.query(
            'SELECT xp, level, current_streak FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({
            completedUnits: progress.map(p => p.unit_id),
            xp: user[0]?.xp || 0,
            level: user[0]?.level || 1,
            currentStreak: user[0]?.current_streak || 0
        });
    } catch (err) {
        console.error('Get progress error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת התקדמות' });
    }
});

// POST /api/progress/complete-unit
router.post('/complete-unit', authenticate, async (req, res) => {
    try {
        const { unitId, score } = req.body;

        if (!unitId) {
            return res.status(400).json({ error: 'נדרש מזהה יחידה' });
        }

        // Check if already completed
        const [existing] = await db.query(
            'SELECT id FROM user_progress WHERE user_id = ? AND unit_id = ?',
            [req.user.id, unitId]
        );

        const xpGained = score ? Math.round(score * 2) : 100;

        if (existing.length === 0) {
            // First completion
            await db.query(
                'INSERT INTO user_progress (user_id, unit_id, score) VALUES (?, ?, ?)',
                [req.user.id, unitId, score || 0]
            );

            // Award XP
            await db.query(
                'UPDATE users SET xp = xp + ?, level = FLOOR((xp + ?) / 1000) + 1 WHERE id = ?',
                [xpGained, xpGained, req.user.id]
            );
        } else {
            // Update score if better
            await db.query(
                'UPDATE user_progress SET score = GREATEST(score, ?), completed_at = NOW() WHERE user_id = ? AND unit_id = ?',
                [score || 0, req.user.id, unitId]
            );
        }

        // Get updated user info
        const [user] = await db.query(
            'SELECT xp, level FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            xp: user[0]?.xp || 0,
            level: user[0]?.level || 1,
            xpGained: existing.length === 0 ? xpGained : 0
        });
    } catch (err) {
        console.error('Complete unit error:', err);
        res.status(500).json({ error: 'שגיאה בשמירת התקדמות' });
    }
});

// POST /api/progress/add-xp
router.post('/add-xp', authenticate, async (req, res) => {
    try {
        const { xp } = req.body;

        if (!xp || xp <= 0) {
            return res.status(400).json({ error: 'נדרש XP חיובי' });
        }

        await db.query(
            'UPDATE users SET xp = xp + ?, level = FLOOR((xp + ?) / 1000) + 1 WHERE id = ?',
            [xp, xp, req.user.id]
        );

        const [user] = await db.query(
            'SELECT xp, level FROM users WHERE id = ?',
            [req.user.id]
        );

        res.json({
            success: true,
            xp: user[0]?.xp || 0,
            level: user[0]?.level || 1
        });
    } catch (err) {
        console.error('Add XP error:', err);
        res.status(500).json({ error: 'שגיאה בהוספת XP' });
    }
});

module.exports = router;
