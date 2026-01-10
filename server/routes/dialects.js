const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/dialects
router.get('/', async (req, res) => {
    try {
        const [dialects] = await db.query('SELECT * FROM dialects ORDER BY id');
        res.json({ dialects });
    } catch (err) {
        console.error('Get dialects error:', err);
        res.status(500).json({
            error: 'שגיאה בטעינת ניבים',
            details: err.message
        });
    }
});

// POST /api/dialects (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'נדרש שם לניב' });
        }

        const [result] = await db.query(
            'INSERT INTO dialects (name, description) VALUES (?, ?)',
            [name, description || '']
        );

        await db.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
            ['DIALECT_ADDED', `נוסף ניב חדש: ${description || name}`, req.user.id, req.user.name, JSON.stringify({ name })]
        );

        res.json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Add dialect error:', err);
        res.status(500).json({ error: 'שגיאה בהוספת ניב' });
    }
});

// DELETE /api/dialects/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check minimum count
        const [count] = await db.query('SELECT COUNT(*) as total FROM dialects');
        if (count[0].total <= 1) {
            return res.status(400).json({ error: 'חייב להישאר לפחות ניב אחד' });
        }

        await db.query('DELETE FROM dialects WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete dialect error:', err);
        res.status(500).json({ error: 'שגיאה במחיקת ניב' });
    }
});

module.exports = router;
