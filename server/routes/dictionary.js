const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticate, requireApprover, optionalAuth } = require('../middleware/auth');
const { body, query: queryParam, param, validationResult } = require('express-validator');
const { normalizeHebrewScript } = require('../utils/normalization');
const { logEvent, getClientIp } = require('../utils/logEvent');

// Extract Hebrew stem by stripping common prefixes/suffixes
// e.g. "הצלחה" → "צלח", "להצליח" → "צליח", "מצליח" → "צליח"
function extractHebrewStems(term) {
    if (!term || term.length < 3) return [];
    const stems = new Set();
    const prefixes = ['הת', 'שה', 'וה', 'לה', 'מה', 'בה', 'כה', 'שמ', 'של', 'וב', 'ול', 'ומ', 'וש', 'שב', 'ה', 'ל', 'מ', 'ב', 'כ', 'ו', 'ש'];
    const suffixes = ['ות', 'ים', 'ון', 'ית', 'ת', 'ה', 'י', 'ן', 'ם'];

    const variants = [term];
    // Strip prefixes
    for (const p of prefixes) {
        if (term.startsWith(p) && term.length - p.length >= 2) {
            variants.push(term.slice(p.length));
        }
    }
    // For each variant, also strip suffixes
    for (const v of [...variants]) {
        for (const s of suffixes) {
            if (v.endsWith(s) && v.length - s.length >= 2) {
                variants.push(v.slice(0, -s.length));
            }
        }
    }
    // Only keep stems that are 2+ chars and different from original
    for (const v of variants) {
        if (v.length >= 2 && v !== term) {
            stems.add(v);
        }
    }
    return [...stems];
}

// Validation middleware helper
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

// GET /api/dictionary/search?q=term
router.get('/search', [
    queryParam('q').trim().notEmpty().withMessage('נדרש מונח לחיפוש')
        .isLength({ max: 200 }).withMessage('מונח החיפוש ארוך מדי'),
    validate
], async (req, res) => {
    try {
        const term = req.query.q.trim();

        // Search in active entries: term, hebrew (FULLTEXT), latin, cyrillic, russian
        const [entries] = await db.query(
            `SELECT de.*, u.name as contributor_name, a.name as approver_name,
                    SUM(COALESCE(t.upvotes, 0)) - SUM(COALESCE(t.downvotes, 0)) as community_score
             FROM dictionary_entries de
             LEFT JOIN users u ON de.contributor_id = u.id
             LEFT JOIN users a ON de.approved_by = a.id
             LEFT JOIN dialect_scripts t ON de.id = t.entry_id
             WHERE de.status = 'active'
               AND (de.hebrew_script LIKE ?
                    OR MATCH(de.hebrew_script) AGAINST(? IN BOOLEAN MODE)
                    OR de.hebrew_script LIKE ?
                    OR de.hebrew_short LIKE ?
                    OR t.latin_script LIKE ?
                    OR t.cyrillic_script LIKE ?
                    OR de.russian_short LIKE ?)
             GROUP BY de.id
             ORDER BY
                CASE
                  WHEN de.hebrew_script = ? THEN 0
                  WHEN de.hebrew_short = ? THEN 1
                  WHEN de.hebrew_script = ? THEN 1
                  WHEN t.latin_script = ? THEN 1
                  WHEN t.cyrillic_script = ? THEN 1
                  WHEN de.hebrew_short LIKE ? THEN 2
                  WHEN de.hebrew_script LIKE ? THEN 3
                  WHEN de.hebrew_script LIKE ? THEN 3
                  ELSE 4
                END,
                community_score DESC,
                de.created_at DESC
             LIMIT 10`,
            [`%${term}%`, `${term}*`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`,
             term, term, term, term, term, `${term}%`, `${term}%`, `${term}%`]
        );

        if (entries.length === 0) {
            // Try stem-based search: strip Hebrew prefixes/suffixes and search again
            const stems = extractHebrewStems(term);
            if (stems.length > 0) {
                const stemConditions = stems.map(() => '(de.hebrew_script LIKE ? OR de.hebrew_short LIKE ?)').join(' OR ');
                const stemParams = stems.flatMap(s => [`%${s}%`, `%${s}%`]);
                const [stemEntries] = await db.query(
                    `SELECT de.*, u.name as contributor_name, a.name as approver_name,
                            SUM(COALESCE(t.upvotes, 0)) - SUM(COALESCE(t.downvotes, 0)) as community_score
                     FROM dictionary_entries de
                     LEFT JOIN users u ON de.contributor_id = u.id
                     LEFT JOIN users a ON de.approved_by = a.id
                     LEFT JOIN dialect_scripts t ON de.id = t.entry_id
                     WHERE de.status = 'active'
                       AND (${stemConditions})
                     GROUP BY de.id
                     ORDER BY CHAR_LENGTH(de.hebrew_script), community_score DESC
                     LIMIT 10`,
                    stemParams
                );
                if (stemEntries.length > 0) {
                    entries.push(...stemEntries);
                }
            }
        }

        if (entries.length === 0) {
            return res.json({ found: false, entry: null });
        }

        // Get the best match (exact or first)
        const entry = entries[0];

        // Fetch all related data in parallel (5 queries at once instead of sequential)
        const [
            [dialectScripts],
            [examples],
            [fieldSourceRows],
            [pendingSuggestionRows]
        ] = await Promise.all([
            db.query(
                `SELECT t.*, COALESCE(d.name, '') as dialect
                 FROM dialect_scripts t
                 LEFT JOIN dialects d ON t.dialect_id = d.id
                 WHERE t.entry_id = ?`,
                [entry.id]
            ),
            db.query(
                'SELECT origin, translated, transliteration FROM examples WHERE entry_id = ?',
                [entry.id]
            ),
            db.query(
                'SELECT field_name, source_type FROM field_sources WHERE entry_id = ?',
                [entry.id]
            ),
            db.query(
                `SELECT id, field_name, suggested_hebrew_short, suggested_latin_script,
                        suggested_cyrillic_script, suggested_russian_short, reason,
                        user_id, created_at
                 FROM translation_suggestions
                 WHERE entry_id = ? AND status = 'pending'`,
                [entry.id]
            )
        ]);
        const fieldSources = {};
        for (const row of fieldSourceRows) {
            fieldSources[row.field_name] = row.source_type;
        }

        // Map pending suggestions to a per-field lookup
        const pendingSuggestions = pendingSuggestionRows.map(s => ({
            id: s.id,
            fieldName: s.field_name || (s.suggested_hebrew_short ? 'hebrewScript' : s.suggested_latin_script ? 'latinScript' : s.suggested_cyrillic_script ? 'cyrillicScript' : s.suggested_russian_short ? 'russianShort' : 'hebrewScript'),
            suggestedValue: s.suggested_hebrew_short || s.suggested_latin_script || s.suggested_cyrillic_script || s.suggested_russian_short || '',
            userId: s.user_id ? String(s.user_id) : undefined,
            createdAt: s.created_at,
            reason: s.reason,
        }));

        // Compute community signals
        const communityScore = dialectScripts.reduce((sum, t) => sum + (t.upvotes || 0) - (t.downvotes || 0), 0);
        const verificationLevel = entry.approved_by ? 'verified'
            : entry.source === 'קהילה' ? 'community'
            : entry.source === 'AI' ? 'ai'
            : 'unverified';

        const result = {
            id: String(entry.id),
            hebrewScript: entry.hebrew_script,
            detectedLanguage: entry.detected_language,
            sourceName: entry.source_name || null,
            hebrewShort: entry.hebrew_short || null,
            hebrewLong: entry.hebrew_long || null,
            russianShort: entry.russian_short || null,
            russianLong: entry.russian_long || null,
            englishShort: entry.english_short || null,
            englishLong: entry.english_long || null,
            dialectScripts: dialectScripts.map(t => ({
                id: t.id,
                dialect: t.dialect,
                hebrewScript: t.hebrew_script,
                latinScript: t.latin_script,
                cyrillicScript: t.cyrillic_script,
                pronunciationGuide: t.pronunciation_guide || null,
                upvotes: t.upvotes || 0,
                downvotes: t.downvotes || 0,
            })),
            examples,
            partOfSpeech: entry.part_of_speech,
            isCustom: true,
            source: entry.source,
            status: entry.status,
            fieldSources,
            pendingSuggestions,
            communityScore,
            verificationLevel,
        };

        // Also return additional matches for multi-result display (batched queries)
        const allResults = [result];
        const additionalEntries = entries.slice(1, 5);
        if (additionalEntries.length > 0) {
            const additionalIds = additionalEntries.map(e => e.id);
            const placeholders = additionalIds.map(() => '?').join(',');

            // Batch: get all dialect_scripts in 1 query instead of N
            const [allTrans] = await db.query(
                `SELECT t.*, COALESCE(d.name, '') as dialect
                 FROM dialect_scripts t LEFT JOIN dialects d ON t.dialect_id = d.id
                 WHERE t.entry_id IN (${placeholders})`, additionalIds
            );

            // Group by entry_id
            const transMap = {};
            for (const t of allTrans) {
                (transMap[t.entry_id] ||= []).push(t);
            }

            for (const e of additionalEntries) {
                const trans = transMap[e.id] || [];
                const score = trans.reduce((sum, t) => sum + (t.upvotes || 0) - (t.downvotes || 0), 0);
                const vLevel = e.approved_by ? 'verified'
                    : e.source === 'קהילה' ? 'community'
                    : e.source === 'AI' ? 'ai' : 'unverified';
                allResults.push({
                    id: String(e.id),
                    hebrewScript: e.hebrew_script,
                    detectedLanguage: e.detected_language,
                    sourceName: e.source_name || null,
                    hebrewShort: e.hebrew_short || null,
                    hebrewLong: e.hebrew_long || null,
                    russianShort: e.russian_short || null,
                    russianLong: e.russian_long || null,
                    englishShort: e.english_short || null,
                    englishLong: e.english_long || null,
                    dialectScripts: trans.map(t => ({
                        id: t.id, dialect: t.dialect, hebrewScript: t.hebrew_script,
                        latinScript: t.latin_script, cyrillicScript: t.cyrillic_script,
                        pronunciationGuide: t.pronunciation_guide || null,
                        upvotes: t.upvotes || 0, downvotes: t.downvotes || 0,
                    })),
                    examples: [],
                    partOfSpeech: e.part_of_speech,
                    isCustom: true,
                    source: e.source,
                    status: e.status,
                    communityScore: score,
                    verificationLevel: vLevel,
                });
            }
        }

        // Check for duplicates: entries sharing hebrew_script_normalized with other active entries
        const normalizedTerms = [...new Set(entries.map(e => e.hebrew_script_normalized).filter(Boolean))];
        let dupNormSet = new Set();
        if (normalizedTerms.length > 0) {
            const [dupRows] = await db.query(
                `SELECT hebrew_script_normalized FROM dictionary_entries
                 WHERE status = 'active' AND hebrew_script_normalized IN (${normalizedTerms.map(() => '?').join(',')})
                 GROUP BY hebrew_script_normalized HAVING COUNT(*) > 1`,
                normalizedTerms
            );
            dupNormSet = new Set(dupRows.map(r => r.hebrew_script_normalized));
        }

        // Add hasDuplicates flag to each result
        for (let i = 0; i < allResults.length; i++) {
            const e = entries[i < entries.length ? i : 0];
            allResults[i].hasDuplicates = dupNormSet.has(e?.hebrew_script_normalized);
        }

        res.json({ found: true, entry: result, results: allResults });
    } catch (err) {
        console.error('Search error:', err);
        res.status(500).json({ error: 'שגיאה בחיפוש' });
    }
});

// GET /api/dictionary/entry/:term - Get exact entry by term (for direct URL access)
router.get('/entry/:term', async (req, res) => {
    try {
        const term = decodeURIComponent(req.params.term).trim();
        if (!term) return res.status(400).json({ error: 'נדרש מונח' });

        const [entries] = await db.query(
            `SELECT de.*, u.name as contributor_name
             FROM dictionary_entries de
             LEFT JOIN users u ON de.contributor_id = u.id
             WHERE de.status = 'active' AND de.hebrew_script = ?
             LIMIT 1`,
            [term]
        );

        if (entries.length === 0) {
            return res.json({ found: false, entry: null });
        }

        const entry = entries[0];

        // Fetch all data in parallel (including word-page-specific data)
        const [
            [dialectScripts],
            [examples],
            [fieldSourceRows],
            [pendingSuggestionRows],
            [relatedRows],
            [likesData],
            [commentsData],
            [possibleDuplicateRows]
        ] = await Promise.all([
            db.query(
                `SELECT t.*, COALESCE(d.name, '') as dialect
                 FROM dialect_scripts t
                 LEFT JOIN dialects d ON t.dialect_id = d.id
                 WHERE t.entry_id = ?`,
                [entry.id]
            ),
            db.query('SELECT origin, translated, transliteration FROM examples WHERE entry_id = ?', [entry.id]),
            db.query('SELECT field_name, source_type FROM field_sources WHERE entry_id = ?', [entry.id]),
            db.query(
                `SELECT id, field_name, suggested_hebrew_short, suggested_latin_script,
                        suggested_cyrillic_script, suggested_russian_short, reason,
                        user_id, created_at
                 FROM translation_suggestions
                 WHERE entry_id = ? AND status = 'pending'`,
                [entry.id]
            ),
            db.query(
                `SELECT rw.relation_type, de.id, de.hebrew_script, de.part_of_speech,
                        de.hebrew_script as dialect_hebrew_script
                 FROM related_words rw
                 JOIN dictionary_entries de ON de.id = rw.related_entry_id
                 WHERE rw.entry_id = ? AND de.status = 'active'
                 LIMIT 10`,
                [entry.id]
            ),
            db.query('SELECT COUNT(*) as count FROM entry_likes WHERE entry_id = ?', [entry.id]),
            db.query('SELECT COUNT(*) as count FROM comments WHERE entry_id = ? AND status = ?', [entry.id, 'approved']),
            // Possible duplicates: entries with same normalized hebrew_script
            entry.hebrew_script_normalized
                ? db.query(
                    `SELECT de.id, de.hebrew_script,
                            de.hebrew_script as dialect_hebrew_script,
                            (SELECT t.latin_script FROM dialect_scripts t WHERE t.entry_id = de.id LIMIT 1) as latin_script
                     FROM dictionary_entries de
                     WHERE de.hebrew_script_normalized = ? AND de.id != ? AND de.status = 'active'
                     LIMIT 5`,
                    [entry.hebrew_script_normalized, entry.id]
                )
                : Promise.resolve([[]]),
        ]);

        // Track word view (non-blocking)
        db.query(
            `INSERT INTO word_views (entry_id, view_date, view_count)
             VALUES (?, CURDATE(), 1)
             ON DUPLICATE KEY UPDATE view_count = view_count + 1`,
            [entry.id]
        ).catch(() => {});

        const fieldSources = {};
        for (const row of fieldSourceRows) {
            fieldSources[row.field_name] = row.source_type;
        }

        const pendingSuggestions = pendingSuggestionRows.map(s => ({
            id: s.id,
            fieldName: s.field_name || (s.suggested_hebrew_short ? 'hebrewScript' : s.suggested_latin_script ? 'latinScript' : s.suggested_cyrillic_script ? 'cyrillicScript' : s.suggested_russian_short ? 'russianShort' : 'hebrewScript'),
            suggestedValue: s.suggested_hebrew_short || s.suggested_latin_script || s.suggested_cyrillic_script || s.suggested_russian_short || '',
            userId: s.user_id ? String(s.user_id) : undefined,
            createdAt: s.created_at,
            reason: s.reason,
        }));

        const communityScore = dialectScripts.reduce((sum, t) => sum + (t.upvotes || 0) - (t.downvotes || 0), 0);
        const verificationLevel = entry.approved_by ? 'verified'
            : entry.source === 'קהילה' ? 'community'
            : entry.source === 'AI' ? 'ai' : 'unverified';

        res.json({
            found: true,
            entry: {
                id: String(entry.id),
                hebrewScript: entry.hebrew_script,
                detectedLanguage: entry.detected_language,
                sourceName: entry.source_name || null,
                hebrewShort: entry.hebrew_short || null,
                hebrewLong: entry.hebrew_long || null,
                russianShort: entry.russian_short || null,
                russianLong: entry.russian_long || null,
                englishShort: entry.english_short || null,
                englishLong: entry.english_long || null,
                dialectScripts: dialectScripts.map(t => ({
                    id: t.id,
                    dialect: t.dialect,
                    hebrewScript: t.hebrew_script,
                    latinScript: t.latin_script,
                    cyrillicScript: t.cyrillic_script,
                    pronunciationGuide: t.pronunciation_guide || null,
                    upvotes: t.upvotes || 0,
                    downvotes: t.downvotes || 0,
                })),
                examples,
                partOfSpeech: entry.part_of_speech,
                isCustom: true,
                source: entry.source,
                fieldSources,
                pendingSuggestions,
                communityScore,
                verificationLevel,
                likesCount: likesData[0]?.count || 0,
                commentsCount: commentsData[0]?.count || 0,
                relatedWords: relatedRows.map(r => ({
                    id: String(r.id),
                    hebrewScript: r.hebrew_script,
                    dialectHebrewScript: r.dialect_hebrew_script,
                    partOfSpeech: r.part_of_speech,
                    relationType: r.relation_type,
                })),
                possibleDuplicates: possibleDuplicateRows.map(d => ({
                    id: String(d.id),
                    hebrewScript: d.hebrew_script,
                    dialectHebrewScript: d.dialect_hebrew_script,
                    latinScript: d.latin_script,
                })),
            }
        });
    } catch (err) {
        console.error('Entry lookup error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הערך' });
    }
});

// GET /api/dictionary/dialects - Get all dialects
router.get('/dialects', async (req, res) => {
    try {
        const [dialects] = await db.query('SELECT id, name, description FROM dialects ORDER BY name');
        res.json(dialects);
    } catch (err) {
        console.error('Get dialects error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת ניבים' });
    }
});

// GET /api/dictionary/word-of-day - Get deterministic word of the day
router.get('/word-of-day', async (req, res) => {
    try {
        // Get total count of active entries with Hebrew translation
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM dictionary_entries de
             JOIN dialect_scripts t ON de.id = t.entry_id
             WHERE de.status = 'active' AND de.hebrew_script IS NOT NULL AND TRIM(de.hebrew_script) != ''`
        );

        if (total === 0) {
            return res.json({ word: null });
        }

        // Calculate deterministic offset based on date
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - startOfYear) / 86400000);
        const offset = (dayOfYear + now.getFullYear()) % total;

        // Get the word at that offset
        const [entries] = await db.query(
            `SELECT de.id, de.hebrew_script, de.detected_language,
                    de.hebrew_short, de.english_short, de.russian_short,
                    de.hebrew_script as dialect_hebrew_script, t.latin_script, t.cyrillic_script,
                    t.pronunciation_guide, COALESCE(d.name, '') as dialect
             FROM dictionary_entries de
             JOIN dialect_scripts t ON de.id = t.entry_id
             LEFT JOIN dialects d ON t.dialect_id = d.id
             WHERE de.status = 'active' AND de.hebrew_script IS NOT NULL AND de.hebrew_script != ''
             ORDER BY de.id
             LIMIT 1 OFFSET ?`,
            [offset]
        );

        if (entries.length === 0) {
            return res.json({ word: null });
        }

        const entry = entries[0];
        res.json({
            word: {
                id: entry.id,
                hebrewScript: entry.hebrew_script,
                detectedLanguage: entry.detected_language,
                hebrewShort: entry.hebrew_short || null,
                englishShort: entry.english_short || null,
                russianShort: entry.russian_short || null,
                pronunciationGuide: entry.pronunciation_guide,
                dialectScripts: [{
                    dialect: entry.dialect,
                    hebrewScript: entry.dialect_hebrew_script,
                    latinScript: entry.latin_script,
                    cyrillicScript: entry.cyrillic_script
                }]
            }
        });
    } catch (err) {
        console.error('Word of day error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילה יומית' });
    }
});

