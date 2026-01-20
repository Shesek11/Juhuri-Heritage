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

// POST /api/dictionary/entries/:id/like - Toggle like
router.post('/entries/:id/like', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check availability
        const [likes] = await db.query('SELECT 1 FROM entry_likes WHERE entry_id = ? AND user_id = ?', [id, userId]);

        if (likes.length > 0) {
            // Unlike
            await db.query('DELETE FROM entry_likes WHERE entry_id = ? AND user_id = ?', [id, userId]);
            res.json({ success: true, liked: false });
        } else {
            // Like
            await db.query('INSERT INTO entry_likes (entry_id, user_id) VALUES (?, ?)', [id, userId]);

            // Optional: Reward XP to creator?
            // await db.query('UPDATE users u JOIN dictionary_entries de ON u.id = de.contributor_id SET u.xp = u.xp + 5 WHERE de.id = ?', [id]);

            res.json({ success: true, liked: true });
        }
    } catch (err) {
        console.error('Like error:', err);
        res.status(500).json({ error: 'Action failed' });
    }
});

// GET /api/dictionary/entries/:id/comments - Get comments
router.get('/entries/:id/comments', async (req, res) => {
    try {
        const { id } = req.params;
        const [comments] = await db.query(
            `SELECT c.*, u.name as user_name 
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.entry_id = ? 
             ORDER BY c.created_at ASC`,
            [id]
        );
        res.json({ comments });
    } catch (err) {
        console.error('Get comments error:', err);
        res.status(500).json({ error: 'Failed to load comments' });
    }
});

// POST /api/dictionary/entries/:id/comments - Add comment
router.post('/entries/:id/comments', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }

        await db.query(
            'INSERT INTO comments (entry_id, user_id, content, created_at) VALUES (?, ?, ?, NOW())',
            [id, req.user.id, content]
        );

        // Award XP 
        await db.query('UPDATE users SET xp = xp + 10 WHERE id = ?', [req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Add comment error:', err);
        res.status(500).json({ error: 'Failed to post comment' });
    }
});

// ============================================
// COMMUNITY TRANSLATION FEATURES
// ============================================

// POST /api/dictionary/translations/:id/vote - Vote on a translation
router.post('/translations/:id/vote', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body; // 'up' or 'down'
        const userId = req.user.id;

        if (!['up', 'down'].includes(voteType)) {
            return res.status(400).json({ error: 'סוג הצבעה לא חוקי' });
        }

        // Check if user already voted
        const [existingVotes] = await db.query(
            'SELECT * FROM translation_votes WHERE translation_id = ? AND user_id = ?',
            [id, userId]
        );

        if (existingVotes.length > 0) {
            const existing = existingVotes[0];
            if (existing.vote_type === voteType) {
                // Remove vote (toggle off)
                await db.query('DELETE FROM translation_votes WHERE id = ?', [existing.id]);
                await db.query(
                    `UPDATE translations SET ${voteType === 'up' ? 'upvotes = upvotes - 1' : 'downvotes = downvotes - 1'} WHERE id = ?`,
                    [id]
                );
                return res.json({ success: true, action: 'removed' });
            } else {
                // Change vote
                await db.query('UPDATE translation_votes SET vote_type = ? WHERE id = ?', [voteType, existing.id]);
                // Update counters: add to new, remove from old
                const incr = voteType === 'up' ? 'upvotes = upvotes + 1, downvotes = downvotes - 1' : 'upvotes = upvotes - 1, downvotes = downvotes + 1';
                await db.query(`UPDATE translations SET ${incr} WHERE id = ?`, [id]);
                return res.json({ success: true, action: 'changed', voteType });
            }
        }

        // Insert new vote
        await db.query(
            'INSERT INTO translation_votes (translation_id, user_id, vote_type) VALUES (?, ?, ?)',
            [id, userId, voteType]
        );
        await db.query(
            `UPDATE translations SET ${voteType === 'up' ? 'upvotes = upvotes + 1' : 'downvotes = downvotes + 1'} WHERE id = ?`,
            [id]
        );

        // Award XP for community participation
        await db.query('UPDATE users SET xp = xp + 5 WHERE id = ?', [userId]);

        res.json({ success: true, action: 'added', voteType });
    } catch (err) {
        console.error('Vote error:', err);
        res.status(500).json({ error: 'שגיאה בהצבעה' });
    }
});

