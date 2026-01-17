const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

// =====================================================
// MEMBER CRUD
// =====================================================

// Debug route to clear all family data (Remove in production later!)
router.get('/debug/reset-tree', async (req, res) => {
    try {
        await pool.query('DELETE FROM parent_child_relationships');
        await pool.query('DELETE FROM partnerships');
        await pool.query('DELETE FROM family_members');
        await pool.query('DELETE FROM family_parent_child');
        await pool.query('DELETE FROM family_partnerships');
        res.json({ message: '✅ Family tree cleared successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Get all family members (searchable)
router.get('/members', async (req, res) => {
    try {
        const { search, alive_only } = req.query;
        let query = 'SELECT * FROM family_members WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR maiden_name LIKE ? OR nickname LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (alive_only === 'true') {
            query += ' AND is_alive = 1';
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const [members] = await pool.query(query, params);
        res.json(members);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch family members' });
    }
});

// Get a single member with relationships
router.get('/members/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get Main Member
        const [members] = await pool.query('SELECT * FROM family_members WHERE id = ?', [id]);
        if (members.length === 0) return res.status(404).json({ error: 'Member not found' });
        const member = members[0];

        // Get Parents from relationship table
        const [parents] = await pool.query(`
            SELECT pc.*, fm.* 
            FROM family_parent_child pc
            JOIN family_members fm ON pc.parent_id = fm.id
            WHERE pc.child_id = ?
        `, [id]);

        // Get Children from relationship table
        const [children] = await pool.query(`
            SELECT pc.*, fm.* 
            FROM family_parent_child pc
            JOIN family_members fm ON pc.child_id = fm.id
            WHERE pc.parent_id = ?
        `, [id]);

        // Get Partnerships
        const [partnerships] = await pool.query(`
            SELECT 
                p.*,
                CASE 
                    WHEN p.person1_id = ? THEN fm2.id
                    ELSE fm1.id
                END as partner_id,
                CASE 
                    WHEN p.person1_id = ? THEN fm2.first_name
                    ELSE fm1.first_name
                END as partner_first_name,
                CASE 
                    WHEN p.person1_id = ? THEN fm2.last_name
                    ELSE fm1.last_name
                END as partner_last_name,
                CASE 
                    WHEN p.person1_id = ? THEN fm2.photo_url
                    ELSE fm1.photo_url
                END as partner_photo_url,
                CASE 
                    WHEN p.person1_id = ? THEN fm2.gender
                    ELSE fm1.gender
                END as partner_gender
            FROM family_partnerships p
            JOIN family_members fm1 ON p.person1_id = fm1.id
            JOIN family_members fm2 ON p.person2_id = fm2.id
            WHERE p.person1_id = ? OR p.person2_id = ?
            ORDER BY p.start_date DESC
        `, [id, id, id, id, id, id, id]);

        res.json({
            ...member,
            parents: parents.map(p => ({
                id: p.id,
                parent_id: p.parent_id,
                relationship_type: p.relationship_type,
                parent: {
                    id: p.parent_id,
                    first_name: p.first_name,
                    last_name: p.last_name,
                    photo_url: p.photo_url,
                    gender: p.gender
                }
            })),
            children: children.map(c => ({
                id: c.id,
                child_id: c.child_id,
                relationship_type: c.relationship_type,
                child: {
                    id: c.child_id,
                    first_name: c.first_name,
                    last_name: c.last_name,
                    photo_url: c.photo_url,
                    gender: c.gender
                }
            })),
            partnerships: partnerships.map(p => ({
                id: p.id,
                status: p.status,
                start_date: p.start_date,
                end_date: p.end_date,
                marriage_place: p.marriage_place,
                partner: {
                    id: p.partner_id,
                    first_name: p.partner_first_name,
                    last_name: p.partner_last_name,
                    photo_url: p.partner_photo_url,
                    gender: p.partner_gender
                }
            }))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch member details' });
    }
});

// Create Member (authenticated)
router.post('/members', authenticate, async (req, res) => {
    try {
        const {
            first_name, last_name, maiden_name, nickname, previous_name, title,
            gender, birth_date, death_date, birth_place, death_place,
            biography, photo_url, is_alive
        } = req.body;

        const [result] = await pool.query(`
            INSERT INTO family_members 
            (user_id, first_name, last_name, maiden_name, nickname, previous_name, title, 
             gender, birth_date, death_date, birth_place, death_place, biography, photo_url, is_alive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, first_name, last_name, maiden_name, nickname, previous_name, title,
            gender, birth_date || null, death_date || null, birth_place, death_place,
            biography, photo_url, is_alive ? 1 : 0
        ]);

        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

// Update Member (authenticated, owner only)
router.put('/members/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const [existing] = await pool.query('SELECT user_id FROM family_members WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'בן משפחה לא נמצא' });
        }
        if (existing[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'אין הרשאה לערוך בן משפחה זה' });
        }

        const {
            first_name, last_name, maiden_name, nickname, previous_name, title,
            gender, birth_date, death_date, birth_place, death_place,
            biography, photo_url, is_alive
        } = req.body;

        await pool.query(`
            UPDATE family_members SET
            first_name=?, last_name=?, maiden_name=?, nickname=?, previous_name=?, title=?,
            gender=?, birth_date=?, death_date=?, birth_place=?, death_place=?, 
            biography=?, photo_url=?, is_alive=?
            WHERE id=?
        `, [
            first_name, last_name, maiden_name, nickname, previous_name, title,
            gender, birth_date || null, death_date || null, birth_place, death_place,
            biography, photo_url, is_alive ? 1 : 0, id
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Delete Member (authenticated, owner only)
router.delete('/members/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const [existing] = await pool.query('SELECT user_id FROM family_members WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ error: 'בן משפחה לא נמצא' });
        }
        if (existing[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'אין הרשאה למחוק בן משפחה זה' });
        }

        await pool.query('DELETE FROM family_members WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete member' });
    }
});

// =====================================================
// PARENT-CHILD RELATIONSHIPS
// =====================================================

// Add parent-child relationship
router.post('/relationships/parent-child', authenticate, async (req, res) => {
    try {
        const { parent_id, child_id, relationship_type, notes } = req.body;

        // Validate both exist
        const [parent] = await pool.query('SELECT id FROM family_members WHERE id = ?', [parent_id]);
        const [child] = await pool.query('SELECT id FROM family_members WHERE id = ?', [child_id]);

        if (parent.length === 0 || child.length === 0) {
            return res.status(400).json({ error: 'הורה או ילד לא נמצאו' });
        }

        const [result] = await pool.query(`
            INSERT INTO family_parent_child (parent_id, child_id, relationship_type, notes)
            VALUES (?, ?, ?, ?)
        `, [parent_id, child_id, relationship_type || 'biological', notes]);

        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'קשר זה כבר קיים' });
        }
        console.error(err);
        res.status(500).json({ error: 'Failed to create relationship' });
    }
});

// Remove parent-child relationship
router.delete('/relationships/parent-child/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM family_parent_child WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete relationship' });
    }
});

// Get parents of a member
router.get('/members/:id/parents', async (req, res) => {
    try {
        const { id } = req.params;
        const [parents] = await pool.query(`
            SELECT pc.*, fm.first_name, fm.last_name, fm.photo_url, fm.gender
            FROM family_parent_child pc
            JOIN family_members fm ON pc.parent_id = fm.id
            WHERE pc.child_id = ?
        `, [id]);
        res.json(parents);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch parents' });
    }
});

// Get children of a member
router.get('/members/:id/children', async (req, res) => {
    try {
        const { id } = req.params;
        const [children] = await pool.query(`
            SELECT pc.*, fm.first_name, fm.last_name, fm.photo_url, fm.gender, fm.birth_date
            FROM family_parent_child pc
            JOIN family_members fm ON pc.child_id = fm.id
            WHERE pc.parent_id = ?
            ORDER BY fm.birth_date
        `, [id]);
        res.json(children);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch children' });
    }
});

// =====================================================
// PARTNERSHIPS
// =====================================================

// Add partnership
router.post('/relationships/partnership', authenticate, async (req, res) => {
    try {
        const { person1_id, person2_id, status, start_date, end_date, marriage_place, notes } = req.body;

        // Always store with smaller ID first for consistency
        const p1 = Math.min(person1_id, person2_id);
        const p2 = Math.max(person1_id, person2_id);

        const [result] = await pool.query(`
            INSERT INTO family_partnerships (person1_id, person2_id, status, start_date, end_date, marriage_place, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [p1, p2, status, start_date || null, end_date || null, marriage_place, notes]);

        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create partnership' });
    }
});

// Update partnership
router.put('/relationships/partnership/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, start_date, end_date, marriage_place, notes } = req.body;

        await pool.query(`
            UPDATE family_partnerships SET
            status=?, start_date=?, end_date=?, marriage_place=?, notes=?
            WHERE id=?
        `, [status, start_date || null, end_date || null, marriage_place, notes, id]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update partnership' });
    }
});

// Remove partnership
router.delete('/relationships/partnership/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM family_partnerships WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete partnership' });
    }
});

// Get partnerships of a member
router.get('/members/:id/partnerships', async (req, res) => {
    try {
        const { id } = req.params;
        const [partnerships] = await pool.query(`
            SELECT 
                p.*,
                CASE WHEN p.person1_id = ? THEN fm2.id ELSE fm1.id END as partner_id,
                CASE WHEN p.person1_id = ? THEN fm2.first_name ELSE fm1.first_name END as partner_first_name,
                CASE WHEN p.person1_id = ? THEN fm2.last_name ELSE fm1.last_name END as partner_last_name,
                CASE WHEN p.person1_id = ? THEN fm2.photo_url ELSE fm1.photo_url END as partner_photo_url
            FROM family_partnerships p
            JOIN family_members fm1 ON p.person1_id = fm1.id
            JOIN family_members fm2 ON p.person2_id = fm2.id
            WHERE p.person1_id = ? OR p.person2_id = ?
            ORDER BY p.start_date DESC
        `, [id, id, id, id, id, id]);
        res.json(partnerships);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch partnerships' });
    }
});

// =====================================================
// SIBLINGS (Calculated)
// =====================================================

router.get('/members/:id/siblings', async (req, res) => {
    try {
        const { id } = req.params;

        // Get parents of this member
        const [myParents] = await pool.query(`
            SELECT parent_id, relationship_type FROM family_parent_child WHERE child_id = ?
        `, [id]);

        if (myParents.length === 0) {
            return res.json({ full: [], half: [], step: [] });
        }

        const parentIds = myParents.map(p => p.parent_id);

        // Find all children of my parents (excluding me)
        const [potentialSiblings] = await pool.query(`
            SELECT DISTINCT 
                pc.child_id,
                fm.*,
                GROUP_CONCAT(DISTINCT pc.parent_id) as shared_parents
            FROM family_parent_child pc
            JOIN family_members fm ON pc.child_id = fm.id
            WHERE pc.parent_id IN (?) AND pc.child_id != ?
            GROUP BY pc.child_id
        `, [parentIds, id]);

        const full = [];
        const half = [];
        const step = [];

        for (const sibling of potentialSiblings) {
            const sharedParentIds = sibling.shared_parents.split(',').map(Number);
            const sharedCount = sharedParentIds.filter(pid => parentIds.includes(pid)).length;

            if (sharedCount >= 2) {
                full.push(sibling);
            } else if (sharedCount === 1) {
                half.push(sibling);
            }
        }

        // Step siblings: children of my parents' partners who are not biologically related
        // This is more complex and we'll implement a simpler version

        res.json({ full, half, step });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to calculate siblings' });
    }
});

// =====================================================
// TREE DATA
// =====================================================

// Get Full Tree (Graph structure)
router.get('/tree/:rootId', async (req, res) => {
    try {
        // Get all members with basic info
        const [allMembers] = await pool.query(`
            SELECT id, user_id, first_name, last_name, maiden_name, nickname, title,
                   gender, photo_url, birth_date, is_alive
            FROM family_members 
            LIMIT 1000
        `);

        // Get all parent-child relationships
        const [parentChildRels] = await pool.query(`
            SELECT parent_id, child_id, relationship_type FROM family_parent_child
        `);

        // Get all partnerships
        const [partnerships] = await pool.query(`
            SELECT person1_id, person2_id, status FROM family_partnerships
        `);

        res.json({
            members: allMembers,
            parentChild: parentChildRels,
            partnerships: partnerships
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tree' });
    }
});

module.exports = router;
