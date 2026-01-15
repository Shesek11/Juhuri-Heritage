const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

// Get all approved recipes (public)
router.get('/', async (req, res) => {
    try {
        const { region, tag, search, sort = 'newest', page = 1, limit = 12 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT r.*, 
                   u.name as author_name,
                   u.avatar as author_avatar,
                   d.name as region_name,
                   (SELECT url FROM recipe_photos WHERE recipe_id = r.id AND is_main = 1 LIMIT 1) as main_photo,
                   (SELECT COUNT(*) FROM recipe_likes WHERE recipe_id = r.id) as like_count,
                   (SELECT COUNT(*) FROM recipe_comments WHERE recipe_id = r.id) as comment_count
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN dialects d ON r.region_id = d.id
            WHERE r.is_approved = 1
        `;

        const params = [];

        if (region) {
            query += ' AND r.region_id = ?';
            params.push(region);
        }

        if (search) {
            query += ' AND (r.title LIKE ? OR r.description LIKE ? OR r.title_juhuri LIKE ?)';
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        if (tag) {
            query += ` AND r.id IN (SELECT recipe_id FROM recipe_tag_map WHERE tag_id = ?)`;
            params.push(tag);
        }

        // Sorting
        switch (sort) {
            case 'popular':
                query += ' ORDER BY r.view_count DESC';
                break;
            case 'likes':
                query += ' ORDER BY like_count DESC';
                break;
            case 'oldest':
                query += ' ORDER BY r.created_at ASC';
                break;
            default:
                query += ' ORDER BY r.created_at DESC';
        }

        query += ' LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [recipes] = await pool.query(query, params);

        // Get total count for pagination
        const [countResult] = await pool.query(
            'SELECT COUNT(*) as total FROM recipes WHERE is_approved = 1'
        );

        res.json({
            recipes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (err) {
        console.error('Error fetching recipes:', err);
        res.status(500).json({ error: 'שגיאה בטעינת המתכונים' });
    }
});

// Get single recipe by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Increment view count
        await pool.query('UPDATE recipes SET view_count = view_count + 1 WHERE id = ?', [id]);

        // Get recipe details
        const [recipes] = await pool.query(`
            SELECT r.*, 
                   u.name as author_name,
                   u.avatar as author_avatar,
                   d.name as region_name
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN dialects d ON r.region_id = d.id
            WHERE r.id = ? AND (r.is_approved = 1 OR r.user_id = ?)
        `, [id, req.user?.id || 0]);

        if (!recipes.length) {
            return res.status(404).json({ error: 'מתכון לא נמצא' });
        }

        const recipe = recipes[0];

        // Get photos
        const [photos] = await pool.query(
            'SELECT * FROM recipe_photos WHERE recipe_id = ? ORDER BY is_main DESC',
            [id]
        );

        // Get tags
        const [tags] = await pool.query(`
            SELECT t.* FROM recipe_tags t
            JOIN recipe_tag_map m ON t.id = m.tag_id
            WHERE m.recipe_id = ?
        `, [id]);

        // Get like count and check if current user liked
        const [likeData] = await pool.query(`
            SELECT 
                COUNT(*) as count,
                SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as user_liked
            FROM recipe_likes WHERE recipe_id = ?
        `, [req.user?.id || 0, id]);

        // Get comments
        const [comments] = await pool.query(`
            SELECT c.*, u.name as author_name, u.avatar as author_avatar
            FROM recipe_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.recipe_id = ?
            ORDER BY c.created_at DESC
            LIMIT 10
        `, [id]);

        res.json({
            ...recipe,
            photos,
            tags,
            likes: {
                count: likeData[0].count,
                userLiked: likeData[0].user_liked > 0
            },
            comments
        });
    } catch (err) {
        console.error('Error fetching recipe:', err);
        res.status(500).json({ error: 'שגיאה בטעינת המתכון' });
    }
});

// Create new recipe (authenticated)
router.post('/', authenticate, async (req, res) => {
    try {
        const {
            title,
            title_juhuri,
            description,
            story,
            ingredients,
            instructions,
            prep_time,
            cook_time,
            servings,
            difficulty,
            region_id,
            tags
        } = req.body;

        if (!title || !ingredients || !instructions) {
            return res.status(400).json({ error: 'חסרים שדות חובה' });
        }

        const [result] = await pool.query(`
            INSERT INTO recipes 
            (title, title_juhuri, description, story, ingredients, instructions, 
             prep_time, cook_time, servings, difficulty, region_id, user_id, is_approved)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            title,
            title_juhuri || null,
            description || null,
            story || null,
            JSON.stringify(ingredients),
            JSON.stringify(instructions),
            prep_time || null,
            cook_time || null,
            servings || null,
            difficulty || 'medium',
            region_id || null,
            req.user.id,
            req.user.role === 'admin' ? 1 : 0 // Auto-approve admin recipes
        ]);

        const recipeId = result.insertId;

        // Add tags if provided
        if (tags && tags.length > 0) {
            const tagValues = tags.map(tagId => [recipeId, tagId]);
            await pool.query(
                'INSERT INTO recipe_tag_map (recipe_id, tag_id) VALUES ?',
                [tagValues]
            );
        }

        res.status(201).json({
            success: true,
            recipe_id: recipeId,
            message: req.user.role === 'admin' ? 'המתכון נוצר ואושר' : 'המתכון נשלח לאישור'
        });
    } catch (err) {
        console.error('Error creating recipe:', err);
        res.status(500).json({ error: 'שגיאה ביצירת המתכון' });
    }
});