// GET /api/dictionary/recent - Get recently added entries
router.get('/recent', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const [rows] = await db.query(
            `SELECT de.id, de.hebrew_script, de.detected_language, de.created_at,
                    de.hebrew_short, de.english_short, de.russian_short,
                    de.hebrew_script as t_hebrew_script, t.latin_script, t.cyrillic_script
             FROM dictionary_entries de
             LEFT JOIN dialect_scripts t ON de.id = t.entry_id
             WHERE de.status = 'active'
             GROUP BY de.id
             ORDER BY de.created_at DESC
             LIMIT ?`,
            [limit]
        );

        const entries = rows.map(e => ({
            id: e.id,
            hebrewScript: e.hebrew_script || e.t_hebrew_script,
            detectedLanguage: e.detected_language,
            createdAt: e.created_at,
            hebrewShort: e.hebrew_short || e.t_hebrew_script,
            englishShort: e.english_short || null,
            russianShort: e.russian_short || null,
            latinScript: e.latin_script || null,
            cyrillicScript: e.cyrillic_script || null,
        }));

        res.json({ entries });
    } catch (err) {
        console.error('Recent entries error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים אחרונות' });
    }
});

// GET /api/dictionary/community-activity - Get recent community activity from system_logs
router.get('/community-activity', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;

        const [activities] = await db.query(
            `SELECT sl.event_type, sl.description, sl.user_name, sl.created_at, sl.metadata
             FROM system_logs sl
             WHERE sl.event_type IN ('ENTRY_ADDED', 'ENTRY_APPROVED', 'USER_REGISTER')
             ORDER BY sl.created_at DESC
             LIMIT ?`,
            [limit]
        );

        res.json({ activities });
    } catch (err) {
        console.error('Community activity error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת פעילות קהילתית' });
    }
});

