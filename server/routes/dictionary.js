const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireApprover, optionalAuth } = require('../middleware/auth');

// GET /api/dictionary/search?q=term
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({ error: 'נדרש מונח לחיפוש' });
        }

        const term = q.trim();

        // Search in active entries
        const [entries] = await db.query(
            `SELECT de.*, u.name as contributor_name, a.name as approver_name
             FROM dictionary_entries de
             LEFT JOIN users u ON de.contributor_id = u.id
             LEFT JOIN users a ON de.approved_by = a.id
             WHERE de.term LIKE ? AND de.status = 'active'
             ORDER BY 
                CASE WHEN de.term = ? THEN 0 ELSE 1 END,
                de.created_at DESC
             LIMIT 5`,
            [`%${term}%`, term]
        );

        if (entries.length === 0) {
            return res.json({ found: false, entry: null });
        }

        // Get the best match (exact or first)
        const entry = entries[0];

        // Get translations
        const [translations] = await db.query(
            `SELECT t.*, d.name as dialect 
             FROM translations t
             JOIN dialects d ON t.dialect_id = d.id
             WHERE t.entry_id = ?`,
            [entry.id]
        );

        // Get definitions
        const [definitions] = await db.query(
            'SELECT definition FROM definitions WHERE entry_id = ?',
            [entry.id]
        );

        // Get examples
        const [examples] = await db.query(
            'SELECT origin, translated, transliteration FROM examples WHERE entry_id = ?',
            [entry.id]
        );

        const result = {
            term: entry.term,
            detectedLanguage: entry.detected_language,
            translations: translations.map(t => ({
                dialect: t.dialect,
                hebrew: t.hebrew,
                latin: t.latin,
                cyrillic: t.cyrillic
            })),
            definitions: definitions.map(d => d.definition),
            examples,
            pronunciationGuide: entry.pronunciation_guide,
            isCustom: true,
            source: entry.source,
            status: entry.status
        };

        res.json({ found: true, entry: result });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'שגיאה בחיפוש' });
    }
});