// PUT /api/dictionary/translations/:id - Update translation (admin direct edit)
router.put('/translations/:id', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;
        const { hebrew, latin, cyrillic, dialectId } = req.body;

        if (!hebrew) {
            return res.status(400).json({ error: 'נדרש תרגום עברי' });
        }

        const updates = ['hebrew = ?'];
        const values = [hebrew];

        if (latin !== undefined) {
            updates.push('latin = ?');
            values.push(latin);
        }
        if (cyrillic !== undefined) {
            updates.push('cyrillic = ?');
            values.push(cyrillic);
        }
        if (dialectId !== undefined) {
            updates.push('dialect_id = ?');
            values.push(dialectId);
        }

        values.push(id);

        await db.query(
            `UPDATE translations SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Update translation error:', err);
        res.status(500).json({ error: 'שגיאה בעדכון תרגום' });
    }
});

// POST /api/dictionary/entries/:id/suggest - Submit translation suggestion
router.post('/entries/:id/suggest', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { translationId, dialect, hebrew, latin, cyrillic, reason } = req.body;

        if (!hebrew || !dialect) {
            return res.status(400).json({ error: 'נדרש תרגום וניב' });
        }

        await db.query(
            `INSERT INTO translation_suggestions 
             (entry_id, translation_id, user_id, user_name, dialect, suggested_hebrew, suggested_latin, suggested_cyrillic, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, translationId || null, req.user.id, req.user.name, dialect, hebrew, latin || '', cyrillic || '', reason || '']
        );

        // Award XP for contribution
        await db.query('UPDATE users SET xp = xp + 20 WHERE id = ?', [req.user.id]);

        res.json({ success: true, message: 'ההצעה נשלחה לאישור' });
    } catch (err) {
        console.error('Suggest error:', err);
        res.status(500).json({ error: 'שגיאה בשליחת הצעה' });
    }
});

// GET /api/dictionary/needs-translation - Words without translations (for widget)
router.get('/needs-translation', async (req, res) => {
    try {
        const [entries] = await db.query(
            `SELECT de.id, de.term, de.detected_language
             FROM dictionary_entries de
             LEFT JOIN translations t ON de.id = t.entry_id
             WHERE de.status = 'active' AND t.id IS NULL
             LIMIT 5`
        );
        res.json({ entries });
    } catch (err) {
        console.error('Needs translation error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים' });
    }
});

// GET /api/dictionary/missing-dialects - Words with partial translations (for widget)
router.get('/missing-dialects', async (req, res) => {
    try {
        // Get all dialects
        const [allDialects] = await db.query('SELECT id, name FROM dialects');
        const dialectIds = allDialects.map(d => d.id);

        // Find entries that don't have all dialects
        const [entries] = await db.query(
            `SELECT de.id, de.term, de.detected_language, 
                    GROUP_CONCAT(DISTINCT d.name) as existing_dialects,
                    COUNT(DISTINCT t.dialect_id) as dialect_count
             FROM dictionary_entries de
             JOIN translations t ON de.id = t.entry_id
             JOIN dialects d ON t.dialect_id = d.id
             WHERE de.status = 'active'
             GROUP BY de.id
             HAVING dialect_count < ?
             LIMIT 5`,
            [dialectIds.length]
        );

        // Calculate missing dialects for each
        const result = entries.map(e => {
            const existing = (e.existing_dialects || '').split(',');
            const missing = allDialects.filter(d => !existing.includes(d.name)).map(d => d.name);
            return {
                id: e.id,
                term: e.term,
                detectedLanguage: e.detected_language,
                existingDialects: existing,
                missingDialects: missing
            };
        });

        res.json({ entries: result });
    } catch (err) {
        console.error('Missing dialects error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים' });
    }
});