// GET /api/dictionary/entries - Get entries with pagination (admin)
router.get('/entries', authenticate, requireApprover, async (req, res) => {
    try {
        const { status, search } = req.query;
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;

        // Build WHERE clause
        const conditions = [];
        const params = [];

        if (status) {
            conditions.push('de.status = ?');
            params.push(status);
        }

        if (search && search.trim()) {
            conditions.push('(de.hebrew_script LIKE ?)');
            params.push(`%${search.trim()}%`);
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        // Count total
        const [[{ total }]] = await db.query(
            `SELECT COUNT(DISTINCT de.id) as total
             FROM dictionary_entries de
             LEFT JOIN dialect_scripts t_search ON de.id = t_search.entry_id
             ${whereClause}`,
            params
        );

        // Get page of entries with their first dialect_script (single JOIN instead of N+1)
        const [entries] = await db.query(
            `SELECT de.id, de.hebrew_script, de.detected_language,
                    de.hebrew_short, de.hebrew_long, de.russian_short, de.russian_long,
                    de.english_short, de.english_long,
                    de.part_of_speech, de.source, de.source_name, de.status, de.created_at,
                    u.name as contributor_name,
                    t.id as trans_id, de.hebrew_script as dialect_hebrew_script, t.latin_script, t.cyrillic_script,
                    t.pronunciation_guide,
                    COALESCE(d.name, '') as dialect
             FROM dictionary_entries de
             LEFT JOIN users u ON de.contributor_id = u.id
             LEFT JOIN dialect_scripts t ON de.id = t.entry_id
             LEFT JOIN dialect_scripts t_search ON de.id = t_search.entry_id
             LEFT JOIN dialects d ON t.dialect_id = d.id
             ${whereClause}
             GROUP BY de.id
             ORDER BY de.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Map to response format
        const result = entries.map(e => {
            const obj = {
                id: String(e.id),
                hebrewScript: e.hebrew_script,
                detectedLanguage: e.detected_language,
                hebrewShort: e.hebrew_short || null,
                hebrewLong: e.hebrew_long || null,
                russianShort: e.russian_short || null,
                russianLong: e.russian_long || null,
                englishShort: e.english_short || null,
                englishLong: e.english_long || null,
                pronunciationGuide: e.pronunciation_guide || null,
                partOfSpeech: e.part_of_speech,
                source: e.source,
                status: e.status,
                dialectScripts: [{
                    id: e.trans_id,
                    dialect: e.dialect,
                    hebrewScript: e.dialect_hebrew_script || '',
                    latinScript: e.latin_script || '',
                    cyrillicScript: e.cyrillic_script || '',
                }],
            };
            obj.sourceName = e.source_name || '';
            obj.contributorName = e.contributor_name || '';
            return obj;
        });

        res.json({ entries: result, total, page, limit, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error('Get entries error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים' });
    }
});

// POST /api/dictionary/entries - Add new entry
router.post('/entries', optionalAuth, [
    body('term').trim().notEmpty().withMessage('נדרש מונח')
        .isLength({ max: 200 }).withMessage('המונח ארוך מדי'),
    body('translation').trim().notEmpty().withMessage('נדרש תרגום')
        .isLength({ max: 500 }).withMessage('התרגום ארוך מדי'),
    body('notes').optional().trim().isLength({ max: 1000 }),
    body('dialect').optional().trim().isLength({ max: 50 }),
    validate
], async (req, res) => {
    try {
        const { term, translation, dialect, notes, detectedLanguage } = req.body;

        // Status based on user role
        const status = req.user?.role === 'admin' || req.user?.role === 'approver' ? 'active' : 'pending';

        // Insert entry
        const [result] = await db.query(
            `INSERT INTO dictionary_entries
             (hebrew_script, hebrew_script_normalized, detected_language, hebrew_long, source, status, contributor_id)
             VALUES (?, ?, ?, ?, 'User', ?, ?)`,
            [term, normalizeHebrewScript(term), detectedLanguage || 'Hebrew', notes || null, status, req.user?.id || null]
        );

        const entryId = result.insertId;

        // Get dialect ID
        let dialectId = 6; // Default to General
        const [dialects] = await db.query('SELECT id FROM dialects WHERE name = ?', [dialect || 'General']);
        if (dialects.length > 0) {
            dialectId = dialects[0].id;
        }

        // Insert dialect_script
        await db.query(
            `INSERT INTO dialect_scripts (entry_id, dialect_id, hebrew_script, latin_script) VALUES (?, ?, ?, ?)`,
            [entryId, dialectId, translation, '']
        );

        // Update contributor count
        if (req.user?.id) {
            await db.query(
                'UPDATE users SET contributions_count = contributions_count + 1, xp = xp + 50 WHERE id = ?',
                [req.user.id]
            );
        }

        // Log event
        await logEvent(
            'ENTRY_ADDED',
            status === 'pending' ? `הוצעה מילה חדשה: ${term}` : `נוספה מילה למאגר: ${term}`,
            req.user || { id: null, name: 'אורח' },
            { term, entryId, status },
            req
        );

        statsCache = { data: null, expiry: 0 };
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
                 (hebrew_script, hebrew_script_normalized, detected_language, source, source_name, status, contributor_id, approved_by, approved_at)
                 VALUES (?, ?, ?, ?, ?, 'active', ?, ?, NOW())
                 ON DUPLICATE KEY UPDATE hebrew_script = hebrew_script`,
                [
                    entry.term,
                    normalizeHebrewScript(entry.term),
                    entry.detectedLanguage || 'Hebrew',
                    entry.source || 'מאגר',
                    entry.sourceName || null,
                    req.user.id,
                    req.user.id
                ]
            );

            // ON DUPLICATE KEY UPDATE sets insertId=0 and affectedRows=0,
            // so we need to look up the existing entry's ID
            let entryId = result.insertId;
            if (!entryId) {
                const [existing] = await db.query('SELECT id FROM dictionary_entries WHERE hebrew_script = ?', [entry.term]);
                if (existing.length === 0) continue;
                entryId = existing[0].id;
            }

            // Insert dialect_scripts
            if (entry.translations) {
                for (const t of entry.translations) {
                    const [dialects] = await db.query('SELECT id FROM dialects WHERE name = ?', [t.dialect || 'General']);
                    const dialectId = dialects[0]?.id || 6;

                    await db.query(
                        `INSERT INTO dialect_scripts (entry_id, dialect_id, hebrew_script, latin_script, cyrillic_script) VALUES (?, ?, ?, ?, ?)`,
                        [entryId, dialectId, t.hebrew || '', t.latin || '', t.cyrillic || '']
                    );
                }
            }

            // Insert hebrew_long if definitions provided
            if (entry.definitions && entry.definitions.length > 0) {
                await db.query('UPDATE dictionary_entries SET hebrew_long = ? WHERE id = ?', [entry.definitions.join('\n'), entryId]);
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

        statsCache = { data: null, expiry: 0 };

        await logEvent('ENTRIES_BATCH_ADDED', `נוספו ${addedCount} מילים בקבוצה`, req.user, { addedCount, totalRequested: entries.length }, req);

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
             WHERE hebrew_script = ?`,
            [req.user.id, term]
        );

        await logEvent('ENTRY_APPROVED', `אושרה מילה: ${term}`, req.user, { term }, req);

        statsCache = { data: null, expiry: 0 };
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
        const [entries] = await db.query('SELECT * FROM dictionary_entries WHERE hebrew_script = ?', [term]);
        const entry = entries[0];

        if (!entry) {
            return res.status(404).json({ error: 'מילה לא נמצאה' });
        }

        await db.query('DELETE FROM dictionary_entries WHERE hebrew_script = ?', [term]);

        const eventType = entry.status === 'pending' ? 'ENTRY_REJECTED' : 'ENTRY_DELETED';
        const description = entry.status === 'pending' ? `נדחתה הצעה למילה: ${term}` : `נמחקה מילה מהמאגר: ${term}`;

        await logEvent(eventType, description, req.user, { term }, req);

        statsCache = { data: null, expiry: 0 };
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
router.post('/entries/:id/comments', authenticate, [
    param('id').isInt().withMessage('מזהה לא חוקי'),
    body('content').trim().notEmpty().withMessage('Comment cannot be empty')
        .isLength({ max: 2000 }).withMessage('Comment too long'),
    validate
], async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

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
// (single implementation below, after PUT /translations/:id)

// PUT /api/dictionary/translations/:id - Update translation (admin direct edit)
router.put('/translations/:id', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;
        const { hebrewScript, latinScript, cyrillicScript, dialectId, pronunciationGuide } = req.body;

        const updates = [];
        const values = [];

        if (hebrewScript !== undefined) {
            updates.push('hebrew_script = ?');
            values.push(hebrewScript);
        }

        if (latinScript !== undefined) {
            updates.push('latin_script = ?');
            values.push(latinScript);
        }
        if (cyrillicScript !== undefined) {
            updates.push('cyrillic_script = ?');
            values.push(cyrillicScript);
        }
        if (pronunciationGuide !== undefined) {
            updates.push('pronunciation_guide = ?');
            values.push(pronunciationGuide);
        }
        if (dialectId !== undefined) {
            updates.push('dialect_id = ?');
            values.push(dialectId);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'לא סופקו שדות לעדכון' });
        }

        values.push(id);

        await db.query(
            `UPDATE dialect_scripts SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        await logEvent('TRANSLATION_UPDATED', `עודכן תרגום #${id}`, req.user, { translationId: id, fields: Object.keys(req.body).filter(k => k !== 'id') }, req);

        res.json({ success: true });
    } catch (err) {
        console.error('Update translation error:', err);
        res.status(500).json({ error: 'שגיאה בעדכון תרגום' });
    }
});

// POST /api/dictionary/translations/:id/vote - Vote on a translation
router.post('/translations/:id/vote', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body; // 'up', 'down', or null (remove vote)
        const userId = req.user.id;

        // Check for existing vote
        const [existingVotes] = await db.query(
            'SELECT id, vote_type FROM translation_votes WHERE translation_id = ? AND user_id = ?',
            [id, userId]
        );

        const existingVote = existingVotes[0];

        if (voteType === null) {
            // Remove vote
            if (existingVote) {
                await db.query('DELETE FROM translation_votes WHERE id = ?', [existingVote.id]);
                // Update counts
                const countField = existingVote.vote_type === 'up' ? 'upvotes' : 'downvotes';
                await db.query(`UPDATE dialect_scripts SET ${countField} = GREATEST(${countField} - 1, 0) WHERE id = ?`, [id]);
            }
        } else if (existingVote) {
            // Update existing vote
            if (existingVote.vote_type !== voteType) {
                await db.query('UPDATE translation_votes SET vote_type = ? WHERE id = ?', [voteType, existingVote.id]);
                // Update counts: decrement old, increment new
                const oldField = existingVote.vote_type === 'up' ? 'upvotes' : 'downvotes';
                const newField = voteType === 'up' ? 'upvotes' : 'downvotes';
                await db.query(`UPDATE dialect_scripts SET ${oldField} = GREATEST(${oldField} - 1, 0), ${newField} = ${newField} + 1 WHERE id = ?`, [id]);
            }
        } else {
            // Insert new vote
            await db.query(
                'INSERT INTO translation_votes (translation_id, user_id, vote_type) VALUES (?, ?, ?)',
                [id, userId, voteType]
            );
            // Update counts
            const countField = voteType === 'up' ? 'upvotes' : 'downvotes';
            await db.query(`UPDATE dialect_scripts SET ${countField} = ${countField} + 1 WHERE id = ?`, [id]);
        }

        // Award XP for first vote on this translation
        if (!existingVote && voteType) {
            await db.query('UPDATE users SET xp = xp + 2 WHERE id = ?', [userId]);
        }

        // Auto-flag translation if net score drops below -3
        if (voteType === 'down') {
            const [[scoreRow]] = await db.query(
                `SELECT SUM(CASE WHEN vote_type = 'up' THEN 1 ELSE -1 END) as score
                 FROM translation_votes WHERE translation_id = ?`,
                [id]
            );
            if (scoreRow?.score <= -3) {
                await db.query('UPDATE dialect_scripts SET flagged = TRUE WHERE id = ?', [id]);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Vote error:', err);
        res.status(500).json({ error: 'שגיאה בהצבעה' });
    }
});

// POST /api/dictionary/entries/:id/confirm-ai-field - Confirm an AI-generated field value into DB
router.post('/entries/:id/confirm-ai-field', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { fieldName, value } = req.body;

        if (!fieldName || !value?.trim()) {
            return res.status(400).json({ error: 'נדרש שם שדה וערך' });
        }

        const allowedFields = ['hebrewScript', 'latinScript', 'cyrillicScript', 'russianShort', 'hebrewLong', 'pronunciationGuide', 'examples'];
        if (!allowedFields.includes(fieldName)) {
            return res.status(400).json({ error: 'שדה לא חוקי' });
        }

        // Verify entry exists
        const [entryRows] = await db.query('SELECT id FROM dictionary_entries WHERE id = ?', [id]);
        if (entryRows.length === 0) return res.status(404).json({ error: 'ערך לא נמצא' });

        // Save the AI value to the appropriate table
        const dsFieldMap = { hebrewScript: 'hebrew_script', latinScript: 'latin_script', cyrillicScript: 'cyrillic_script' };
        if (dsFieldMap[fieldName]) {
            await db.query(
                `UPDATE dialect_scripts SET ${dsFieldMap[fieldName]} = ? WHERE entry_id = ? LIMIT 1`,
                [value.trim(), id]
            );
        } else if (fieldName === 'russianShort') {
            await db.query('UPDATE dictionary_entries SET russian_short = ? WHERE id = ?', [value.trim(), id]);
        } else if (fieldName === 'hebrewLong') {
            await db.query('UPDATE dictionary_entries SET hebrew_long = ? WHERE id = ?', [value.trim(), id]);
        } else if (fieldName === 'pronunciationGuide') {
            await db.query('UPDATE dialect_scripts SET pronunciation_guide = ? WHERE entry_id = ? LIMIT 1', [value.trim(), id]);
        }
        // For examples - they're complex objects, skip DB save for now (they remain AI-only in response)

        // Update field_sources to 'community' (confirmed by user)
        await db.query(
            `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, ?, 'community')
             ON DUPLICATE KEY UPDATE source_type = 'community'`,
            [id, fieldName]
        );

        // Award XP
        if (req.user?.id) {
            await db.query('UPDATE users SET xp = xp + 10 WHERE id = ?', [req.user.id]);
        }

        res.json({ success: true, message: 'השדה אושר ונשמר. תודה!' });
    } catch (err) {
        console.error('Confirm AI field error:', err);
        res.status(500).json({ error: 'שגיאה באישור שדה' });
    }
});

