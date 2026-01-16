/**
 * Merge & Link Routes
 * Handles merge suggestions and link requests for community family tree
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

// =====================================================
// MERGE SUGGESTIONS
// =====================================================

// Get pending merge suggestions (for admins or involved users)
router.get('/suggestions', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        let query = `
            SELECT 
                ms.*,
                m1.first_name as member1_first, m1.last_name as member1_last, 
                m1.birth_date as member1_birth, m1.photo_url as member1_photo,
                m1.user_id as member1_owner,
                m2.first_name as member2_first, m2.last_name as member2_last, 
                m2.birth_date as member2_birth, m2.photo_url as member2_photo,
                m2.user_id as member2_owner,
                u.name as suggested_by_name
            FROM family_merge_suggestions ms
            JOIN family_members m1 ON ms.member1_id = m1.id
            JOIN family_members m2 ON ms.member2_id = m2.id
            LEFT JOIN users u ON ms.suggested_by = u.id
            WHERE ms.status = 'pending'
        `;

        // Non-admins can only see suggestions involving their own members
        if (!isAdmin) {
            query += ` AND (m1.user_id = ? OR m2.user_id = ?)`;
        }

        query += ` ORDER BY ms.confidence_score DESC, ms.suggested_at DESC LIMIT 50`;

        const params = isAdmin ? [] : [userId, userId];
        const [suggestions] = await pool.query(query, params);

        res.json(suggestions);
    } catch (err) {
        console.error('Error fetching merge suggestions:', err);
        res.status(500).json({ error: 'Failed to fetch suggestions' });
    }
});

// Create a merge suggestion
router.post('/suggestions', authenticate, async (req, res) => {
    try {
        const { member1_id, member2_id, reason } = req.body;

        if (!member1_id || !member2_id) {
            return res.status(400).json({ error: 'Both member IDs are required' });
        }

        if (member1_id === member2_id) {
            return res.status(400).json({ error: 'Cannot merge a person with themselves' });
        }

        // Check if suggestion already exists
        const [existing] = await pool.query(`
            SELECT id FROM family_merge_suggestions 
            WHERE ((member1_id = ? AND member2_id = ?) OR (member1_id = ? AND member2_id = ?))
            AND status = 'pending'
        `, [member1_id, member2_id, member2_id, member1_id]);

        if (existing.length > 0) {
            return res.status(400).json({ error: 'הצעת מיזוג כבר קיימת' });
        }

        // Calculate confidence score based on similarity
        const [members] = await pool.query(`
            SELECT id, first_name, last_name, birth_date, gender 
            FROM family_members WHERE id IN (?, ?)
        `, [member1_id, member2_id]);

        if (members.length !== 2) {
            return res.status(404).json({ error: 'One or both members not found' });
        }

        const m1 = members.find(m => m.id === member1_id);
        const m2 = members.find(m => m.id === member2_id);

        let score = 0;
        if (m1.last_name?.toLowerCase() === m2.last_name?.toLowerCase()) score += 0.3;
        if (m1.first_name?.toLowerCase() === m2.first_name?.toLowerCase()) score += 0.3;
        if (m1.birth_date && m2.birth_date &&
            new Date(m1.birth_date).getFullYear() === new Date(m2.birth_date).getFullYear()) score += 0.3;
        if (m1.gender === m2.gender) score += 0.1;

        const [result] = await pool.query(`
            INSERT INTO family_merge_suggestions 
            (member1_id, member2_id, suggested_by, confidence_score, reason)
            VALUES (?, ?, ?, ?, ?)
        `, [member1_id, member2_id, req.user.id, score, reason || null]);

        res.status(201).json({
            success: true,
            id: result.insertId,
            confidence_score: score
        });
    } catch (err) {
        console.error('Error creating merge suggestion:', err);
        res.status(500).json({ error: 'Failed to create suggestion' });
    }
});

// Approve or reject a merge suggestion
router.put('/suggestions/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, keepMemberId } = req.body; // status: 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get the suggestion
        const [suggestions] = await pool.query(`
            SELECT ms.*, m1.user_id as m1_owner, m2.user_id as m2_owner
            FROM family_merge_suggestions ms
            JOIN family_members m1 ON ms.member1_id = m1.id
            JOIN family_members m2 ON ms.member2_id = m2.id
            WHERE ms.id = ?
        `, [id]);

        if (suggestions.length === 0) {
            return res.status(404).json({ error: 'Suggestion not found' });
        }

        const suggestion = suggestions[0];

        // Check permission: admin OR owner of either member
        const isAdmin = req.user.role === 'admin';
        const isOwner = suggestion.m1_owner === req.user.id || suggestion.m2_owner === req.user.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'אין לך הרשאה לאשר מיזוג זה' });
        }

        if (status === 'approved') {
            if (!keepMemberId) {
                return res.status(400).json({ error: 'keepMemberId is required for approval' });
            }

            const removeMemberId = keepMemberId === suggestion.member1_id
                ? suggestion.member2_id
                : suggestion.member1_id;

            // Transfer all relationships to the kept member
            await pool.query('UPDATE family_parent_child SET parent_id = ? WHERE parent_id = ?',
                [keepMemberId, removeMemberId]);
            await pool.query('UPDATE family_parent_child SET child_id = ? WHERE child_id = ?',
                [keepMemberId, removeMemberId]);
            await pool.query('UPDATE family_partnerships SET person1_id = ? WHERE person1_id = ?',
                [keepMemberId, removeMemberId]);
            await pool.query('UPDATE family_partnerships SET person2_id = ? WHERE person2_id = ?',
                [keepMemberId, removeMemberId]);

            // Mark the removed member as merged (soft delete)
            await pool.query('UPDATE family_members SET merged_into = ? WHERE id = ?',
                [keepMemberId, removeMemberId]);

            // Log the merge in history
            await pool.query(`
                INSERT INTO family_member_history 
                (member_id, changed_by, change_type, old_value, new_value)
                VALUES (?, ?, 'merge', ?, ?)
            `, [keepMemberId, req.user.id, `Merged from ID ${removeMemberId}`, JSON.stringify({ mergedFrom: removeMemberId })]);
        }

        // Update suggestion status
        await pool.query(`
            UPDATE family_merge_suggestions 
            SET status = ?, reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ?
        `, [status, req.user.id, id]);

        res.json({ success: true, status });
    } catch (err) {
        console.error('Error updating merge suggestion:', err);
        res.status(500).json({ error: 'Failed to update suggestion' });
    }
});

// =====================================================
// LINK REQUESTS (Connect trees)
// =====================================================

// Get pending link requests for current user
router.get('/link-requests', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        let query = `
            SELECT 
                lr.*,
                sm.first_name as source_first, sm.last_name as source_last,
                tm.first_name as target_first, tm.last_name as target_last,
                tm.user_id as target_owner,
                u.name as requester_name
            FROM family_link_requests lr
            JOIN family_members sm ON lr.source_member_id = sm.id
            JOIN family_members tm ON lr.target_member_id = tm.id
            JOIN users u ON lr.requester_id = u.id
            WHERE lr.status = 'pending'
        `;

        // Non-admins see only requests to their members
        if (!isAdmin) {
            query += ` AND tm.user_id = ?`;
        }

        query += ` ORDER BY lr.created_at DESC`;

        const params = isAdmin ? [] : [userId];
        const [requests] = await pool.query(query, params);

        res.json(requests);
    } catch (err) {
        console.error('Error fetching link requests:', err);
        res.status(500).json({ error: 'Failed to fetch link requests' });
    }
});

// Create a link request
router.post('/link-requests', authenticate, async (req, res) => {
    try {
        const { source_member_id, target_member_id, relationship_type, message } = req.body;

        if (!source_member_id || !target_member_id || !relationship_type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify source member belongs to requester
        const [sourceMember] = await pool.query(
            'SELECT user_id FROM family_members WHERE id = ?', [source_member_id]
        );

        if (sourceMember.length === 0 || sourceMember[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'You can only create link requests from your own members' });
        }

        const [result] = await pool.query(`
            INSERT INTO family_link_requests 
            (requester_id, source_member_id, target_member_id, relationship_type, message)
            VALUES (?, ?, ?, ?, ?)
        `, [req.user.id, source_member_id, target_member_id, relationship_type, message || null]);

        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Error creating link request:', err);
        res.status(500).json({ error: 'Failed to create link request' });
    }
});

// Approve or reject a link request
router.put('/link-requests/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Get the request and verify permission
        const [requests] = await pool.query(`
            SELECT lr.*, tm.user_id as target_owner
            FROM family_link_requests lr
            JOIN family_members tm ON lr.target_member_id = tm.id
            WHERE lr.id = ?
        `, [id]);

        if (requests.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        const request = requests[0];
        const isAdmin = req.user.role === 'admin';
        const isOwner = request.target_owner === req.user.id;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ error: 'אין לך הרשאה לאשר בקשה זו' });
        }

        if (status === 'approved') {
            // Create the actual relationship
            const { source_member_id, target_member_id, relationship_type } = request;

            if (relationship_type === 'same_person') {
                // This becomes a merge - create merge suggestion
                await pool.query(`
                    INSERT INTO family_merge_suggestions 
                    (member1_id, member2_id, suggested_by, confidence_score, reason, status, reviewed_by, reviewed_at)
                    VALUES (?, ?, ?, 0.9, 'מבקשת חיבור אושרה', 'pending', NULL, NULL)
                `, [source_member_id, target_member_id, request.requester_id]);
            } else if (relationship_type === 'parent') {
                await pool.query(`
                    INSERT INTO family_parent_child (parent_id, child_id, relationship_type)
                    VALUES (?, ?, 'biological')
                `, [source_member_id, target_member_id]);
            } else if (relationship_type === 'child') {
                await pool.query(`
                    INSERT INTO family_parent_child (parent_id, child_id, relationship_type)
                    VALUES (?, ?, 'biological')
                `, [target_member_id, source_member_id]);
            } else if (relationship_type === 'spouse') {
                await pool.query(`
                    INSERT INTO family_partnerships (person1_id, person2_id, status)
                    VALUES (?, ?, 'married')
                `, [Math.min(source_member_id, target_member_id), Math.max(source_member_id, target_member_id)]);
            }
        }

        await pool.query(`
            UPDATE family_link_requests 
            SET status = ?, reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ?
        `, [status, req.user.id, id]);

        res.json({ success: true, status });
    } catch (err) {
        console.error('Error updating link request:', err);
        res.status(500).json({ error: 'Failed to update link request' });
    }
});

// =====================================================
// DUPLICATE DETECTION
// =====================================================

// Find potential duplicates for a member
router.get('/duplicates/:memberId', authenticate, async (req, res) => {
    try {
        const { memberId } = req.params;

        // Get the member details
        const [members] = await pool.query(
            'SELECT * FROM family_members WHERE id = ?', [memberId]
        );

        if (members.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }

        const member = members[0];

        // Find similar members using Soundex and other criteria
        const [duplicates] = await pool.query(`
            SELECT *,
                (
                    (SOUNDEX(last_name) = SOUNDEX(?)) * 30 +
                    (SOUNDEX(first_name) = SOUNDEX(?)) * 30 +
                    (gender = ?) * 10 +
                    (YEAR(birth_date) = YEAR(?)) * 30
                ) as similarity_score
            FROM family_members
            WHERE id != ?
              AND merged_into IS NULL
              AND (
                  SOUNDEX(last_name) = SOUNDEX(?)
                  OR (SOUNDEX(first_name) = SOUNDEX(?) AND YEAR(birth_date) = YEAR(?))
              )
            HAVING similarity_score >= 50
            ORDER BY similarity_score DESC
            LIMIT 10
        `, [
            member.last_name, member.first_name, member.gender, member.birth_date,
            memberId,
            member.last_name, member.first_name, member.birth_date
        ]);

        res.json(duplicates);
    } catch (err) {
        console.error('Error finding duplicates:', err);
        res.status(500).json({ error: 'Failed to find duplicates' });
    }
});

// Search members with Soundex (phonetic search)
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        if (!q || q.length < 2) {
            return res.json([]);
        }

        const [results] = await pool.query(`
            SELECT id, first_name, last_name, birth_date, photo_url, gender,
                CASE 
                    WHEN last_name = ? OR first_name = ? THEN 100
                    WHEN SOUNDEX(last_name) = SOUNDEX(?) OR SOUNDEX(first_name) = SOUNDEX(?) THEN 80
                    WHEN last_name LIKE ? OR first_name LIKE ? THEN 60
                END as match_score
            FROM family_members
            WHERE merged_into IS NULL
              AND (
                  last_name LIKE ?
                  OR first_name LIKE ?
                  OR SOUNDEX(last_name) = SOUNDEX(?)
                  OR SOUNDEX(first_name) = SOUNDEX(?)
              )
            ORDER BY match_score DESC, last_name, first_name
            LIMIT ?
        `, [q, q, q, q, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, q, q, parseInt(limit)]);

        res.json(results);
    } catch (err) {
        console.error('Error searching members:', err);
        res.status(500).json({ error: 'Failed to search' });
    }
});

module.exports = router;