// GET /api/dictionary/pending-suggestions - Translations pending approval (for widget/admin)
router.get('/pending-suggestions', async (req, res) => {
    try {
        const [suggestions] = await db.query(
            `SELECT ts.*, de.term
             FROM translation_suggestions ts
             JOIN dictionary_entries de ON ts.entry_id = de.id
             WHERE ts.status = 'pending'
             ORDER BY ts.created_at DESC
             LIMIT 10`
        );
        res.json({ suggestions });
    } catch (err) {
        // If table doesn't exist yet (migration not run), return empty
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.json({ suggestions: [] });
        }
        console.error('Pending suggestions error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הצעות' });
    }
});

// PUT /api/dictionary/suggestions/:id/approve - Approve a suggestion (admin)
router.put('/suggestions/:id/approve', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;

        // Get suggestion
        const [suggestions] = await db.query('SELECT * FROM translation_suggestions WHERE id = ?', [id]);
        if (suggestions.length === 0) {
            return res.status(404).json({ error: 'הצעה לא נמצאה' });
        }
        const suggestion = suggestions[0];

        // Get dialect ID
        const [dialects] = await db.query('SELECT id FROM dialects WHERE name = ?', [suggestion.dialect]);
        const dialectId = dialects[0]?.id || 6;

        if (suggestion.translation_id) {
            // Update existing translation
            await db.query(
                `UPDATE translations SET hebrew = ?, latin = ?, cyrillic = ? WHERE id = ?`,
                [suggestion.suggested_hebrew, suggestion.suggested_latin, suggestion.suggested_cyrillic, suggestion.translation_id]
            );
        } else {
            // Add new translation
            await db.query(
                `INSERT INTO translations (entry_id, dialect_id, hebrew, latin, cyrillic) VALUES (?, ?, ?, ?, ?)`,
                [suggestion.entry_id, dialectId, suggestion.suggested_hebrew, suggestion.suggested_latin, suggestion.suggested_cyrillic]
            );
        }

        // Mark suggestion as approved
        await db.query(
            'UPDATE translation_suggestions SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            ['approved', req.user.id, id]
        );

        // Award XP to suggester
        await db.query('UPDATE users SET xp = xp + 50 WHERE id = ?', [suggestion.user_id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Approve suggestion error:', err);
        res.status(500).json({ error: 'שגיאה באישור הצעה' });
    }
});

// PUT /api/dictionary/suggestions/:id/reject - Reject a suggestion (admin)
router.put('/suggestions/:id/reject', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query(
            'UPDATE translation_suggestions SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            ['rejected', req.user.id, id]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Reject suggestion error:', err);
        res.status(500).json({ error: 'שגיאה בדחיית הצעה' });
    }
});

// POST /api/dictionary/entries/add-untranslated - Add word without translation (admin)
router.post('/entries/add-untranslated', authenticate, requireApprover, async (req, res) => {
    try {
        const { term, detectedLanguage, pronunciationGuide } = req.body;

        if (!term) {
            return res.status(400).json({ error: 'נדרש מונח' });
        }

        // Try with needs_translation column, fall back to without it if column doesn't exist
        try {
            const [result] = await db.query(
                `INSERT INTO dictionary_entries (term, detected_language, pronunciation_guide, source, status, needs_translation, contributor_id) 
                 VALUES (?, ?, ?, 'Manual', 'active', TRUE, ?)`,
                [term, detectedLanguage || 'Hebrew', pronunciationGuide || null, req.user.id]
            );
            res.json({ success: true, entryId: result.insertId });
        } catch (colErr) {
            // If needs_translation column doesn't exist, insert without it
            if (colErr.code === 'ER_BAD_FIELD_ERROR') {
                const [result] = await db.query(
                    `INSERT INTO dictionary_entries (term, detected_language, pronunciation_guide, source, status, contributor_id) 
                     VALUES (?, ?, ?, 'Manual', 'active', ?)`,
                    [term, detectedLanguage || 'Hebrew', pronunciationGuide || null, req.user.id]
                );
                res.json({ success: true, entryId: result.insertId, note: 'migration_needed' });
            } else {
                throw colErr;
            }
        }
    } catch (err) {
        console.error('Add untranslated error:', err);
        res.status(500).json({ error: 'שגיאה בהוספת מילה' });
    }
});

module.exports = router;