// POST /api/dictionary/entries/:id/suggest-field - Submit per-field suggestion
router.post('/entries/:id/suggest-field', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { fieldName, currentValue, suggestedValue, reason } = req.body;

        if (!fieldName || !suggestedValue?.trim()) {
            return res.status(400).json({ error: 'נדרש שם שדה וערך מוצע' });
        }

        const allowedFields = ['hebrewScript', 'latinScript', 'cyrillicScript', 'russianShort', 'hebrewLong', 'pronunciationGuide', 'partOfSpeech', 'dialect'];
        if (!allowedFields.includes(fieldName)) {
            return res.status(400).json({ error: 'שדה לא חוקי' });
        }

        // Get entry and its existing dialect
        const [entryRows] = await db.query(
            `SELECT de.hebrew_script, COALESCE(d.name, 'General') as dialect_name
             FROM dictionary_entries de
             LEFT JOIN dialect_scripts t ON de.id = t.entry_id
             LEFT JOIN dialects d ON t.dialect_id = d.id
             WHERE de.id = ?
             LIMIT 1`,
            [id]
        );
        if (entryRows.length === 0) return res.status(404).json({ error: 'ערך לא נמצא' });

        const dialect = req.body.dialect || entryRows[0].dialect_name || 'General';

        await db.query(
            `INSERT INTO translation_suggestions
             (entry_id, user_id, user_name, dialect, field_name, suggested_hebrew_short, suggested_latin_script, suggested_cyrillic_script, suggested_russian_short, reason, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
            [
                id,
                req.user?.id || null,
                req.user?.name || 'אורח',
                dialect,
                fieldName,
                fieldName === 'hebrewScript' ? suggestedValue.trim() : (currentValue || ''),
                fieldName === 'latinScript' ? suggestedValue.trim() : '',
                fieldName === 'cyrillicScript' ? suggestedValue.trim() : '',
                fieldName === 'russianShort' ? suggestedValue.trim() : '',
                reason || `תיקון שדה ${fieldName}: "${currentValue || ''}" → "${suggestedValue.trim()}"`,
            ]
        );

        // Award XP
        if (req.user?.id) {
            await db.query('UPDATE users SET xp = xp + 15 WHERE id = ?', [req.user.id]);
        }

        res.json({ success: true, message: 'ההצעה נשלחה לאישור. תודה!' });
    } catch (err) {
        console.error('Suggest field error:', err);
        res.status(500).json({ error: 'שגיאה בשליחת הצעה' });
    }
});

// POST /api/dictionary/entries/:id/suggest - Submit translation suggestion
// Support both JSON and FormData (with audio upload)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists for suggestion audio
const suggestionAudioDir = path.join(__dirname, '../../public/uploads/suggestion-audio');
if (!fs.existsSync(suggestionAudioDir)) {
    fs.mkdirSync(suggestionAudioDir, { recursive: true });
}

const suggestionAudioStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, suggestionAudioDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.webm';
        cb(null, `suggestion-${uniqueSuffix}${ext}`);
    }
});

const suggestionAudioUpload = multer({
    storage: suggestionAudioStorage,
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

router.post('/entries/:id/suggest', authenticate, suggestionAudioUpload.single('audio'), [
    param('id').isInt().withMessage('מזהה לא חוקי'),
    body('hebrew').trim().notEmpty().withMessage('נדרש תרגום')
        .isLength({ max: 500 }).withMessage('התרגום ארוך מדי'),
    body('dialect').trim().notEmpty().withMessage('נדרש ניב')
        .isLength({ max: 50 }),
    body('latin').optional().trim().isLength({ max: 500 }),
    body('cyrillic').optional().trim().isLength({ max: 500 }),
    body('reason').optional().trim().isLength({ max: 1000 }),
    validate
], async (req, res) => {
    try {
        const { id } = req.params;
        const { translationId, dialect, hebrew, latin, cyrillic, reason, audioDuration } = req.body;

        // Handle audio file if uploaded
        let audioUrl = null;
        if (req.file) {
            audioUrl = `/uploads/suggestion-audio/${req.file.filename}`;
        }

        await db.query(
            `INSERT INTO translation_suggestions
             (entry_id, translation_id, user_id, user_name, dialect, suggested_hebrew_short, suggested_latin_script, suggested_cyrillic_script, reason, audio_url, audio_duration)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, translationId || null, req.user.id, req.user.name, dialect, hebrew, latin || '', cyrillic || '', reason || '', audioUrl, audioDuration || null]
        );

        // Award XP for contribution (extra for audio)
        const xpAmount = audioUrl ? 30 : 20;
        await db.query('UPDATE users SET xp = xp + ? WHERE id = ?', [xpAmount, req.user.id]);

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
            `SELECT de.id, de.hebrew_script, de.detected_language
             FROM dictionary_entries de
             LEFT JOIN dialect_scripts t ON de.id = t.entry_id
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
        const limit = parseInt(req.query.limit) || 5;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search?.trim();

        // Get all dialects
        const [allDialects] = await db.query('SELECT id, name FROM dialects');
        const dialectIds = allDialects.map(d => d.id);

        const searchCondition = search ? 'AND de.hebrew_script LIKE ?' : '';
        const searchParams = search ? [`%${search}%`] : [];

        // Find entries that don't have all dialects
        const [entries] = await db.query(
            `SELECT de.id, de.hebrew_script, de.detected_language,
                    GROUP_CONCAT(DISTINCT d.name) as existing_dialects,
                    COUNT(DISTINCT t.dialect_id) as dialect_count
             FROM dictionary_entries de
             JOIN dialect_scripts t ON de.id = t.entry_id
             JOIN dialects d ON t.dialect_id = d.id
             WHERE de.status = 'active'
             ${searchCondition}
             GROUP BY de.id
             HAVING dialect_count < ?
             LIMIT ? OFFSET ?`,
            [...searchParams, dialectIds.length, limit, offset]
        );

        // Get total count
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) as total FROM (
                SELECT de.id, COUNT(DISTINCT t.dialect_id) as dialect_count
                FROM dictionary_entries de
                JOIN dialect_scripts t ON de.id = t.entry_id
                WHERE de.status = 'active'
                ${searchCondition}
                GROUP BY de.id
                HAVING dialect_count < ?
            ) sub`,
            [...searchParams, dialectIds.length]
        );

        // Calculate missing dialects for each
        const result = entries.map(e => {
            const existing = (e.existing_dialects || '').split(',');
            const missing = allDialects.filter(d => !existing.includes(d.name)).map(d => d.name);
            return {
                id: e.id,
                hebrewScript: e.hebrew_script,
                detectedLanguage: e.detected_language,
                existingDialects: existing,
                missingDialects: missing
            };
        });

        res.json({ entries: result, total });
    } catch (err) {
        console.error('Missing dialects error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים' });
    }
});

// Stats cache (refreshed every 2 minutes)
let statsCache = { data: null, expiry: 0 };
const STATS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// GET /api/dictionary/stats - Get counts for all categories (for dashboard widgets)
router.get('/stats', async (req, res) => {
    try {
        const now = Date.now();
        if (statsCache.data && now < statsCache.expiry) {
            return res.json(statsCache.data);
        }

        // Run all count queries in parallel
        const [
            [[hebrewOnly]],
            [[juhuriOnly]],
            [[{ dialectCount }]],
            [[totalActive]],
            [[recentEntries]]
        ] = await Promise.all([
            db.query(`
                SELECT COUNT(DISTINCT de.id) as count FROM dictionary_entries de
                JOIN dialect_scripts t ON de.id = t.entry_id
                WHERE de.status = 'active'
                AND de.hebrew_script IS NOT NULL AND de.hebrew_script != ''
                AND (t.latin_script IS NULL OR t.latin_script = '')
            `),
            db.query(`
                SELECT COUNT(DISTINCT de.id) as count FROM dictionary_entries de
                JOIN dialect_scripts t ON de.id = t.entry_id
                WHERE de.status = 'active'
                AND de.detected_language = 'Juhuri'
                AND (de.hebrew_script IS NULL OR de.hebrew_script = '')
            `),
            db.query('SELECT COUNT(*) as dialectCount FROM dialects'),
            db.query(`SELECT COUNT(*) as count FROM dictionary_entries WHERE status = 'active'`),
            db.query(`
                SELECT COUNT(*) as count FROM dictionary_entries
                WHERE status = 'active' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            `)
        ]);

        // Missing dialects (depends on dialectCount result)
        const [[missingDialects]] = await db.query(`
            SELECT COUNT(*) as count FROM (
                SELECT de.id, COUNT(DISTINCT t.dialect_id) as dialect_count
                FROM dictionary_entries de
                JOIN dialect_scripts t ON de.id = t.entry_id
                WHERE de.status = 'active'
                GROUP BY de.id
                HAVING dialect_count < ?
            ) sub
        `, [dialectCount]);

        // Missing audio count
        const [[missingAudio]] = await db.query(`
            SELECT COUNT(DISTINCT de.id) as count FROM dictionary_entries de
            JOIN dialect_scripts ds ON de.id = ds.entry_id
            WHERE de.status = 'active'
            AND (ds.pronunciation_guide IS NOT NULL AND ds.pronunciation_guide != '')
        `);

        // Pending suggestions
        let pendingCount = 0;
        try {
            const [[pending]] = await db.query(`
                SELECT COUNT(*) as count FROM translation_suggestions WHERE status = 'pending'
            `);
            pendingCount = pending.count;
        } catch (err) {
            // Table might not exist
        }

        const data = {
            hebrewOnlyCount: hebrewOnly.count,
            juhuriOnlyCount: juhuriOnly.count,
            missingDialectsCount: missingDialects.count,
            missingAudioCount: missingAudio.count,
            totalActiveCount: totalActive.count,
            recentCount: recentEntries.count,
            pendingCount
        };

        statsCache = { data, expiry: now + STATS_CACHE_TTL };
        res.json(data);
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת סטטיסטיקות' });
    }
});

// GET /api/dictionary/hebrew-only - Words with Hebrew but missing Juhuri/Latin
router.get('/hebrew-only', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search?.trim();

        const searchCondition = search ? 'AND (de.hebrew_script LIKE ?)' : '';
        const searchParams = search ? [`%${search}%`] : [];

        const [entries] = await db.query(`
            SELECT de.id, de.hebrew_script, de.detected_language, de.hebrew_script as dialect_hebrew_script
            FROM dictionary_entries de
            JOIN dialect_scripts t ON de.id = t.entry_id
            WHERE de.status = 'active'
            AND de.hebrew_script IS NOT NULL AND de.hebrew_script != ''
            AND (t.latin_script IS NULL OR t.latin_script = '')
            ${searchCondition}
            GROUP BY de.id
            ORDER BY de.created_at DESC
            LIMIT ? OFFSET ?
        `, [...searchParams, limit, offset]);

        const [[{ total }]] = await db.query(`
            SELECT COUNT(DISTINCT de.id) as total FROM dictionary_entries de
            JOIN dialect_scripts t ON de.id = t.entry_id
            WHERE de.status = 'active'
            AND de.hebrew_script IS NOT NULL AND de.hebrew_script != ''
            AND (t.latin_script IS NULL OR t.latin_script = '')
            ${searchCondition}
        `, searchParams);

        res.json({ entries, total });
    } catch (err) {
        console.error('Hebrew-only error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים' });
    }
});

// GET /api/dictionary/juhuri-only - Words with Juhuri but missing Hebrew
router.get('/juhuri-only', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search?.trim();

        const searchCondition = search ? 'AND (de.hebrew_script LIKE ? OR t.latin_script LIKE ?)' : '';
        const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

        const [entries] = await db.query(`
            SELECT de.id, de.hebrew_script, de.detected_language, t.latin_script, t.cyrillic_script
            FROM dictionary_entries de
            JOIN dialect_scripts t ON de.id = t.entry_id
            WHERE de.status = 'active'
            AND de.detected_language = 'Juhuri'
            AND (de.hebrew_script IS NULL OR de.hebrew_script = '')
            ${searchCondition}
            GROUP BY de.id
            ORDER BY de.created_at DESC
            LIMIT ? OFFSET ?
        `, [...searchParams, limit, offset]);

        const [[{ total }]] = await db.query(`
            SELECT COUNT(DISTINCT de.id) as total FROM dictionary_entries de
            JOIN dialect_scripts t ON de.id = t.entry_id
            WHERE de.status = 'active'
            AND de.detected_language = 'Juhuri'
            AND (de.hebrew_script IS NULL OR de.hebrew_script = '')
            ${searchCondition}
        `, searchParams);

        res.json({ entries, total });
    } catch (err) {
        console.error('Juhuri-only error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים' });
    }
});

// GET /api/dictionary/missing-audio - Words without audio recordings
router.get('/missing-audio', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search?.trim();

        const searchCondition = search ? 'AND (de.hebrew_script LIKE ?)' : '';
        const searchParams = search ? [`%${search}%`] : [];

        // Only return entries that have a pronunciation_guide in dialect_scripts but no audio file path,
        // prioritizing entries with Hebrew translations (more useful to record)
        const [entries] = await db.query(`
            SELECT de.id, de.hebrew_script, de.detected_language, de.hebrew_script as dialect_hebrew_script, t.latin_script
            FROM dictionary_entries de
            LEFT JOIN dialect_scripts t ON de.id = t.entry_id
            WHERE de.status = 'active'
              AND (t.pronunciation_guide IS NOT NULL AND t.pronunciation_guide != '')
              ${searchCondition}
            GROUP BY de.id
            ORDER BY CASE WHEN de.hebrew_script IS NOT NULL AND de.hebrew_script != '' THEN 0 ELSE 1 END, de.created_at DESC
            LIMIT ? OFFSET ?
        `, [...searchParams, limit, offset]);

        const [[{ total }]] = await db.query(`
            SELECT COUNT(DISTINCT de.id) as total
            FROM dictionary_entries de
            LEFT JOIN dialect_scripts t ON de.id = t.entry_id
            WHERE de.status = 'active'
              AND (t.pronunciation_guide IS NOT NULL AND t.pronunciation_guide != '')
              ${searchCondition}
        `, searchParams);

        res.json({ entries, total });
    } catch (err) {
        console.error('Missing audio error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מילים' });
    }
});

// field_sources uses camelCase field names: latinScript, cyrillicScript, hebrewShort, etc.
const SCRIPT_TO_FS_FIELD = { hebrew: 'hebrewScript', latin: 'latinScript', cyrillic: 'cyrillicScript' };
const LANG_TO_FS_FIELD = { he: 'hebrewShort', en: 'englishShort', ru: 'russianShort' };

