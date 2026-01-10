const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireApprover } = require('../middleware/auth');

// GET /api/logs - Get system logs (Admin/Approver only)
router.get('/', authenticate, requireApprover, async (req, res) => {
    try {
        const { limit, eventType } = req.query;

        let query = `
            SELECT sl.*, u.name as actor_name 
            FROM system_logs sl
            LEFT JOIN users u ON sl.user_id = u.id
        `;
        const params = [];

        if (eventType) {
            query += ' WHERE sl.event_type = ?';
            params.push(eventType);
        }

        query += ' ORDER BY sl.created_at DESC LIMIT ?';
        params.push(parseInt(limit) || 100);

        const [logs] = await db.query(query, params);

        res.json({ logs });
    } catch (err) {
        console.error('Get logs error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת לוגים' });
    }
});

module.exports = router;
