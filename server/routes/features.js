const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Get all feature flags (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const [flags] = await pool.query(
            'SELECT * FROM feature_flags ORDER BY name ASC'
        );
        res.json(flags);
    } catch (err) {
        console.error('Error fetching feature flags:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הגדרות הפיצ\'רים' });
    }
});

// Update a feature flag status (Admin only)
router.put('/:key', authenticate, requireAdmin, async (req, res) => {
    const { key } = req.params;
    const { status } = req.body;

    if (!['active', 'admin_only', 'coming_soon', 'disabled'].includes(status)) {
        return res.status(400).json({ error: 'סטטוס לא תקין' });
    }

    try {
        const [result] = await pool.query(
            'UPDATE feature_flags SET status = ? WHERE feature_key = ?',
            [status, key]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'פיצ\'ר לא נמצא' });
        }

        // Log the change
        await pool.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) 
             VALUES ('FEATURE_FLAG_CHANGED', ?, ?, ?, ?)`,
            [
                `Feature "${key}" changed to "${status}"`,
                req.user.id,
                req.user.name,
                JSON.stringify({ feature_key: key, new_status: status })
            ]
        );

        res.json({ success: true, feature_key: key, status });
    } catch (err) {
        console.error('Error updating feature flag:', err);
        res.status(500).json({ error: 'שגיאה בעדכון הפיצ\'ר' });
    }
});

// Get public feature flags (for frontend to know what's available)
// Only returns 'active' features for regular users, 'admin_only' for admins
router.get('/public', async (req, res) => {
    try {
        // Check if user is admin (optional auth)
        let isAdmin = false;
        const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                isAdmin = decoded.role === 'admin';
            } catch (e) {
                // Invalid token, treat as guest
            }
        }

        // For regular users: return 'active' and 'coming_soon' flags
        // For admins: also include 'admin_only' flags
        let query = "SELECT feature_key, status FROM feature_flags WHERE status IN ('active', 'coming_soon')";
        if (isAdmin) {
            query = "SELECT feature_key, status FROM feature_flags WHERE status IN ('active', 'coming_soon', 'admin_only')";
        }

        const [flags] = await pool.query(query);

        // Return as a map for easy lookup
        const flagsMap = {};
        flags.forEach(f => {
            flagsMap[f.feature_key] = f.status;
        });

        res.json(flagsMap);
    } catch (err) {
        console.error('Error fetching public feature flags:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הגדרות' });
    }
});

module.exports = router;