// GET /api/dictionary/missing-script - Entries missing or AI-sourced for a specific script
router.get('/missing-script', async (req, res) => {
    try {
        const type = req.query.type; // hebrew, latin, cyrillic
        if (!['hebrew', 'latin', 'cyrillic'].includes(type)) {
            return res.status(400).json({ error: 'Invalid type. Use: hebrew, latin, cyrillic' });
        }

        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search?.trim();

        const scriptCol = `${type}_script`;
        const scriptTbl = type === 'hebrew' ? 'de' : 't';
        const fsField = SCRIPT_TO_FS_FIELD[type];
        const otherScripts = ['hebrew', 'latin', 'cyrillic'].filter(s => s !== type);
        const hasOtherCondition = otherScripts.map(s => {
            const tbl = s === 'hebrew' ? 'de' : 't';
            return `(${tbl}.${s}_script IS NOT NULL AND ${tbl}.${s}_script != '')`;
        }).join(' OR ');

        const searchCondition = search ? 'AND (de.hebrew_script LIKE ? OR t.latin_script LIKE ?)' : '';
        const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

        // Include entries where the field is empty OR was AI-generated
        const [entries] = await db.query(`
            SELECT de.id, de.hebrew_script, de.detected_language,
                   de.hebrew_script as dialect_hebrew_script, t.latin_script, t.cyrillic_script,
                   fs.source_type as ai_source
            FROM dictionary_entries de
            JOIN dialect_scripts t ON de.id = t.entry_id
            LEFT JOIN field_sources fs ON fs.entry_id = de.id AND fs.field_name = ? AND fs.source_type = 'ai'
            WHERE de.status = 'active'
            AND (
                (${scriptTbl}.${scriptCol} IS NULL OR ${scriptTbl}.${scriptCol} = '')
                OR fs.id IS NOT NULL
            )
            AND (${hasOtherCondition})
            ${searchCondition}
            GROUP BY de.id
            ORDER BY CASE WHEN fs.id IS NOT NULL AND ${scriptTbl}.${scriptCol} IS NOT NULL AND ${scriptTbl}.${scriptCol} != '' THEN 1 ELSE 0 END,
                     de.created_at DESC
            LIMIT ? OFFSET ?
        `, [fsField, ...searchParams, limit, offset]);

        const [[{ total }]] = await db.query(`
            SELECT COUNT(DISTINCT de.id) as total FROM dictionary_entries de
            JOIN dialect_scripts t ON de.id = t.entry_id
            LEFT JOIN field_sources fs ON fs.entry_id = de.id AND fs.field_name = ? AND fs.source_type = 'ai'
            WHERE de.status = 'active'
            AND (
                (${scriptTbl}.${scriptCol} IS NULL OR ${scriptTbl}.${scriptCol} = '')
                OR fs.id IS NOT NULL
            )
            AND (${hasOtherCondition})
            ${searchCondition}
        `, [fsField, ...searchParams]);

        const mapped = entries.map(e => ({
            id: e.id,
            term: e.dialect_hebrew_script || e.latin_script || e.cyrillic_script || e.hebrew_script || '',
            hebrew: e.dialect_hebrew_script || null,
            latin: e.latin_script || null,
            cyrillic: e.cyrillic_script || null,
            isAi: !!e.ai_source,
        }));

        res.json({ entries: mapped, total });
    } catch (err) {
        console.error('Missing script error:', err);
        res.status(500).json({ error: 'Error loading entries' });
    }
});

// GET /api/dictionary/missing-meaning - Entries missing or AI-sourced translation
router.get('/missing-meaning', async (req, res) => {
    try {
        const lang = req.query.lang; // he, en, ru
        const langToCol = { he: 'hebrew_short', en: 'english_short', ru: 'russian_short' };
        if (!langToCol[lang]) {
            return res.status(400).json({ error: 'Invalid lang. Use: he, en, ru' });
        }

        const limit = parseInt(req.query.limit) || 20;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search?.trim();

        const col = langToCol[lang];
        const fsField = LANG_TO_FS_FIELD[lang];
        const searchCondition = search ? 'AND (de.hebrew_script LIKE ? OR t.latin_script LIKE ?)' : '';
        const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

        const [entries] = await db.query(`
            SELECT de.id, de.hebrew_script, de.detected_language,
                   de.hebrew_script as dialect_hebrew_script, t.latin_script, t.cyrillic_script,
                   fs.source_type as ai_source
            FROM dictionary_entries de
            LEFT JOIN dialect_scripts t ON de.id = t.entry_id
            LEFT JOIN field_sources fs ON fs.entry_id = de.id AND fs.field_name = ? AND fs.source_type = 'ai'
            WHERE de.status = 'active'
            AND (
                (de.${col} IS NULL OR de.${col} = '')
                OR fs.id IS NOT NULL
            )
            ${searchCondition}
            GROUP BY de.id
            ORDER BY CASE WHEN fs.id IS NOT NULL AND de.${col} IS NOT NULL AND de.${col} != '' THEN 1 ELSE 0 END,
                     de.created_at DESC
            LIMIT ? OFFSET ?
        `, [fsField, ...searchParams, limit, offset]);

        const [[{ total }]] = await db.query(`
            SELECT COUNT(DISTINCT de.id) as total FROM dictionary_entries de
            LEFT JOIN dialect_scripts t ON de.id = t.entry_id
            LEFT JOIN field_sources fs ON fs.entry_id = de.id AND fs.field_name = ? AND fs.source_type = 'ai'
            WHERE de.status = 'active'
            AND (
                (de.${col} IS NULL OR de.${col} = '')
                OR fs.id IS NOT NULL
            )
            ${searchCondition}
        `, [fsField, ...searchParams]);

        const mapped = entries.map(e => ({
            id: e.id,
            term: e.dialect_hebrew_script || e.latin_script || e.cyrillic_script || e.hebrew_script || '',
            hebrew: e.dialect_hebrew_script || null,
            latin: e.latin_script || null,
            cyrillic: e.cyrillic_script || null,
            isAi: !!e.ai_source,
        }));

        res.json({ entries: mapped, total });
    } catch (err) {
        console.error('Missing meaning error:', err);
        res.status(500).json({ error: 'Error loading entries' });
    }
});

// GET /api/dictionary/ai-fields - Get entries with AI-generated field sources (admin)
router.get('/ai-fields', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 30;
        const offset = (page - 1) * limit;

        // Count total entries with AI fields
        const [countRows] = await db.query(
            `SELECT COUNT(DISTINCT fs.entry_id) as total
             FROM field_sources fs
             WHERE fs.source_type = 'ai'`
        );
        const total = countRows[0]?.total || 0;

        // Get entries with their AI field details
        const [entries] = await db.query(
            `SELECT de.id, de.hebrew_script,
                    GROUP_CONCAT(DISTINCT fs.field_name ORDER BY fs.field_name SEPARATOR ', ') as ai_fields,
                    de.hebrew_script as dialect_hebrew_script, t.latin_script, t.cyrillic_script, t.pronunciation_guide
             FROM field_sources fs
             JOIN dictionary_entries de ON fs.entry_id = de.id
             LEFT JOIN dialect_scripts t ON de.id = t.entry_id
             WHERE fs.source_type = 'ai'
             GROUP BY de.id
             ORDER BY de.hebrew_script
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        res.json({
            entries,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('AI fields error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת שדות AI' });
    }
});

// POST /api/dictionary/bulk-confirm-ai - Bulk confirm AI fields for multiple entries (admin)
router.post('/bulk-confirm-ai', authenticate, requireApprover, async (req, res) => {
    try {
        const { entryIds } = req.body;
        if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
            return res.status(400).json({ error: 'נדרשים מזהי ערכים' });
        }

        // Update all AI field sources to 'community' for selected entries
        const placeholders = entryIds.map(() => '?').join(',');
        const [result] = await db.query(
            `UPDATE field_sources SET source_type = 'community'
             WHERE entry_id IN (${placeholders}) AND source_type = 'ai'`,
            entryIds
        );

        await logEvent('AI_FIELDS_CONFIRMED', `אושרו ${result.affectedRows} שדות AI`, req.user, { entryIds, confirmedCount: result.affectedRows }, req);

        res.json({
            success: true,
            confirmed: result.affectedRows,
            message: `${result.affectedRows} שדות AI אושרו בהצלחה`
        });
    } catch (err) {
        console.error('Bulk confirm error:', err);
        res.status(500).json({ error: 'שגיאה באישור מרובה' });
    }
});

// GET /api/dictionary/pending-suggestions - Translations pending approval (for widget/admin)
router.get('/pending-suggestions', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 50; // Default 50 for admin, widget can pass limit=10
        const [suggestions] = await db.query(
            `SELECT ts.id, ts.entry_id, ts.dialect, ts.suggested_hebrew_short, ts.suggested_latin_script,
                    ts.suggested_cyrillic_script, ts.user_id, ts.status, ts.created_at,
                    ts.audio_url, ts.audio_duration, ts.translation_id,
                    ts.field_name, ts.suggested_russian_short, ts.reason, ts.user_name,
                    de.hebrew_script,
                    u.name as contributor_name
             FROM translation_suggestions ts
             JOIN dictionary_entries de ON ts.entry_id = de.id
             LEFT JOIN users u ON ts.user_id = u.id
             WHERE ts.status = 'pending'
             ORDER BY ts.created_at DESC
             LIMIT ?`,
            [limit]
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
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // Get suggestion
        const [suggestions] = await connection.query('SELECT * FROM translation_suggestions WHERE id = ?', [id]);
        if (suggestions.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(404).json({ error: 'הצעה לא נמצאה' });
        }
        const suggestion = suggestions[0];

        // Field-level suggestion
        if (suggestion.field_name) {
            const fieldName = suggestion.field_name;
            const entryId = suggestion.entry_id;

            // Determine the suggested value based on which field columns have data
            let suggestedValue = '';
            if (fieldName === 'hebrewScript') suggestedValue = suggestion.suggested_hebrew_short;
            else if (fieldName === 'latinScript') suggestedValue = suggestion.suggested_latin_script;
            else if (fieldName === 'cyrillicScript') suggestedValue = suggestion.suggested_cyrillic_script;
            else if (fieldName === 'russianShort') suggestedValue = suggestion.suggested_russian_short;
            else if (fieldName === 'hebrewLong') suggestedValue = suggestion.suggested_hebrew_short; // stored in suggested_hebrew_short for hebrewLong
            else if (fieldName === 'pronunciationGuide') suggestedValue = suggestion.suggested_hebrew_short;
            else if (fieldName === 'partOfSpeech') suggestedValue = suggestion.suggested_hebrew_short;

            // Update the appropriate table/column
            const dsFieldMap = { hebrewScript: 'hebrew_script', latinScript: 'latin_script', cyrillicScript: 'cyrillic_script' };
            if (dsFieldMap[fieldName]) {
                await connection.query(
                    `UPDATE dialect_scripts SET ${dsFieldMap[fieldName]} = ? WHERE entry_id = ? LIMIT 1`,
                    [suggestedValue, entryId]
                );
            } else if (fieldName === 'russianShort') {
                await connection.query('UPDATE dictionary_entries SET russian_short = ? WHERE id = ?', [suggestedValue, entryId]);
            } else if (fieldName === 'hebrewLong') {
                await connection.query('UPDATE dictionary_entries SET hebrew_long = ? WHERE id = ?', [suggestedValue, entryId]);
            } else if (fieldName === 'pronunciationGuide') {
                await connection.query('UPDATE dialect_scripts SET pronunciation_guide = ? WHERE entry_id = ? LIMIT 1', [suggestedValue, entryId]);
            } else if (fieldName === 'partOfSpeech') {
                await connection.query('UPDATE dictionary_entries SET part_of_speech = ? WHERE id = ?', [suggestedValue, entryId]);
            }

            // Update field_sources
            await connection.query(
                `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, ?, 'community')
                 ON DUPLICATE KEY UPDATE source_type = 'community'`,
                [entryId, fieldName]
            );
        } else {
            // Full translation suggestion (original behavior)
            const [dialects] = await connection.query('SELECT id FROM dialects WHERE name = ?', [suggestion.dialect]);
            const dialectId = dialects[0]?.id || 6;

            if (suggestion.translation_id) {
                await connection.query(
                    `UPDATE dialect_scripts SET hebrew_script = ?, latin_script = ?, cyrillic_script = ? WHERE id = ?`,
                    [suggestion.suggested_hebrew_short, suggestion.suggested_latin_script, suggestion.suggested_cyrillic_script, suggestion.translation_id]
                );
            } else {
                await connection.query(
                    `INSERT INTO dialect_scripts (entry_id, dialect_id, hebrew_script, latin_script, cyrillic_script) VALUES (?, ?, ?, ?, ?)`,
                    [suggestion.entry_id, dialectId, suggestion.suggested_hebrew_short, suggestion.suggested_latin_script, suggestion.suggested_cyrillic_script]
                );
            }
        }

        // Mark suggestion as approved
        await connection.query(
            'UPDATE translation_suggestions SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            ['approved', req.user.id, id]
        );

        // Award XP to suggester
        if (suggestion.user_id) {
            await connection.query('UPDATE users SET xp = xp + 50 WHERE id = ?', [suggestion.user_id]);
        }

        // Invalidate stats cache
        statsCache = { data: null, expiry: 0 };

        await connection.commit();
        connection.release();

        // Notify suggester (after commit, non-blocking)
        const [[entryRow]] = await db.query('SELECT hebrew_script FROM dictionary_entries WHERE id = ?', [suggestion.entry_id]);
        const termName = entryRow?.hebrew_script || '';

        if (suggestion.user_id) {
            createNotification(
                suggestion.user_id,
                'suggestion_approved',
                'הצעתך אושרה!',
                `ההצעה שלך לערך "${termName}" אושרה והוחלה על המילון`,
                `/word/${encodeURIComponent(termName)}`
            );
        }

        await logEvent('SUGGESTION_APPROVED', `אושרה הצעה #${id} לערך "${termName}"`, req.user, { suggestionId: id, entryId: suggestion.entry_id, term: termName, fieldName: suggestion.field_name || null }, req);

        res.json({ success: true });
    } catch (err) {
        await connection.rollback();
        connection.release();
        console.error('Approve suggestion error:', err);
        res.status(500).json({ error: 'שגיאה באישור הצעה' });
    }
});

