const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/auth');

// Helper to calculate distance
const haversineDistance = (lat1, lon1, lat2, lon2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Get all active vendors (public)
router.get('/vendors', async (req, res) => {
    try {
        const { lat, lng, radius_km = 50, search } = req.query;

        // Basic query
        let query = `
            SELECT v.*, u.name as owner_name, u.avatar as owner_avatar
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.is_active = 1
        `;
        const params = [];

        if (search) {
            query += ' AND (v.business_name LIKE ? OR v.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        const [vendors] = await pool.query(query, params);

        // Filter by location if coords provided
        let results = vendors;
        if (lat && lng) {
            results = vendors.map(v => {
                const dist = haversineDistance(parseFloat(lat), parseFloat(lng), v.latitude, v.longitude);
                return { ...v, distance_km: dist };
            }).filter(v => v.distance_km <= radius_km)
                .sort((a, b) => a.distance_km - b.distance_km);
        }

        res.json(results);
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ error: 'שגיאה בטעינת המוכרים' });
    }
});

// Get vendor details and menu
router.get('/vendors/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [vendors] = await pool.query(`
            SELECT v.*, u.name as owner_name, u.avatar as owner_avatar
            FROM vendors v
            JOIN users u ON v.user_id = u.id
            WHERE v.id = ?
        `, [id]);

        if (vendors.length === 0) {
            return res.status(404).json({ error: 'עסק לא נמצא' });
        }

        const vendor = vendors[0];

        // Get menu items
        const [menuItems] = await pool.query(
            'SELECT * FROM menu_items WHERE vendor_id = ? AND is_available = 1',
            [id]
        );

        res.json({ ...vendor, menu: menuItems });
    } catch (err) {
        console.error('Error fetching vendor:', err);
        res.status(500).json({ error: 'שגיאה בטעינת העסק' });
    }
});

// Register as a vendor (authenticated)
router.post('/vendors', authenticate, async (req, res) => {
    try {
        const { business_name, description, phone, address, latitude, longitude, cover_image } = req.body;

        // Check if user already has a vendor profile
        const [existing] = await pool.query('SELECT id FROM vendors WHERE user_id = ?', [req.user.id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'כבר קיים פרופיל עסק למשתמש זה' });
        }

        const [result] = await pool.query(`
            INSERT INTO vendors 
            (user_id, business_name, description, phone, address, latitude, longitude, cover_image, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [req.user.id, business_name, description, phone, address, latitude || 0, longitude || 0, cover_image]);

        res.status(201).json({ success: true, vendor_id: result.insertId });
    } catch (err) {
        console.error('Error creating vendor:', err);
        res.status(500).json({ error: 'שגיאה ביצירת העסק' });
    }
});

// Update vendor profile (owner)
router.put('/vendors/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { business_name, description, phone, address, latitude, longitude, is_open, opening_hours } = req.body;

        // Check ownership
        const [vendor] = await pool.query('SELECT user_id FROM vendors WHERE id = ?', [id]);
        if (!vendor.length || (vendor[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        await pool.query(`
            UPDATE vendors SET
            business_name = ?, description = ?, phone = ?, address = ?, 
            latitude = ?, longitude = ?, is_open = ?, opening_hours = ?
            WHERE id = ?
        `, [
            business_name, description, phone, address,
            latitude, longitude, is_open ? 1 : 0,
            opening_hours ? JSON.stringify(opening_hours) : null,
            id
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating vendor:', err);
        res.status(500).json({ error: 'שגיאה בעדכון הפרטים' });
    }
});

// Add menu item (owner)
router.post('/vendors/:id/menu', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, image_url, category } = req.body;

        // Check ownership
        const [vendor] = await pool.query('SELECT user_id FROM vendors WHERE id = ?', [id]);
        if (!vendor.length || (vendor[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        await pool.query(`
            INSERT INTO menu_items (vendor_id, title, description, price, image_url, category)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [id, title, description, price, image_url, category || 'main']);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Error adding menu item:', err);
        res.status(500).json({ error: 'שגיאה בהוספת מנה' });
    }
});

// Send Inquiry (authenticated)
router.post('/inquiries', authenticate, async (req, res) => {
    try {
        const { vendor_id, message, items } = req.body;

        await pool.query(`
            INSERT INTO vendor_inquiries (vendor_id, user_id, message, items_interested)
            VALUES (?, ?, ?, ?)
        `, [vendor_id, req.user.id, message, JSON.stringify(items || [])]);

        res.status(201).json({ success: true, message: 'ההודעה נשלחה למבשל/ת' });
    } catch (err) {
        console.error('Error sending inquiry:', err);
        res.status(500).json({ error: 'שגיאה בשליחת ההודעה' });
    }
});

// Get Vendor Inquiries (Owner)
router.get('/vendors/:id/inquiries', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const [vendor] = await pool.query('SELECT user_id FROM vendors WHERE id = ?', [id]);
        if (!vendor.length || (vendor[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        const [inquiries] = await pool.query(`
            SELECT i.*, u.name as user_name, u.email as user_email, u.phone as user_phone
            FROM vendor_inquiries i
            JOIN users u ON i.user_id = u.id
            WHERE i.vendor_id = ?
            ORDER BY i.created_at DESC
        `, [id]);

        res.json(inquiries);
    } catch (err) {
        console.error('Error fetching inquiries:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הודעות' });
    }
});

module.exports = router;
