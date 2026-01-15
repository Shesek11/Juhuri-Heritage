const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { authenticate, requireApprover } = require('../middleware/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../public/uploads/recordings');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for audio uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `recording-${uniqueSuffix}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('סוג קובץ לא נתמך. יש להעלות קובץ אודיו.'));
        }
    }
});

/**
 * POST /api/recordings/upload
 * Upload a new audio recording for an entry.
 */
router.post('/upload', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'לא התקבל קובץ אודיו' });
        }

        const { entryId, dialectId, userId, guestName } = req.body;

        if (!entryId) {
            return res.status(400).json({ error: 'חסר מזהה ערך' });
        }

        const fileUrl = `/uploads/recordings/${req.file.filename}`;
        const status = userId ? 'approved' : 'pending'; // Guests need approval

        const [result] = await db.query(`
            INSERT INTO audio_recordings (entry_id, dialect_id, user_id, file_url, status, duration_seconds)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            entryId,
            dialectId || null,
            userId || null,
            fileUrl,
            status,
            req.body.duration || null
        ]);

        res.status(201).json({
            success: true,
            id: result.insertId,
            fileUrl,
            status,
            message: status === 'approved' ? 'ההקלטה נשמרה!' : 'ההקלטה נשלחה לאישור'
        });

    } catch (err) {
        console.error('Error uploading recording:', err);
        res.status(500).json({ error: 'שגיאה בהעלאת ההקלטה' });
    }
});

/**
 * GET /api/recordings/:entryId
 * Get approved recordings for an entry.
 */
router.get('/:entryId', async (req, res) => {
    try {
        const { entryId } = req.params;

        const [recordings] = await db.query(`
            SELECT 
                ar.id,
                ar.file_url,
                ar.dialect_id,
                ar.likes_count,
                ar.duration_seconds,
                ar.created_at,
                ar.user_id,
                u.display_name as user_display_name,
                d.name as dialect_name
            FROM audio_recordings ar
            LEFT JOIN users u ON ar.user_id = u.id
            LEFT JOIN dialects d ON ar.dialect_id = d.id
            WHERE ar.entry_id = ? AND ar.status = 'approved'
            ORDER BY ar.likes_count DESC, ar.created_at DESC
        `, [entryId]);

        res.json({ recordings });

    } catch (err) {
        console.error('Error fetching recordings:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הקלטות' });
    }
});

/**
 * POST /api/recordings/:id/like
 * Like/unlike a recording.
 */
router.post('/:id/like', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'יש להתחבר כדי לתת לייק' });
        }

        const [existing] = await db.query(
            'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
            [userId, 'recording', id]
        );

        if (existing.length > 0) {
            await db.query('DELETE FROM likes WHERE id = ?', [existing[0].id]);
            await db.query('UPDATE audio_recordings SET likes_count = likes_count - 1 WHERE id = ?', [id]);
            res.json({ liked: false });
        } else {
            await db.query(
                'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)',
                [userId, 'recording', id]
            );
            await db.query('UPDATE audio_recordings SET likes_count = likes_count + 1 WHERE id = ?', [id]);
            res.json({ liked: true });
        }

    } catch (err) {
        console.error('Error toggling like:', err);
        res.status(500).json({ error: 'שגיאה בעדכון לייק' });
    }
});

/**
 * GET /api/recordings/admin/pending
 * Admin: Get pending recordings for moderation.
 */
router.get('/admin/pending', authenticate, requireApprover, async (req, res) => {
    try {
        const [recordings] = await db.query(`
            SELECT 
                ar.*,
                de.term as entry_term
            FROM audio_recordings ar
            LEFT JOIN dictionary_entries de ON ar.entry_id = de.id
            WHERE ar.status = 'pending'
            ORDER BY ar.created_at ASC
        `);

        res.json({ recordings });

    } catch (err) {
        console.error('Error fetching pending recordings:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הקלטות ממתינות' });
    }
});

/**
 * POST /api/recordings/:id/approve
 * Admin: Approve a recording.
 */
router.post('/:id/approve', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query("UPDATE audio_recordings SET status = 'approved' WHERE id = ?", [id]);
        res.json({ success: true, message: 'ההקלטה אושרה' });
    } catch (err) {
        console.error('Error approving recording:', err);
        res.status(500).json({ error: 'שגיאה באישור הקלטה' });
    }
});

/**
 * POST /api/recordings/:id/reject
 * Admin: Reject and delete a recording.
 */
router.post('/:id/reject', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;

        // Get file path to delete
        const [recordings] = await db.query('SELECT file_url FROM audio_recordings WHERE id = ?', [id]);
        if (recordings.length > 0) {
            const filePath = path.join(__dirname, '../../public', recordings[0].file_url);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await db.query('DELETE FROM audio_recordings WHERE id = ?', [id]);
        res.json({ success: true, message: 'ההקלטה נדחתה ונמחקה' });

    } catch (err) {
        console.error('Error rejecting recording:', err);
        res.status(500).json({ error: 'שגיאה בדחיית הקלטה' });
    }
});

module.exports = router;