// GET /api/dictionary/entries - Get all entries (admin)
router.get('/entries', authenticate, requireApprover, async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT de.*, u.name as contributor_name
            FROM dictionary_entries de
            LEFT JOIN users u ON de.contributor_id = u.id
        `;
        const params = [];

        if (status) {
            query += ' WHERE de.status = ?';
            params.push(status);
        }

        query += ' ORDER BY de.created_at DESC';

        const [entries] = await db.query(query, params);

        // Get translations for all entries
        for (const entry of entries) {
            const [translations] = await db.query(
                `SELECT t.*, d.name as dialect 
                 FROM translations t
                 JOIN dialects d ON t.dialect_id = d.id
                 WHERE t.entry_id = ?`,
                [entry.id]
            );
            entry.translations = translations;

            const [definitions] = await db.query(
                'SELECT definition FROM definitions WHERE entry_id = ?',
                [entry.id]
            );
            entry.definitions = definitions.map(d => d.definition);
        }

        res.json({ entries });
    } catch (err) {
        console.error('Get entries error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים' });
    }
});

// POST /api/dictionary/entries - Add new entry
router.post('/entries', optionalAuth, async (req, res) => {
    try {
        const { term, translation, dialect, notes, detectedLanguage } = req.body;

        if (!term || !translation) {
            return res.status(400).json({ error: 'נדרשים מונח ותרגום' });
        }

        // Status based on user role
        const status = req.user?.role === 'admin' || req.user?.role === 'approver' ? 'active' : 'pending';

        // Insert entry
        const [result] = await db.query(
            `INSERT INTO dictionary_entries 
             (term, detected_language, source, status, contributor_id) 
             VALUES (?, ?, 'User', ?, ?)`,
            [term, detectedLanguage || 'Hebrew', status, req.user?.id || null]
        );

        const entryId = result.insertId;

        // Get dialect ID
        let dialectId = 6; // Default to General
        const [dialects] = await db.query('SELECT id FROM dialects WHERE name = ?', [dialect || 'General']);
        if (dialects.length > 0) {
            dialectId = dialects[0].id;
        }

        // Insert translation
        await db.query(
            `INSERT INTO translations (entry_id, dialect_id, hebrew, latin) VALUES (?, ?, ?, ?)`,
            [entryId, dialectId, translation, '']
        );

        // Insert definition if notes provided
        if (notes) {
            await db.query(
                'INSERT INTO definitions (entry_id, definition) VALUES (?, ?)',
                [entryId, notes]
            );
        }

        // Update contributor count
        if (req.user?.id) {
            await db.query(
                'UPDATE users SET contributions_count = contributions_count + 1, xp = xp + 50 WHERE id = ?',
                [req.user.id]
            );
        }

        // Log event
        await db.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
            [
                'ENTRY_ADDED',
                status === 'pending' ? `הוצעה מילה חדשה: ${term}` : `נוספה מילה למאגר: ${term}`,
                req.user?.id || null,
                req.user?.name || 'אורח',
                JSON.stringify({ term })
            ]
        );

        res.json({ success: true, entryId, status });
    } catch (err) {
        console.error('Add entry error:', err);
        res.status(500).json({ error: 'שגיאה בהוספת מילה' });
    }
});

// POST /api/dictionary/entries/batch - Add multiple entries (admin)
router.post('/entries/batch', authenticate, requireApprover, async (req, res) => {
    try {
        const { entries } = req.body;

        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ error: 'נדרש מערך מילים' });
        }

        let addedCount = 0;

        for (const entry of entries) {
            if (!entry.term) continue;

            // Insert entry
            const [result] = await db.query(
                `INSERT INTO dictionary_entries 
                 (term, detected_language, pronunciation_guide, source, status, contributor_id, approved_by, approved_at) 
                 VALUES (?, ?, ?, ?, 'active', ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE term = term`,
                [
                    entry.term,
                    entry.detectedLanguage || 'Hebrew',
                    entry.pronunciationGuide || null,
                    entry.source || 'Manual',
                    req.user.id,
                    req.user.id
                ]
            );

            const entryId = result.insertId || result.affectedRows;
            if (!entryId) continue;

            // Insert translations
            if (entry.translations) {
                for (const t of entry.translations) {
                    const [dialects] = await db.query('SELECT id FROM dialects WHERE name = ?', [t.dialect || 'General']);
                    const dialectId = dialects[0]?.id || 6;

                    await db.query(
                        `INSERT INTO translations (entry_id, dialect_id, hebrew, latin, cyrillic) VALUES (?, ?, ?, ?, ?)`,
                        [entryId, dialectId, t.hebrew || '', t.latin || '', t.cyrillic || '']
                    );
                }
            }

            // Insert definitions
            if (entry.definitions) {
                for (const def of entry.definitions) {
                    await db.query('INSERT INTO definitions (entry_id, definition) VALUES (?, ?)', [entryId, def]);
                }
            }

            // Insert examples
            if (entry.examples) {
                for (const ex of entry.examples) {
                    await db.query(
                        'INSERT INTO examples (entry_id, origin, translated, transliteration) VALUES (?, ?, ?, ?)',
                        [entryId, ex.origin, ex.translated || '', ex.transliteration || '']
                    );
                }
            }

            addedCount++;
        }

        res.json({ success: true, addedCount });
    } catch (err) {
        console.error('Batch add error:', err);
        res.status(500).json({ error: 'שגיאה בהוספת מילים' });
    }
});

// PUT /api/dictionary/entries/:term/approve
router.put('/entries/:term/approve', authenticate, requireApprover, async (req, res) => {
    try {
        const { term } = req.params;

        await db.query(
            `UPDATE dictionary_entries 
             SET status = 'active', approved_by = ?, approved_at = NOW() 
             WHERE term = ?`,
            [req.user.id, term]
        );

        await db.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
            ['ENTRY_APPROVED', `אושרה מילה: ${term}`, req.user.id, req.user.name, JSON.stringify({ term })]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Approve error:', err);
        res.status(500).json({ error: 'שגיאה באישור מילה' });
    }
});

// DELETE /api/dictionary/entries/:term
router.delete('/entries/:term', authenticate, requireApprover, async (req, res) => {
    try {
        const { term } = req.params;

        // Get entry to determine log type
        const [entries] = await db.query('SELECT * FROM dictionary_entries WHERE term = ?', [term]);
        const entry = entries[0];

        if (!entry) {
            return res.status(404).json({ error: 'מילה לא נמצאה' });
        }

        await db.query('DELETE FROM dictionary_entries WHERE term = ?', [term]);

        const eventType = entry.status === 'pending' ? 'ENTRY_REJECTED' : 'ENTRY_DELETED';
        const description = entry.status === 'pending' ? `נדחתה הצעה למילה: ${term}` : `נמחקה מילה מהמאגר: ${term}`;

        await db.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
            [eventType, description, req.user.id, req.user.name, JSON.stringify({ term })]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({ error: 'שגיאה במחיקת מילה' });
    }
});

module.exports = router;
