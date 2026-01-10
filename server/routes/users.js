const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/users - Get all users (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak 
             FROM users ORDER BY joined_at DESC`
        );
        res.json({ users });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת משתמשים' });
    }
});

// PUT /api/users/:id/role - Update user role (Admin only)
router.put('/:id/role', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;

        if (!['admin', 'approver', 'user'].includes(role)) {
            return res.status(400).json({ error: 'תפקיד לא תקין' });
        }

        // Get target user name for logging
        const [users] = await db.query('SELECT name FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'משתמש לא נמצא' });
        }

        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

        await db.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
            [
                'USER_ROLE_CHANGE',
                `שונה תפקיד למשתמש ${users[0].name} ל-${role}`,
                req.user.id,
                req.user.name,
                JSON.stringify({ targetId: id, role })
            ]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Update role error:', err);
        res.status(500).json({ error: 'שגיאה בעדכון תפקיד' });
    }
});

// PUT /api/users/:id/reset-password - Reset password (Admin only)
router.put('/:id/reset-password', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const newPassword = Math.random().toString(36).slice(-8);
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);

        res.json({ success: true, newPassword });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'שגיאה באיפוס סיסמה' });
    }
});

// DELETE /api/users/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent self-deletion
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'לא ניתן למחוק את עצמך' });
        }

        // Get user for logging
        const [users] = await db.query('SELECT name FROM users WHERE id = ?', [id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'משתמש לא נמצא' });
        }

        await db.query('DELETE FROM users WHERE id = ?', [id]);

        await db.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
            ['USER_DELETED', `נמחק משתמש: ${users[0].name}`, req.user.id, req.user.name, JSON.stringify({ targetId: id })]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ error: 'שגיאה במחיקת משתמש' });
    }
});

module.exports = router;