// PUT /api/dictionary/suggestions/:id/reject - Reject a suggestion (admin)
router.put('/suggestions/:id/reject', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;

        // Get suggestion before rejecting (for notification)
        const [[suggestion]] = await db.query('SELECT * FROM translation_suggestions WHERE id = ?', [id]);

        await db.query(
            'UPDATE translation_suggestions SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
            ['rejected', req.user.id, id]
        );

        // Notify suggester (non-blocking)
        const [[entryRow]] = await db.query('SELECT hebrew_script FROM dictionary_entries WHERE id = ?', [suggestion?.entry_id]);
        const termName = entryRow?.hebrew_script || '';

        if (suggestion?.user_id) {
            createNotification(
                suggestion.user_id,
                'suggestion_rejected',
                'הצעתך נדחתה',
                `ההצעה שלך לערך "${termName}" לא אושרה`,
                `/word/${encodeURIComponent(termName)}`
            );
        }

        await logEvent('SUGGESTION_REJECTED', `נדחתה הצעה #${id} לערך "${termName}"`, req.user, { suggestionId: id, entryId: suggestion?.entry_id, term: termName }, req);

        res.json({ success: true });
    } catch (err) {
        console.error('Reject suggestion error:', err);
        res.status(500).json({ error: 'שגיאה בדחיית הצעה' });
    }
});

// POST /api/dictionary/suggestions/:id/upvote - Upvote a pending suggestion
router.post('/suggestions/:id/upvote', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Check suggestion exists and is pending
        const [suggestions] = await db.query(
            'SELECT id FROM translation_suggestions WHERE id = ? AND status = ?',
            [id, 'pending']
        );
        if (suggestions.length === 0) {
            return res.status(404).json({ error: 'הצעה לא נמצאה' });
        }

        // Insert vote (ignore duplicate)
        await db.query(
            `INSERT IGNORE INTO suggestion_votes (suggestion_id, user_id) VALUES (?, ?)`,
            [id, userId]
        );

        // Return updated count
        const [countRows] = await db.query(
            'SELECT COUNT(*) as count FROM suggestion_votes WHERE suggestion_id = ?',
            [id]
        );

        res.json({ success: true, upvotes: countRows[0].count });
    } catch (err) {
        console.error('Upvote suggestion error:', err);
        res.status(500).json({ error: 'שגיאה בחיזוק הצעה' });
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
                `INSERT INTO dictionary_entries (hebrew_script, hebrew_script_normalized, detected_language, source, status, needs_translation, contributor_id)
                 VALUES (?, ?, ?, 'קהילה', 'active', TRUE, ?)`,
                [term, normalizeHebrewScript(term), detectedLanguage || 'Hebrew', req.user.id]
            );
            // If pronunciationGuide provided, add it to a dialect_scripts row
            if (pronunciationGuide) {
                await db.query(
                    `INSERT INTO dialect_scripts (entry_id, dialect_id, pronunciation_guide) VALUES (?, 6, ?)`,
                    [result.insertId, pronunciationGuide]
                );
            }
            await logEvent('ENTRY_ADDED', `נוספה מילה ללא תרגום: ${term}`, req.user, { term, entryId: result.insertId, untranslated: true }, req);
            res.json({ success: true, entryId: result.insertId });
        } catch (colErr) {
            // If needs_translation column doesn't exist, insert without it
            if (colErr.code === 'ER_BAD_FIELD_ERROR') {
                const [result] = await db.query(
                    `INSERT INTO dictionary_entries (hebrew_script, hebrew_script_normalized, detected_language, source, status, contributor_id)
                     VALUES (?, ?, ?, 'קהילה', 'active', ?)`,
                    [term, normalizeHebrewScript(term), detectedLanguage || 'Hebrew', req.user.id]
                );
                if (pronunciationGuide) {
                    await db.query(
                        `INSERT INTO dialect_scripts (entry_id, dialect_id, pronunciation_guide) VALUES (?, 6, ?)`,
                        [result.insertId, pronunciationGuide]
                    );
                }
                await logEvent('ENTRY_ADDED', `נוספה מילה ללא תרגום: ${term}`, req.user, { term, entryId: result.insertId, untranslated: true }, req);
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

// ============================================
// COMMUNITY EXAMPLES / PROVERBS
// ============================================

// POST /api/dictionary/entries/:id/suggest-example - Submit a community proverb/example
router.post('/entries/:id/suggest-example', optionalAuth, [
    param('id').isInt().withMessage('מזהה לא חוקי'),
    body('origin').trim().notEmpty().withMessage('נדרש טקסט הפתגם')
        .isLength({ max: 2000 }).withMessage('הטקסט ארוך מדי'),
    body('translated').optional().trim().isLength({ max: 2000 }),
    body('transliteration').optional().trim().isLength({ max: 2000 }),
    validate
], async (req, res) => {
    try {
        const { id } = req.params;
        const { origin, translated, transliteration } = req.body;

        // Verify entry exists
        const [entryRows] = await db.query('SELECT id, hebrew_script FROM dictionary_entries WHERE id = ?', [id]);
        if (entryRows.length === 0) {
            return res.status(404).json({ error: 'ערך לא נמצא' });
        }

        const [result] = await db.query(
            `INSERT INTO community_examples (entry_id, origin, translated, transliteration, user_id, user_name, source_type, status)
             VALUES (?, ?, ?, ?, ?, ?, 'community', 'pending')`,
            [
                id,
                origin.trim(),
                translated?.trim() || null,
                transliteration?.trim() || null,
                req.user?.id || null,
                req.user?.name || 'אורח',
            ]
        );

        const exampleId = result.insertId;

        // Auto-link: find dictionary words that appear in the proverb text
        try {
            const words = origin.trim().split(/\s+/).filter(w => w.length >= 2);
            if (words.length > 0) {
                const placeholders = words.map(() => '?').join(',');
                const [matchedEntries] = await db.query(
                    `SELECT id FROM dictionary_entries WHERE hebrew_script IN (${placeholders}) AND status = 'active'`,
                    words
                );
                for (const matched of matchedEntries) {
                    await db.query(
                        `INSERT IGNORE INTO example_word_links (example_id, entry_id) VALUES (?, ?)`,
                        [exampleId, matched.id]
                    );
                }
            }
        } catch (linkErr) {
            console.error('Auto-link error (non-fatal):', linkErr);
        }

        // Award XP
        if (req.user?.id) {
            await db.query('UPDATE users SET xp = xp + 20 WHERE id = ?', [req.user.id]);
        }

        res.json({ success: true, message: 'הפתגם נשלח לאישור. תודה!' });
    } catch (err) {
        console.error('Suggest example error:', err);
        res.status(500).json({ error: 'שגיאה בשליחת פתגם' });
    }
});

// GET /api/dictionary/entries/:id/community-examples - Get approved community examples for entry
router.get('/entries/:id/community-examples', async (req, res) => {
    try {
        const { id } = req.params;

        // Get direct examples (linked to this entry)
        const [directExamples] = await db.query(
            `SELECT ce.id, ce.origin, ce.translated, ce.transliteration, ce.user_name, ce.source_type, ce.created_at
             FROM community_examples ce
             WHERE ce.entry_id = ? AND ce.status = 'approved'
             ORDER BY ce.created_at DESC`,
            [id]
        );

        // Get examples linked via word-matching
        const [linkedExamples] = await db.query(
            `SELECT DISTINCT ce.id, ce.origin, ce.translated, ce.transliteration, ce.user_name, ce.source_type, ce.created_at
             FROM example_word_links ewl
             JOIN community_examples ce ON ewl.example_id = ce.id
             WHERE ewl.entry_id = ? AND ce.status = 'approved' AND ce.entry_id != ?
             ORDER BY ce.created_at DESC
             LIMIT 5`,
            [id, id]
        );

        res.json({ directExamples, linkedExamples });
    } catch (err) {
        // Table might not exist yet
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.json({ directExamples: [], linkedExamples: [] });
        }
        console.error('Community examples error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת פתגמים' });
    }
});

// GET /api/dictionary/pending-examples - Get pending community examples (admin)
router.get('/pending-examples', authenticate, requireApprover, async (req, res) => {
    try {
        const [examples] = await db.query(
            `SELECT ce.*, de.hebrew_script
             FROM community_examples ce
             LEFT JOIN dictionary_entries de ON ce.entry_id = de.id
             WHERE ce.status = 'pending'
             ORDER BY ce.created_at DESC
             LIMIT 50`
        );
        res.json({ examples });
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.json({ examples: [] });
        }
        console.error('Pending examples error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת פתגמים ממתינים' });
    }
});

// PUT /api/dictionary/examples/:id/approve - Approve a community example (admin)
router.put('/examples/:id/approve', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;

        await db.query('UPDATE community_examples SET status = ? WHERE id = ?', ['approved', id]);

        // Re-run word linking for the approved example
        const [examples] = await db.query('SELECT * FROM community_examples WHERE id = ?', [id]);
        if (examples.length > 0) {
            const ex = examples[0];
            const words = ex.origin.split(/\s+/).filter(w => w.length >= 2);
            if (words.length > 0) {
                const placeholders = words.map(() => '?').join(',');
                const [matchedEntries] = await db.query(
                    `SELECT id FROM dictionary_entries WHERE hebrew_script IN (${placeholders}) AND status = 'active'`,
                    words
                );
                for (const matched of matchedEntries) {
                    await db.query(
                        'INSERT IGNORE INTO example_word_links (example_id, entry_id) VALUES (?, ?)',
                        [id, matched.id]
                    );
                }
            }

            // Award XP to contributor
            if (ex.user_id) {
                await db.query('UPDATE users SET xp = xp + 30 WHERE id = ?', [ex.user_id]);
            }
        }

        await logEvent('EXAMPLE_APPROVED', `אושר פתגם #${id}`, req.user, { exampleId: id }, req);

        res.json({ success: true });
    } catch (err) {
        console.error('Approve example error:', err);
        res.status(500).json({ error: 'שגיאה באישור פתגם' });
    }
});

// PUT /api/dictionary/examples/:id/reject - Reject a community example (admin)
router.put('/examples/:id/reject', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('UPDATE community_examples SET status = ? WHERE id = ?', ['rejected', id]);

        await logEvent('EXAMPLE_REJECTED', `נדחה פתגם #${id}`, req.user, { exampleId: id }, req);

        res.json({ success: true });
    } catch (err) {
        console.error('Reject example error:', err);
        res.status(500).json({ error: 'שגיאה בדחיית פתגם' });
    }
});

