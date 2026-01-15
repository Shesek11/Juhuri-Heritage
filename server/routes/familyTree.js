const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Get all family members (searchable)
router.get('/members', async (req, res) => {
    try {
        const { search, alive_only } = req.query;
        let query = 'SELECT * FROM family_members WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR maiden_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
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

// Get a single member with immediate relationships
router.get('/members/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Get Main Member
        const [members] = await pool.query('SELECT * FROM family_members WHERE id = ?', [id]);
        if (members.length === 0) return res.status(404).json({ error: 'Member not found' });
        const member = members[0];

        // Get Parents
        let father = null, mother = null;
        if (member.father_id) {
            const [f] = await pool.query('SELECT * FROM family_members WHERE id = ?', [member.father_id]);
            father = f[0];
        }
        if (member.mother_id) {
            const [m] = await pool.query('SELECT * FROM family_members WHERE id = ?', [member.mother_id]);
            mother = m[0];
        }

        // Get Spouse
        let spouse = null;
        if (member.spouse_id) {
            const [s] = await pool.query('SELECT * FROM family_members WHERE id = ?', [member.spouse_id]);
            spouse = s[0];
        }

        // Get Children
        const [children] = await pool.query(
            'SELECT * FROM family_members WHERE father_id = ? OR mother_id = ?',
            [id, id]
        );

        res.json({
            ...member,
            father,
            mother,
            spouse,
            children
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
            first_name, last_name, maiden_name, gender,
            birth_date, death_date, birth_place, death_place,
            biography, photo_url, father_id, mother_id, spouse_id, is_alive
        } = req.body;

        const [result] = await pool.query(`
            INSERT INTO family_members 
            (user_id, first_name, last_name, maiden_name, gender, birth_date, death_date, birth_place, death_place, biography, photo_url, father_id, mother_id, spouse_id, is_alive)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.user.id, first_name, last_name, maiden_name, gender,
            birth_date || null, death_date || null, birth_place, death_place,
            biography, photo_url, father_id || null, mother_id || null, spouse_id || null, is_alive ? 1 : 0
        ]);

        // If spouse is set, update the spouse's spouse_id to match (bidirectional)
        if (spouse_id) {
            await pool.query('UPDATE family_members SET spouse_id = ? WHERE id = ?', [result.insertId, spouse_id]);
        }

        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create member' });
    }
});

// Update Member (authenticated)
router.put('/members/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            first_name, last_name, maiden_name, gender,
            birth_date, death_date, birth_place, death_place,
            biography, photo_url, father_id, mother_id, spouse_id, is_alive
        } = req.body;

        await pool.query(`
            UPDATE family_members SET
            first_name=?, last_name=?, maiden_name=?, gender=?, 
            birth_date=?, death_date=?, birth_place=?, death_place=?, 
            biography=?, photo_url=?, father_id=?, mother_id=?, spouse_id=?, is_alive=?
            WHERE id=?
        `, [
            first_name, last_name, maiden_name, gender,
            birth_date || null, death_date || null, birth_place, death_place,
            biography, photo_url, father_id || null, mother_id || null, spouse_id || null, is_alive ? 1 : 0,
            id
        ]);

        if (spouse_id) {
            await pool.query('UPDATE family_members SET spouse_id = ? WHERE id = ?', [id, spouse_id]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update member' });
    }
});

// Get Full Tree (Graph structure)
router.get('/tree/:rootId', async (req, res) => {
    // This is complex. For now, we will fetch up to 3 generations up and down.
    // Or we can just fetch ALL members if the DB is small (limit 500?)
    // Let's fetch all linked nodes for simple MVP.
    try {
        const [allMembers] = await pool.query('SELECT id, first_name, last_name, gender, photo_url, father_id, mother_id, spouse_id FROM family_members LIMIT 1000');
        res.json(allMembers);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tree' });
    }
});

module.exports = router;
