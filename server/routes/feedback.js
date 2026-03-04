const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

// Submit feedback (public - no auth required)
router.post('/', [
    body('message').trim().notEmpty().withMessage('יש להזין הודעה')
        .isLength({ max: 5000 }).withMessage('ההודעה ארוכה מדי'),
    body('category').optional().trim().isIn(['suggestion', 'bug', 'content', 'general']).withMessage('קטגוריה לא חוקית'),
    body('userName').optional().trim().isLength({ max: 100 }),
    body('userEmail').optional().trim().isEmail().withMessage('כתובת אימייל לא חוקית'),
    body('pageUrl').optional().trim().isLength({ max: 500 }),
    validate
], async (req, res) => {
    try {
        const { category, message, userName, userEmail, pageUrl } = req.body;

        await pool.query(
            'INSERT INTO site_feedback (category, message, user_name, user_email, page_url) VALUES (?, ?, ?, ?, ?)',
            [category || 'suggestion', message.trim(), userName?.trim() || null, userEmail?.trim() || null, pageUrl || null]
        );

        res.json({ success: true, message: 'תודה! ההודעה נשלחה בהצלחה' });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({ error: 'שגיאה בשליחת ההודעה' });
    }
});

// Get all feedback (admin only)
router.get('/admin', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT * FROM site_feedback';
        const params = [];

        if (status && status !== 'all') {
            query += ' WHERE status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const [rows] = await pool.query(query, params);
        res.json({ feedback: rows });
    } catch (err) {
        console.error('Error fetching feedback:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הודעות' });
    }
});

// Update feedback status (admin only)
router.put('/admin/:id', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, adminNote } = req.body;

        await pool.query(
            'UPDATE site_feedback SET status = ?, admin_note = ? WHERE id = ?',
            [status, adminNote || null, id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating feedback:', err);
        res.status(500).json({ error: 'שגיאה בעדכון' });
    }
});

module.exports = router;
