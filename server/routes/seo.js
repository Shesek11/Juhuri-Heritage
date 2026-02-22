const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// ============================================
// SEO SETTINGS (key-value store)
// ============================================

// GET /api/admin/seo/settings - Get all SEO settings
router.get('/settings', authenticate, requireAdmin, async (req, res) => {
    try {
        const [settings] = await pool.query(
            `SELECT setting_key, setting_value, updated_at
             FROM seo_settings ORDER BY setting_key ASC`
        );
        // Convert to object for easy frontend consumption
        const obj = {};
        for (const s of settings) {
            try {
                obj[s.setting_key] = JSON.parse(s.setting_value);
            } catch {
                obj[s.setting_key] = s.setting_value;
            }
        }
        res.json(obj);
    } catch (err) {
        // Table might not exist yet
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.json({});
        }
        console.error('SEO settings error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הגדרות SEO' });
    }
});

// PUT /api/admin/seo/settings - Bulk update SEO settings
router.put('/settings', authenticate, requireAdmin, async (req, res) => {
    try {
        const settings = req.body;
        if (!settings || typeof settings !== 'object') {
            return res.status(400).json({ error: 'נדרשים הגדרות' });
        }

        for (const [key, value] of Object.entries(settings)) {
            const strValue = typeof value === 'string' ? value : JSON.stringify(value);
            await pool.query(
                `INSERT INTO seo_settings (setting_key, setting_value, updated_by)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE
                    setting_value = VALUES(setting_value),
                    updated_by = VALUES(updated_by),
                    updated_at = CURRENT_TIMESTAMP`,
                [key, strValue, req.user.id]
            );
        }

        // Audit log
        await pool.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
             VALUES ('SEO_SETTINGS_CHANGED', ?, ?, ?, ?)`,
            ['הגדרות SEO עודכנו', req.user.id, req.user.name, JSON.stringify({ keys: Object.keys(settings) })]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('SEO settings update error:', err);
        res.status(500).json({ error: 'שגיאה בעדכון הגדרות SEO' });
    }
});

// ============================================
// ROBOTS.TXT MANAGEMENT
// ============================================

// GET /api/admin/seo/robots - Get current robots.txt content
router.get('/robots', authenticate, requireAdmin, async (req, res) => {
    try {
        // Check DB first
        const [rows] = await pool.query(
            `SELECT setting_value FROM seo_settings WHERE setting_key = 'robots_txt'`
        );
        if (rows.length > 0) {
            return res.json({ content: rows[0].setting_value, source: 'database' });
        }

        // Fall back to file
        const robotsPath = path.join(__dirname, '../../dist/robots.txt');
        const publicPath = path.join(__dirname, '../../public/robots.txt');
        const filePath = fs.existsSync(robotsPath) ? robotsPath : publicPath;

        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            return res.json({ content, source: 'file' });
        }

        res.json({ content: '', source: 'none' });
    } catch (err) {
        console.error('Robots.txt read error:', err);
        res.status(500).json({ error: 'שגיאה בקריאת robots.txt' });
    }
});

// PUT /api/admin/seo/robots - Update robots.txt
router.put('/robots', authenticate, requireAdmin, async (req, res) => {
    try {
        const { content } = req.body;
        if (typeof content !== 'string') {
            return res.status(400).json({ error: 'נדרש תוכן' });
        }

        // Save to DB
        await pool.query(
            `INSERT INTO seo_settings (setting_key, setting_value, updated_by)
             VALUES ('robots_txt', ?, ?)
             ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP`,
            [content, req.user.id]
        );

        // Also write to file for immediate effect
        const publicPath = path.join(__dirname, '../../public/robots.txt');
        fs.writeFileSync(publicPath, content, 'utf8');

        // Write to dist too if it exists
        const distPath = path.join(__dirname, '../../dist/robots.txt');
        if (fs.existsSync(path.dirname(distPath))) {
            fs.writeFileSync(distPath, content, 'utf8');
        }

        await pool.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
             VALUES ('SEO_ROBOTS_CHANGED', ?, ?, ?, ?)`,
            ['robots.txt עודכן', req.user.id, req.user.name, JSON.stringify({ length: content.length })]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Robots.txt write error:', err);
        res.status(500).json({ error: 'שגיאה בעדכון robots.txt' });
    }
});

// ============================================
// REDIRECTS MANAGEMENT
// ============================================

// GET /api/admin/seo/redirects - Get all redirects
router.get('/redirects', authenticate, requireAdmin, async (req, res) => {
    try {
        const [redirects] = await pool.query(
            `SELECT id, from_path, to_path, status_code, hits, is_active, created_at, updated_at
             FROM seo_redirects ORDER BY created_at DESC`
        );
        res.json(redirects);
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.json([]);
        }
        console.error('Redirects error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הפניות' });
    }
});

// POST /api/admin/seo/redirects - Add redirect
router.post('/redirects', authenticate, requireAdmin, async (req, res) => {
    try {
        const { from_path, to_path, status_code } = req.body;
        if (!from_path || !to_path) {
            return res.status(400).json({ error: 'נדרשים נתיב מקור ויעד' });
        }

        const code = [301, 302, 307, 308].includes(status_code) ? status_code : 301;

        const [result] = await pool.query(
            `INSERT INTO seo_redirects (from_path, to_path, status_code, created_by)
             VALUES (?, ?, ?, ?)`,
            [from_path.trim(), to_path.trim(), code, req.user.id]
        );

        res.json({ success: true, id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'הפניה מנתיב זה כבר קיימת' });
        }
        console.error('Add redirect error:', err);
        res.status(500).json({ error: 'שגיאה בהוספת הפניה' });
    }
});

