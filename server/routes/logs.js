const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireApprover } = require('../middleware/auth');

// GET /api/logs - Get system logs (Admin/Approver only)
router.get('/', authenticate, requireApprover, async (req, res) => {
    try {
        const { limit, eventType, userId, from, to, search } = req.query;

        let query = `
            SELECT sl.*, u.name as actor_name, u.email as actor_email
            FROM system_logs sl
            LEFT JOIN users u ON sl.user_id = u.id
        `;
        const conditions = [];
        const params = [];

        if (eventType) {
            conditions.push('sl.event_type = ?');
            params.push(eventType);
        }
        if (userId) {
            conditions.push('sl.user_id = ?');
            params.push(parseInt(userId));
        }
        if (from) {
            conditions.push('sl.created_at >= ?');
            params.push(from);
        }
        if (to) {
            conditions.push('sl.created_at <= ?');
            params.push(to + ' 23:59:59');
        }
        if (search) {
            conditions.push('sl.description LIKE ?');
            params.push(`%${search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY sl.created_at DESC LIMIT ?';
        params.push(parseInt(limit) || 200);

        const [logs] = await db.query(query, params);

        // Always return full user list for the filter combobox
        const [allUsers] = await db.query('SELECT id, name, email FROM users ORDER BY name');

        res.json({
            users: allUsers.map(u => ({ id: String(u.id), name: u.name, email: u.email })),
            logs: logs.map(l => ({
                id: String(l.id),
                type: l.event_type,
                description: l.description,
                userId: l.user_id ? String(l.user_id) : null,
                userName: l.actor_name || l.user_name || null,
                userEmail: l.actor_email || null,
                timestamp: l.created_at ? new Date(l.created_at).toISOString() : null,
                ipAddress: l.ip_address || null,
                metadata: l.metadata ? (typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata) : null,
            }))
        });
    } catch (err) {
        console.error('Get logs error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת לוגים' });
    }
});

module.exports = router;