// Update recipe (owner or admin)
router.put('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const [existing] = await pool.query(
            'SELECT user_id FROM recipes WHERE id = ?',
            [id]
        );

        if (!existing.length) {
            return res.status(404).json({ error: 'מתכון לא נמצא' });
        }

        if (existing[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'אין הרשאה לערוך מתכון זה' });
        }

        const {
            title,
            title_juhuri,
            description,
            story,
            ingredients,
            instructions,
            prep_time,
            cook_time,
            servings,
            difficulty,
            region_id,
            tags
        } = req.body;

        await pool.query(`
            UPDATE recipes SET
                title = ?,
                title_juhuri = ?,
                description = ?,
                story = ?,
                ingredients = ?,
                instructions = ?,
                prep_time = ?,
                cook_time = ?,
                servings = ?,
                difficulty = ?,
                region_id = ?
            WHERE id = ?
        `, [
            title,
            title_juhuri || null,
            description || null,
            story || null,
            JSON.stringify(ingredients),
            JSON.stringify(instructions),
            prep_time || null,
            cook_time || null,
            servings || null,
            difficulty || 'medium',
            region_id || null,
            id
        ]);

        // Update tags
        if (tags) {
            await pool.query('DELETE FROM recipe_tag_map WHERE recipe_id = ?', [id]);
            if (tags.length > 0) {
                const tagValues = tags.map(tagId => [id, tagId]);
                await pool.query(
                    'INSERT INTO recipe_tag_map (recipe_id, tag_id) VALUES ?',
                    [tagValues]
                );
            }
        }

        res.json({ success: true, message: 'המתכון עודכן בהצלחה' });
    } catch (err) {
        console.error('Error updating recipe:', err);
        res.status(500).json({ error: 'שגיאה בעדכון המתכון' });
    }
});

// Delete recipe (owner or admin)
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.query(
            'SELECT user_id FROM recipes WHERE id = ?',
            [id]
        );

        if (!existing.length) {
            return res.status(404).json({ error: 'מתכון לא נמצא' });
        }

        if (existing[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'אין הרשאה למחוק מתכון זה' });
        }

        await pool.query('DELETE FROM recipes WHERE id = ?', [id]);

        res.json({ success: true, message: 'המתכון נמחק' });
    } catch (err) {
        console.error('Error deleting recipe:', err);
        res.status(500).json({ error: 'שגיאה במחיקת המתכון' });
    }
});

// Like/unlike recipe
router.post('/:id/like', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if already liked
        const [existing] = await pool.query(
            'SELECT * FROM recipe_likes WHERE user_id = ? AND recipe_id = ?',
            [req.user.id, id]
        );

        if (existing.length) {
            // Unlike
            await pool.query(
                'DELETE FROM recipe_likes WHERE user_id = ? AND recipe_id = ?',
                [req.user.id, id]
            );
            res.json({ liked: false });
        } else {
            // Like
            await pool.query(
                'INSERT INTO recipe_likes (user_id, recipe_id) VALUES (?, ?)',
                [req.user.id, id]
            );
            res.json({ liked: true });
        }
    } catch (err) {
        console.error('Error toggling like:', err);
        res.status(500).json({ error: 'שגיאה' });
    }
});

// Add comment
router.post('/:id/comments', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content || content.trim().length === 0) {
            return res.status(400).json({ error: 'תוכן התגובה חסר' });
        }

        const [result] = await pool.query(
            'INSERT INTO recipe_comments (recipe_id, user_id, content) VALUES (?, ?, ?)',
            [id, req.user.id, content.trim()]
        );

        res.status(201).json({
            id: result.insertId,
            content: content.trim(),
            author_name: req.user.name,
            created_at: new Date()
        });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'שגיאה בהוספת תגובה' });
    }
});

// Get all tags
router.get('/meta/tags', async (req, res) => {
    try {
        const [tags] = await pool.query('SELECT * FROM recipe_tags ORDER BY name_hebrew');
        res.json(tags);
    } catch (err) {
        console.error('Error fetching tags:', err);
        res.status(500).json({ error: 'שגיאה בטעינת התגיות' });
    }
});

// Admin: Get pending recipes
router.get('/admin/pending', authenticate, requireRole(['admin', 'moderator']), async (req, res) => {
    try {
        const [recipes] = await pool.query(`
            SELECT r.*, u.name as author_name
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.is_approved = 0
            ORDER BY r.created_at DESC
        `);
        res.json(recipes);
    } catch (err) {
        console.error('Error fetching pending recipes:', err);
        res.status(500).json({ error: 'שגיאה בטעינת מתכונים ממתינים' });
    }
});

// Admin: Approve recipe
router.post('/admin/:id/approve', authenticate, requireRole(['admin', 'moderator']), async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query('UPDATE recipes SET is_approved = 1 WHERE id = ?', [id]);

        // Log the action
        await pool.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
             VALUES ('APPROVAL', ?, ?, ?, ?)`,
            ['Recipe approved', req.user.id, req.user.name, JSON.stringify({ recipe_id: id })]
        );

        res.json({ success: true, message: 'המתכון אושר' });
    } catch (err) {
        console.error('Error approving recipe:', err);
        res.status(500).json({ error: 'שגיאה באישור המתכון' });
    }
});

module.exports = router;