// DELETE /api/admin/seo/redirects/:id - Remove redirect
router.delete('/redirects/:id', authenticate, requireAdmin, async (req, res) => {
    try {
        await pool.query('DELETE FROM seo_redirects WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete redirect error:', err);
        res.status(500).json({ error: 'שגיאה במחיקת הפניה' });
    }
});

// PUT /api/admin/seo/redirects/:id/toggle - Toggle redirect active/inactive
router.put('/redirects/:id/toggle', authenticate, requireAdmin, async (req, res) => {
    try {
        await pool.query(
            'UPDATE seo_redirects SET is_active = NOT is_active WHERE id = ?',
            [req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Toggle redirect error:', err);
        res.status(500).json({ error: 'שגיאה בעדכון הפניה' });
    }
});

// ============================================
// SITEMAP & INDEX STATS
// ============================================

// GET /api/admin/seo/index-stats - Get indexing statistics
router.get('/index-stats', authenticate, requireAdmin, async (req, res) => {
    try {
        const [
            [{ totalEntries }],
            [{ totalRecipes }],
            [{ totalVendors }],
            [{ totalPages }]
        ] = await Promise.all([
            pool.query(`SELECT COUNT(*) as totalEntries FROM dictionary_entries WHERE status = 'active'`).then(r => r[0]),
            pool.query(`SELECT COUNT(*) as totalRecipes FROM recipes WHERE is_approved = 1`).then(r => r[0]).catch(() => [{ totalRecipes: 0 }]),
            pool.query(`SELECT COUNT(*) as totalVendors FROM marketplace_vendors WHERE status = 'active'`).then(r => r[0]).catch(() => [{ totalVendors: 0 }]),
            Promise.resolve([{ totalPages: 5 }]) // Static pages count
        ]);

        res.json({
            staticPages: totalPages,
            dictionaryEntries: totalEntries,
            recipes: totalRecipes,
            vendors: totalVendors,
            totalUrls: totalPages + totalEntries + totalRecipes + totalVendors
        });
    } catch (err) {
        console.error('Index stats error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת סטטיסטיקות' });
    }
});

// ============================================
// META DEFAULTS MANAGEMENT
// ============================================

// Default meta templates per page type
const DEFAULT_META = {
    home: {
        titleTemplate: "מורשת ג'והורי | המילון לשימור השפה",
        description: "מילון ג'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים"
    },
    word: {
        titleTemplate: '{term} - תרגום ג\'והורי | מורשת ג\'והורי',
        description: 'חפש את המשמעות של "{term}" במילון הג\'והורי-עברי'
    },
    recipes: {
        titleTemplate: 'מתכונים קווקזיים מסורתיים | מורשת ג\'והורי',
        description: 'אוסף מתכונים אותנטיים מהמטבח הג\'והורי והקווקזי-יהודי'
    },
    recipe: {
        titleTemplate: '{title} - מתכון | מורשת ג\'והורי',
        description: 'מתכון מסורתי: {title}'
    },
    marketplace: {
        titleTemplate: 'שוק קהילתי - Taste of the Caucasus | מורשת ג\'והורי',
        description: 'שוק האוכל הג\'והורי - מצאו בשלנים ומאכלים קווקזיים אותנטיים באזורכם'
    },
    vendor: {
        titleTemplate: '{name} - שוק | מורשת ג\'והורי',
        description: '{name} בשוק הקהילתי'
    },
    tutor: {
        titleTemplate: 'מורה פרטי AI - לימוד ג\'והורי | מורשת ג\'והורי',
        description: 'למד ג\'והורי עם מורה פרטי מבוסס AI'
    },
    family: {
        titleTemplate: 'שורשים - רשת קהילתית | מורשת ג\'והורי',
        description: 'גלה את הקשרים בין משפחות הקהילה הג\'והורית'
    }
};

// GET /api/admin/seo/meta-defaults - Get meta templates
router.get('/meta-defaults', authenticate, requireAdmin, async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT setting_value FROM seo_settings WHERE setting_key = 'meta_defaults'`
        );
        if (rows.length > 0) {
            try {
                return res.json(JSON.parse(rows[0].setting_value));
            } catch { /* fall through */ }
        }
        res.json(DEFAULT_META);
    } catch (err) {
        if (err.code === 'ER_NO_SUCH_TABLE') {
            return res.json(DEFAULT_META);
        }
        console.error('Meta defaults error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת תבניות meta' });
    }
});

// PUT /api/admin/seo/meta-defaults - Update meta templates
router.put('/meta-defaults', authenticate, requireAdmin, async (req, res) => {
    try {
        const meta = req.body;
        await pool.query(
            `INSERT INTO seo_settings (setting_key, setting_value, updated_by)
             VALUES ('meta_defaults', ?, ?)
             ON DUPLICATE KEY UPDATE
                setting_value = VALUES(setting_value),
                updated_by = VALUES(updated_by),
                updated_at = CURRENT_TIMESTAMP`,
            [JSON.stringify(meta), req.user.id]
        );

        await pool.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name)
             VALUES ('SEO_META_CHANGED', 'תבניות Meta עודכנו', ?, ?)`,
            [req.user.id, req.user.name]
        );

        res.json({ success: true });
    } catch (err) {
        console.error('Meta defaults update error:', err);
        res.status(500).json({ error: 'שגיאה בעדכון תבניות meta' });
    }
});

module.exports = router;