// GET /api/dictionary/similar?q=term - Fuzzy/similar word suggestions
router.get('/similar', async (req, res) => {
    try {
        const term = (req.query.q || '').trim();
        if (!term) return res.json({ suggestions: [] });
        const limit = Math.min(parseInt(req.query.limit) || 5, 10);

        // Search by SOUNDEX, substring match, partial overlap, and Hebrew stems
        const stems = extractHebrewStems(term);
        const stemConditions = stems.map(() => 'de.hebrew_script LIKE CONCAT(\'%\', ?, \'%\')').join(' OR ');
        const stemParams = stems.length > 0 ? stems : [];

        const [results] = await db.query(
            `SELECT DISTINCT de.id, de.hebrew_script, de.part_of_speech,
                    de.hebrew_script as dialect_hebrew_script,
                    (SELECT t.latin_script FROM dialect_scripts t WHERE t.entry_id = de.id AND t.latin_script IS NOT NULL LIMIT 1) as latin_script,
                    CASE
                      WHEN SOUNDEX(de.hebrew_script) = SOUNDEX(?) THEN 1
                      WHEN de.hebrew_script LIKE CONCAT('%', ?, '%') THEN 2
                      ELSE 3
                    END as match_rank
             FROM dictionary_entries de
             LEFT JOIN dialect_scripts t ON de.id = t.entry_id
             WHERE de.status = 'active'
               AND de.hebrew_script != ?
               AND (SOUNDEX(de.hebrew_script) = SOUNDEX(?)
                    OR SOUNDEX(de.hebrew_script) = SOUNDEX(?)
                    OR de.hebrew_script LIKE CONCAT('%', ?, '%')
                    OR de.hebrew_script LIKE CONCAT('%', ?, '%')
                    OR t.latin_script LIKE CONCAT('%', ?, '%')
                    ${stemConditions ? `OR ${stemConditions}` : ''})
             GROUP BY de.id
             ORDER BY match_rank, de.hebrew_script
             LIMIT ?`,
            [term, term, term, term, term, term, term, term, ...stemParams, limit]
        );

        res.json({
            suggestions: results.map(r => ({
                id: String(r.id),
                hebrewScript: r.hebrew_script,
                dialectHebrewScript: r.dialect_hebrew_script,
                latinScript: r.latin_script,
                partOfSpeech: r.part_of_speech,
            }))
        });
    } catch (err) {
        console.error('Similar search error:', err);
        res.status(500).json({ error: 'שגיאה בחיפוש דומים' });
    }
});

// GET /api/dictionary/notifications - Get user notifications
router.get('/notifications', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const unreadOnly = req.query.unread === 'true';
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);

        const whereClause = unreadOnly ? 'WHERE user_id = ? AND is_read = FALSE' : 'WHERE user_id = ?';
        const [notifications] = await db.query(
            `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ?`,
            [userId, limit]
        );
        const [[{ count: unreadCount }]] = await db.query(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
            [userId]
        );

        res.json({ notifications, unreadCount });
    } catch (err) {
        console.error('Notifications error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת התראות' });
    }
});

// PUT /api/dictionary/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', authenticate, async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Mark read error:', err);
        res.status(500).json({ error: 'שגיאה' });
    }
});

// PUT /api/dictionary/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', authenticate, async (req, res) => {
    try {
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ?',
            [req.user.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Mark all read error:', err);
        res.status(500).json({ error: 'שגיאה' });
    }
});

// GET /api/dictionary/users/me/contributions - User contribution dashboard
router.get('/users/me/contributions', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;

        const [
            [suggestions],
            [entries],
            [examples],
            [[userRow]]
        ] = await Promise.all([
            db.query(
                `SELECT ts.id, ts.field_name, ts.suggested_hebrew_short, ts.suggested_latin_script,
                        ts.suggested_cyrillic_script, ts.suggested_russian_short, ts.status,
                        ts.report_type, ts.created_at, ts.reviewed_at,
                        de.hebrew_script as entry_term
                 FROM translation_suggestions ts
                 LEFT JOIN dictionary_entries de ON ts.entry_id = de.id
                 WHERE ts.user_id = ?
                 ORDER BY ts.created_at DESC LIMIT 50`,
                [userId]
            ),
            db.query(
                `SELECT id, hebrew_script, status, created_at, approved_at
                 FROM dictionary_entries
                 WHERE contributor_id = ?
                 ORDER BY created_at DESC LIMIT 50`,
                [userId]
            ),
            db.query(
                `SELECT id, origin, translated, status, created_at
                 FROM community_examples
                 WHERE user_id = ?
                 ORDER BY created_at DESC LIMIT 50`,
                [userId]
            ),
            db.query(
                'SELECT xp, contributions_count FROM users WHERE id = ?',
                [userId]
            ),
        ]);

        res.json({
            suggestions: suggestions.map(s => ({
                id: s.id,
                entryTerm: s.entry_term,
                fieldName: s.field_name,
                suggestedValue: s.suggested_hebrew_short || s.suggested_latin_script || s.suggested_cyrillic_script || s.suggested_russian_short || '',
                status: s.status,
                reportType: s.report_type,
                createdAt: s.created_at,
                reviewedAt: s.reviewed_at,
            })),
            entries: entries.map(e => ({
                id: String(e.id),
                hebrewScript: e.hebrew_script,
                status: e.status,
                createdAt: e.created_at,
                approvedAt: e.approved_at,
            })),
            examples: examples.map(ex => ({
                id: ex.id,
                origin: ex.origin,
                translated: ex.translated,
                status: ex.status,
                createdAt: ex.created_at,
            })),
            xp: userRow?.xp || 0,
            totalContributions: userRow?.contributions_count || 0,
        });
    } catch (err) {
        console.error('Contributions error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת תרומות' });
    }
});

// ============================================================
// DUPLICATE MANAGEMENT ENDPOINTS
// ============================================================

// GET /api/dictionary/duplicates - Detect duplicate groups
router.get('/duplicates', authenticate, requireApprover, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const search = (req.query.search || '').trim();
        const offset = (page - 1) * limit;

        // Find groups by normalized term
        let termQuery = `
            SELECT hebrew_script_normalized, GROUP_CONCAT(id ORDER BY id) as ids, COUNT(*) as cnt
            FROM dictionary_entries
            WHERE status = 'active' AND hebrew_script_normalized IS NOT NULL AND hebrew_script_normalized != ''
        `;
        const termParams = [];
        if (search) {
            termQuery += ` AND (hebrew_script LIKE ? OR hebrew_script_normalized LIKE ?)`;
            termParams.push(`%${search}%`, `%${normalizeHebrewScript(search)}%`);
        }
        termQuery += ` GROUP BY hebrew_script_normalized HAVING cnt > 1 ORDER BY cnt DESC`;

        const [termGroups] = await db.query(termQuery, termParams);

        // Find groups by latin match (only entries not already grouped by term)
        let latinQuery = `
            SELECT LOWER(t.latin_script) as latin_key, GROUP_CONCAT(DISTINCT de.id ORDER BY de.id) as ids, COUNT(DISTINCT de.id) as cnt
            FROM dialect_scripts t
            JOIN dictionary_entries de ON t.entry_id = de.id
            WHERE de.status = 'active' AND t.latin_script IS NOT NULL AND t.latin_script != ''
        `;
        const latinParams = [];
        if (search) {
            latinQuery += ` AND (de.hebrew_script LIKE ? OR t.latin_script LIKE ?)`;
            latinParams.push(`%${search}%`, `%${search}%`);
        }
        latinQuery += ` GROUP BY latin_key HAVING cnt > 1 ORDER BY cnt DESC`;

        const [latinGroups] = await db.query(latinQuery, latinParams);

        // Merge groups, deduplicating overlapping ID sets
        const seenIds = new Set();
        const groups = [];

        for (const g of termGroups) {
            const ids = g.ids.split(',').map(Number);
            const key = ids.sort().join(',');
            if (!seenIds.has(key)) {
                seenIds.add(key);
                groups.push({ matchType: 'term', matchKey: g.hebrew_script_normalized, ids });
            }
        }

        for (const g of latinGroups) {
            const ids = g.ids.split(',').map(Number);
            const key = ids.sort().join(',');
            if (!seenIds.has(key)) {
                seenIds.add(key);
                groups.push({ matchType: 'latin', matchKey: g.latin_key, ids });
            }
        }

        const total = groups.length;
        const pagedGroups = groups.slice(offset, offset + limit);

        // Fetch preview data for paged groups
        const allIds = [...new Set(pagedGroups.flatMap(g => g.ids))];
        if (allIds.length === 0) {
            return res.json({ groups: [], total: 0, page, limit });
        }

        const [entries] = await db.query(
            `SELECT de.id, de.hebrew_script, de.hebrew_script_normalized, de.part_of_speech, de.source_name, de.source, de.created_at,
                    (SELECT JSON_ARRAYAGG(JSON_OBJECT('hebrewScript', de.hebrew_script, 'latinScript', t.latin_script, 'cyrillicScript', t.cyrillic_script, 'dialect', COALESCE(d.name, '')))
                     FROM dialect_scripts t LEFT JOIN dialects d ON t.dialect_id = d.id WHERE t.entry_id = de.id) as translations_json
             FROM dictionary_entries de
             WHERE de.id IN (${allIds.map(() => '?').join(',')})`,
            allIds
        );

        const entryMap = {};
        for (const e of entries) {
            entryMap[e.id] = {
                id: String(e.id),
                hebrewScript: e.hebrew_script,
                termNormalized: e.hebrew_script_normalized,
                partOfSpeech: e.part_of_speech,
                sourceName: e.source_name,
                source: e.source,
                createdAt: e.created_at,
                translations: (() => {
                    try { return JSON.parse(e.translations_json) || []; }
                    catch { return []; }
                })(),
            };
        }

        const result = pagedGroups.map(g => ({
            matchType: g.matchType,
            matchKey: g.matchKey,
            entries: g.ids.map(id => entryMap[id]).filter(Boolean),
        }));

        res.json({ groups: result, total, page, limit });
    } catch (err) {
        console.error('Duplicates detection error:', err);
        res.status(500).json({ error: 'שגיאה בזיהוי כפילויות' });
    }
});

// GET /api/dictionary/duplicates/compare - Side-by-side comparison
router.get('/duplicates/compare', authenticate, requireApprover, async (req, res) => {
    try {
        const ids = (req.query.ids || '').split(',').map(Number).filter(n => n > 0);
        if (ids.length < 2 || ids.length > 5) {
            return res.status(400).json({ error: 'נדרשים 2-5 מזהי ערכים' });
        }

        const placeholders = ids.map(() => '?').join(',');

        const [
            [entries],
            [dialectScriptsAll],
            [examples],
            [likesData],
            [commentsData],
            [viewsData]
        ] = await Promise.all([
            db.query(
                `SELECT de.*, u.name as contributor_name
                 FROM dictionary_entries de
                 LEFT JOIN users u ON de.contributor_id = u.id
                 WHERE de.id IN (${placeholders})`,
                ids
            ),
            db.query(
                `SELECT t.*, COALESCE(d.name, '') as dialect
                 FROM dialect_scripts t
                 LEFT JOIN dialects d ON t.dialect_id = d.id
                 WHERE t.entry_id IN (${placeholders})`,
                ids
            ),
            db.query(`SELECT * FROM examples WHERE entry_id IN (${placeholders})`, ids),
            db.query(
                `SELECT entry_id, COUNT(*) as count FROM entry_likes WHERE entry_id IN (${placeholders}) GROUP BY entry_id`,
                ids
            ),
            db.query(
                `SELECT entry_id, COUNT(*) as count FROM comments WHERE entry_id IN (${placeholders}) AND status = 'approved' GROUP BY entry_id`,
                ids
            ),
            db.query(
                `SELECT entry_id, SUM(view_count) as total_views FROM word_views WHERE entry_id IN (${placeholders}) GROUP BY entry_id`,
                ids
            ),
        ]);

        const likesMap = Object.fromEntries(likesData.map(r => [r.entry_id, r.count]));
        const commentsMap = Object.fromEntries(commentsData.map(r => [r.entry_id, r.count]));
        const viewsMap = Object.fromEntries(viewsData.map(r => [r.entry_id, r.total_views]));

        const result = entries.map(e => ({
            id: String(e.id),
            hebrewScript: e.hebrew_script,
            termNormalized: e.hebrew_script_normalized,
            detectedLanguage: e.detected_language,
            partOfSpeech: e.part_of_speech,
            hebrewShort: e.hebrew_short || null,
            hebrewLong: e.hebrew_long || null,
            russianShort: e.russian_short || null,
            russianLong: e.russian_long || null,
            englishShort: e.english_short || null,
            englishLong: e.english_long || null,
            source: e.source,
            sourceName: e.source_name,
            status: e.status,
            contributorName: e.contributor_name,
            createdAt: e.created_at,
            dialectScripts: dialectScriptsAll.filter(t => t.entry_id === e.id).map(t => ({
                id: t.id,
                dialect: t.dialect,
                dialectId: t.dialect_id,
                hebrewScript: t.hebrew_script,
                latinScript: t.latin_script,
                cyrillicScript: t.cyrillic_script,
                pronunciationGuide: t.pronunciation_guide || null,
                upvotes: t.upvotes || 0,
                downvotes: t.downvotes || 0,
            })),
            examples: examples.filter(ex => ex.entry_id === e.id).map(ex => ({
                origin: ex.origin,
                translated: ex.translated,
                transliteration: ex.transliteration,
            })),
            likesCount: likesMap[e.id] || 0,
            commentsCount: commentsMap[e.id] || 0,
            totalViews: viewsMap[e.id] || 0,
        }));

        res.json({ entries: result });
    } catch (err) {
        console.error('Compare entries error:', err);
        res.status(500).json({ error: 'שגיאה בהשוואת ערכים' });
    }
});

