const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireApprover, optionalAuth } = require('../middleware/auth');

/**
 * GET /api/comments/:entryId
 * Fetch approved comments for a dictionary entry.
 */
router.get('/:entryId', async (req, res) => {
    try {
        const { entryId } = req.params;

        const [comments] = await db.query(`
            SELECT 
                c.id,
                c.content,
                c.guest_name,
                c.likes_count,
                c.created_at,
                c.user_id,
                u.display_name as user_display_name,
                u.avatar_url as user_avatar
            FROM comments c
            LEFT JOIN users u ON c.user_id = u.id
            WHERE c.entry_id = ? AND c.status = 'approved'
            ORDER BY c.created_at DESC
        `, [entryId]);

        res.json({ comments });

    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'שגיאה בטעינת תגובות' });
    }
});

/**
 * POST /api/comments
 * Add a new comment.
 * - Auth users: status = 'approved'
 * - Guests: status = 'pending', requires name
 */
router.post('/', optionalAuth, async (req, res) => {
    try {
        const { entryId, content, guestName } = req.body;
        // userId comes from authenticated token, not from request body
        const userId = req.user ? req.user.id : null;

        if (!entryId || !content) {
            return res.status(400).json({ error: 'חסר מידע נדרש' });
        }

        // Input length validation
        const MAX_COMMENT_LENGTH = 2000;
        const MAX_NAME_LENGTH = 100;

        if (content.length > MAX_COMMENT_LENGTH) {
            return res.status(400).json({ error: `התגובה ארוכה מדי (מקסימום ${MAX_COMMENT_LENGTH} תווים)` });
        }

        // Determine status based on auth
        const isGuest = !userId;
        const status = isGuest ? 'pending' : 'approved';

        if (isGuest && !guestName) {
            return res.status(400).json({ error: 'נדרש שם עבור תגובת אורח' });
        }

        if (guestName && guestName.length > MAX_NAME_LENGTH) {
            return res.status(400).json({ error: 'השם ארוך מדי' });
        }

        const [result] = await db.query(`
            INSERT INTO comments (entry_id, user_id, guest_name, content, status)
            VALUES (?, ?, ?, ?, ?)
        `, [entryId, userId, guestName || null, content, status]);

        res.status(201).json({
            success: true,
            id: result.insertId,
            status,
            message: isGuest ? 'התגובה נשלחה לאישור' : 'התגובה פורסמה'
        });

    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'שגיאה בהוספת תגובה' });
    }
});

/**
 * DELETE /api/comments/:id
 * Delete a comment (owner or admin only).
 */
router.delete('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership or admin
        const [comments] = await db.query('SELECT user_id FROM comments WHERE id = ?', [id]);

        if (comments.length === 0) {
            return res.status(404).json({ error: 'תגובה לא נמצאה' });
        }

        const comment = comments[0];
        const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'approver');
        const isOwner = req.user && String(comment.user_id) === String(req.user.id);

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'אין הרשאה למחוק תגובה זו' });
        }

        await db.query('DELETE FROM comments WHERE id = ?', [id]);

        res.json({ success: true, message: 'התגובה נמחקה' });

    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ error: 'שגיאה במחיקת תגובה' });
    }
});

/**
 * POST /api/comments/:id/like
 * Like a comment (auth users only).
 */
router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check if already liked
        const [existing] = await db.query(
            'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
            [userId, 'comment', id]
        );

        if (existing.length > 0) {
            // Unlike
            await db.query('DELETE FROM likes WHERE id = ?', [existing[0].id]);
            await db.query('UPDATE comments SET likes_count = likes_count - 1 WHERE id = ?', [id]);
            res.json({ liked: false });
        } else {
            // Like
            await db.query(
                'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)',
                [userId, 'comment', id]
            );
            await db.query('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?', [id]);
            res.json({ liked: true });
        }

    } catch (err) {
        console.error('Error toggling like:', err);
        res.status(500).json({ error: 'שגיאה בעדכון לייק' });
    }
});

/**
 * GET /api/comments/admin/pending
 * Admin: Fetch pending comments for moderation.
 */
router.get('/admin/pending', authenticate, requireApprover, async (req, res) => {
    try {
        const [comments] = await db.query(`
            SELECT 
                c.id,
                c.content,
                c.guest_name,
                c.created_at,
                c.entry_id,
                de.term as entry_term
            FROM comments c
            LEFT JOIN dictionary_entries de ON c.entry_id = de.id
            WHERE c.status = 'pending'
            ORDER BY c.created_at ASC
        `);

        res.json({ comments });

    } catch (err) {
        console.error('Error fetching pending comments:', err);
        res.status(500).json({ error: 'שגיאה בטעינת תגובות ממתינות' });
    }
});

/**
 * POST /api/comments/:id/approve
 * Admin: Approve a pending comment.
 */
router.post('/:id/approve', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query("UPDATE comments SET status = 'approved' WHERE id = ?", [id]);

        res.json({ success: true, message: 'התגובה אושרה' });

    } catch (err) {
        console.error('Error approving comment:', err);
        res.status(500).json({ error: 'שגיאה באישור תגובה' });
    }
});

/**
 * POST /api/comments/:id/reject
 * Admin: Reject a pending comment.
 */
router.post('/:id/reject', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query("UPDATE comments SET status = 'rejected' WHERE id = ?", [id]);

        res.json({ success: true, message: 'התגובה נדחתה' });

    } catch (err) {
        console.error('Error rejecting comment:', err);
        res.status(500).json({ error: 'שגיאה בדחיית תגובה' });
    }
});

module.exports = router;
