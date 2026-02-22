const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireAdmin, generateToken } = require('../middleware/auth');

// POST /api/users/sync - Sync Auth0 user with local DB
router.post('/sync', async (req, res) => {
    try {
        const { id, email, name, picture } = req.body;

        if (!id || !email) {
            return res.status(400).json({ error: 'Missing required user fields' });
        }

        // Upsert user: Insert if new, update name/email/last_login if exists
        // Note: We do NOT update 'role' here to prevent resetting admins to users
        await db.query(`
            INSERT INTO users (id, email, name, role, joined_at, last_login, contributions_count, xp, level, current_streak)
            VALUES (?, ?, ?, 'user', NOW(), NOW(), 0, 0, 1, 0)
            ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            email = VALUES(email),
            last_login = NOW()
        `, [id, email, name || email.split('@')[0]]);

        // Fetch the full user object (including role, xp, etc.) to return to client
        const [users] = await db.query(
            `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak 
             FROM users WHERE id = ?`,
            [id]
        );

        if (users.length > 0) {
            const user = users[0];
            // Format joined_at to timestamp if needed by frontend, or keep as ISO string
            // Frontend expects number for joinedAt? Let's check App.tsx types.
            // App.tsx uses Date.now() which is number. DB returns Date object.

            // Generate token for the user
            const token = generateToken(user);

            res.json({
                success: true,
                user: {
                    ...user,
                    joinedAt: new Date(user.joined_at).getTime(),
                    lastLoginDate: Date.now()
                },
                token
            });
        } else {
            res.status(500).json({ error: 'Failed to retrieve synced user' });
        }
    } catch (err) {
        console.error('User sync error:', err);
        res.status(500).json({ error: 'Sync failed' });
    }
});

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
        const crypto = require('crypto');
        const newPassword = crypto.randomBytes(6).toString('base64url');
        const passwordHash = await bcrypt.hash(newPassword, 10);

        await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);

        // Log password reset (without exposing the password)
        await db.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name) VALUES (?, ?, ?, ?)`,
            ['PASSWORD_RESET', `Admin reset password for user ${id}`, req.user.id, req.user.name]
        ).catch(() => {});

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