// POST /api/dictionary/duplicates/merge - Execute merge
router.post('/duplicates/merge', authenticate, requireApprover, [
    body('keepId').isInt().withMessage('נדרש מזהה ערך לשמירה'),
    body('deleteId').isInt().withMessage('נדרש מזהה ערך למחיקה'),
    validate
], async (req, res) => {
    const conn = await db.getConnection();
    try {
        const { keepId, deleteId, fieldOverrides } = req.body;
        if (keepId === deleteId) {
            return res.status(400).json({ error: 'לא ניתן למזג ערך עם עצמו' });
        }

        await conn.beginTransaction();

        // Verify both entries exist
        const [[keepEntry]] = await conn.query('SELECT * FROM dictionary_entries WHERE id = ?', [keepId]);
        const [[deleteEntry]] = await conn.query('SELECT * FROM dictionary_entries WHERE id = ?', [deleteId]);
        if (!keepEntry || !deleteEntry) {
            await conn.rollback();
            return res.status(404).json({ error: 'אחד הערכים לא נמצא' });
        }

        // 1. Snapshot the deleted entry
        const [deleteDialectScripts] = await conn.query(
            `SELECT t.*, COALESCE(d.name, '') as dialect_name FROM dialect_scripts t LEFT JOIN dialects d ON t.dialect_id = d.id WHERE t.entry_id = ?`,
            [deleteId]
        );
        const [deleteExamples] = await conn.query('SELECT * FROM examples WHERE entry_id = ?', [deleteId]);

        const snapshot = {
            entry: deleteEntry,
            dialectScripts: deleteDialectScripts,
            examples: deleteExamples,
        };

        await conn.query(
            'INSERT INTO merge_log (kept_entry_id, deleted_entry_id, deleted_term, merge_details, merged_by) VALUES (?, ?, ?, ?, ?)',
            [keepId, deleteId, deleteEntry.hebrew_script, JSON.stringify(snapshot), req.user.id]
        );

        // 2. Apply field overrides to kept entry
        if (fieldOverrides && typeof fieldOverrides === 'object') {
            const allowedFields = ['hebrew_script', 'part_of_speech', 'russian_short', 'english_short', 'detected_language', 'hebrew_short', 'hebrew_long', 'russian_long', 'english_long'];
            const updates = [];
            const values = [];
            for (const [field, value] of Object.entries(fieldOverrides)) {
                if (allowedFields.includes(field)) {
                    updates.push(`${field} = ?`);
                    values.push(value);
                }
            }
            if (updates.length > 0) {
                // Also update hebrew_script_normalized if hebrew_script changed
                if (fieldOverrides.hebrew_script) {
                    updates.push('hebrew_script_normalized = ?');
                    values.push(normalizeHebrewScript(fieldOverrides.hebrew_script));
                }
                values.push(keepId);
                await conn.query(`UPDATE dictionary_entries SET ${updates.join(', ')} WHERE id = ?`, values);
            }
        }

        // 3. Move dialect_scripts
        await conn.query('UPDATE dialect_scripts SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);

        // 4. Merge hebrew_long if the kept entry doesn't have one but the deleted does
        if (!keepEntry.hebrew_long && deleteEntry.hebrew_long) {
            await conn.query('UPDATE dictionary_entries SET hebrew_long = ? WHERE id = ?', [deleteEntry.hebrew_long, keepId]);
        }

        // 5. Move examples
        await conn.query('UPDATE examples SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);

        // 6. Re-point other FKs
        await conn.query('UPDATE translation_suggestions SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);
        await conn.query('UPDATE comments SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);
        await conn.query('UPDATE community_examples SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);

        // entry_likes: INSERT IGNORE to avoid duplicate unique constraint
        await conn.query(
            `INSERT IGNORE INTO entry_likes (entry_id, user_id, created_at)
             SELECT ?, user_id, created_at FROM entry_likes WHERE entry_id = ?`,
            [keepId, deleteId]
        );
        await conn.query('DELETE FROM entry_likes WHERE entry_id = ?', [deleteId]);

        // word_views: aggregate
        await conn.query(
            `INSERT INTO word_views (entry_id, view_date, view_count)
             SELECT ?, view_date, view_count FROM word_views WHERE entry_id = ?
             ON DUPLICATE KEY UPDATE view_count = word_views.view_count + VALUES(view_count)`,
            [keepId, deleteId]
        );
        await conn.query('DELETE FROM word_views WHERE entry_id = ?', [deleteId]);

        // related_words: INSERT IGNORE, skip self-references
        await conn.query(
            `INSERT IGNORE INTO related_words (entry_id, related_entry_id, relation_type)
             SELECT ?, related_entry_id, relation_type FROM related_words
             WHERE entry_id = ? AND related_entry_id != ?`,
            [keepId, deleteId, keepId]
        );
        await conn.query(
            `INSERT IGNORE INTO related_words (entry_id, related_entry_id, relation_type)
             SELECT entry_id, ?, relation_type FROM related_words
             WHERE related_entry_id = ? AND entry_id != ?`,
            [keepId, deleteId, keepId]
        );
        await conn.query('DELETE FROM related_words WHERE entry_id = ? OR related_entry_id = ?', [deleteId, deleteId]);

        // word_mastery: INSERT IGNORE (keep existing progress)
        await conn.query(
            `INSERT IGNORE INTO word_mastery (user_id, entry_id, box, next_review, times_correct, times_incorrect, last_reviewed)
             SELECT user_id, ?, box, next_review, times_correct, times_incorrect, last_reviewed
             FROM word_mastery WHERE entry_id = ?`,
            [keepId, deleteId]
        );
        await conn.query('DELETE FROM word_mastery WHERE entry_id = ?', [deleteId]);

        // unit_words: INSERT IGNORE
        await conn.query(
            `INSERT IGNORE INTO unit_words (unit_id, entry_id, display_order)
             SELECT unit_id, ?, display_order FROM unit_words WHERE entry_id = ?`,
            [keepId, deleteId]
        );
        await conn.query('DELETE FROM unit_words WHERE entry_id = ?', [deleteId]);

        // example_word_links
        await conn.query(
            `INSERT IGNORE INTO example_word_links (example_id, entry_id)
             SELECT example_id, ? FROM example_word_links WHERE entry_id = ?`,
            [keepId, deleteId]
        );
        await conn.query('DELETE FROM example_word_links WHERE entry_id = ?', [deleteId]);

        // field_sources: move unique field_name entries
        await conn.query(
            `INSERT IGNORE INTO field_sources (entry_id, field_name, source_type, confidence)
             SELECT ?, field_name, source_type, confidence FROM field_sources WHERE entry_id = ?`,
            [keepId, deleteId]
        );
        await conn.query('DELETE FROM field_sources WHERE entry_id = ?', [deleteId]);

        // likes (generic)
        await conn.query(
            `INSERT IGNORE INTO likes (user_id, target_type, target_id)
             SELECT user_id, target_type, ? FROM likes WHERE target_type = 'entry' AND target_id = ?`,
            [keepId, deleteId]
        );
        await conn.query('DELETE FROM likes WHERE target_type = ? AND target_id = ?', ['entry', deleteId]);

        // 7. Delete the doomed entry
        await conn.query('DELETE FROM dictionary_entries WHERE id = ?', [deleteId]);

        // 8. Update hebrew_script_normalized on kept entry (if not already done via overrides)
        if (!fieldOverrides?.hebrew_script) {
            await conn.query(
                'UPDATE dictionary_entries SET hebrew_script_normalized = ? WHERE id = ?',
                [normalizeHebrewScript(keepEntry.hebrew_script), keepId]
            );
        }

        // 9. Log to system_logs
        await conn.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata, ip_address)
             VALUES ('ENTRY_MERGED', ?, ?, ?, ?, ?)`,
            [
                `מוזגו ערכים: "${keepEntry.hebrew_script}" (${keepId}) ← "${deleteEntry.hebrew_script}" (${deleteId})`,
                req.user.id,
                req.user.name,
                JSON.stringify({ keepId, deleteId, deletedTerm: deleteEntry.hebrew_script }),
                getClientIp(req)
            ]
        );

        // Also resolve any pending merge suggestions for this pair
        await conn.query(
            `UPDATE merge_suggestions SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
             WHERE status = 'pending' AND (
                (entry_id_a = ? AND entry_id_b = ?) OR (entry_id_a = ? AND entry_id_b = ?)
             )`,
            [req.user.id, keepId, deleteId, deleteId, keepId]
        );

        await conn.commit();

        // 10. Invalidate stats cache
        statsCache = { data: null, expiry: 0 };

        res.json({ success: true, keptId: keepId, deletedId: deleteId });
    } catch (err) {
        await conn.rollback();
        console.error('Merge error:', err);
        res.status(500).json({ error: 'שגיאה במיזוג ערכים' });
    } finally {
        conn.release();
    }
});

// POST /api/dictionary/duplicates/suggest - User suggests merge
router.post('/duplicates/suggest', authenticate, [
    body('entryIdA').isInt().withMessage('נדרש מזהה ערך A'),
    body('entryIdB').isInt().withMessage('נדרש מזהה ערך B'),
    validate
], async (req, res) => {
    try {
        const { entryIdA, entryIdB, reason } = req.body;
        if (entryIdA === entryIdB) {
            return res.status(400).json({ error: 'לא ניתן להציע מיזוג של ערך עם עצמו' });
        }

        // Normalize order so (A,B) and (B,A) are the same
        const [idA, idB] = [Math.min(entryIdA, entryIdB), Math.max(entryIdA, entryIdB)];

        await db.query(
            `INSERT INTO merge_suggestions (entry_id_a, entry_id_b, reason, user_id, user_name)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE reason = COALESCE(VALUES(reason), reason)`,
            [idA, idB, reason || null, req.user.id, req.user.name]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Suggest merge error:', err);
        res.status(500).json({ error: 'שגיאה בשליחת הצעת מיזוג' });
    }
});

// GET /api/dictionary/duplicates/suggestions - List pending merge suggestions
router.get('/duplicates/suggestions', authenticate, requireApprover, async (req, res) => {
    try {
        const [suggestions] = await db.query(
            `SELECT ms.*,
                    a.hebrew_script as term_a, b.hebrew_script as term_b,
                    a.hebrew_script as hebrew_a,
                    b.hebrew_script as hebrew_b,
                    (SELECT t.latin_script FROM dialect_scripts t WHERE t.entry_id = ms.entry_id_a LIMIT 1) as latin_a,
                    (SELECT t.latin_script FROM dialect_scripts t WHERE t.entry_id = ms.entry_id_b LIMIT 1) as latin_b
             FROM merge_suggestions ms
             JOIN dictionary_entries a ON ms.entry_id_a = a.id
             JOIN dictionary_entries b ON ms.entry_id_b = b.id
             WHERE ms.status = 'pending'
             ORDER BY ms.created_at DESC`
        );

        res.json({ suggestions });
    } catch (err) {
        console.error('List merge suggestions error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הצעות מיזוג' });
    }
});

// PUT /api/dictionary/duplicates/suggestions/:id/dismiss - Reject merge suggestion
router.put('/duplicates/suggestions/:id/dismiss', authenticate, requireApprover, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query(
            `UPDATE merge_suggestions SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
            [req.user.id, id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Dismiss merge suggestion error:', err);
        res.status(500).json({ error: 'שגיאה בדחיית הצעת מיזוג' });
    }
});

// GET /api/dictionary/duplicates/count - Count for admin badge
router.get('/duplicates/count', authenticate, requireApprover, async (req, res) => {
    try {
        const [[{ count: termCount }]] = await db.query(
            `SELECT COUNT(*) as count FROM (
                SELECT hebrew_script_normalized FROM dictionary_entries
                WHERE status = 'active' AND hebrew_script_normalized IS NOT NULL AND hebrew_script_normalized != ''
                GROUP BY hebrew_script_normalized HAVING COUNT(*) > 1
            ) as dup_groups`
        );
        const [[{ count: suggestionsCount }]] = await db.query(
            `SELECT COUNT(*) as count FROM merge_suggestions WHERE status = 'pending'`
        );
        res.json({ duplicateGroups: termCount, pendingSuggestions: suggestionsCount });
    } catch (err) {
        console.error('Duplicates count error:', err);
        res.status(500).json({ error: 'שגיאה בספירת כפילויות' });
    }
});

// Helper: create notification (used by approve/reject endpoints)
async function createNotification(userId, type, title, message, link) {
    if (!userId) return;
    try {
        await db.query(
            'INSERT INTO notifications (user_id, type, title, message, link) VALUES (?, ?, ?, ?, ?)',
            [userId, type, title, message, link]
        );
    } catch (err) {
        console.error('Notification creation error:', err);
    }
}

module.exports = router;
