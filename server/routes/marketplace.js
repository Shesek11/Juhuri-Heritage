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

// =====================================================
// VENDORS ROUTES
// =====================================================

// Get all vendors (public, with filters)
router.get('/vendors', async (req, res) => {
    try {
        const { lat, lng, radius_km = 50, search, status = 'active' } = req.query;

        // Only select public-safe fields — never expose phone, email, or full address
        let query = `
            SELECT v.id, v.slug, v.name, v.logo_url, v.cover_url,
                   v.about_text, v.city, v.specialty, v.category,
                   v.delivery_available, v.kosher_certified,
                   v.latitude, v.longitude,
                   COALESCE(vs.average_rating, 0) as avg_rating,
                   COALESCE(vs.total_reviews, 0) as review_count
            FROM marketplace_vendors v
            LEFT JOIN marketplace_vendor_stats vs ON v.id = vs.vendor_id
            WHERE v.is_active = 1
        `;
        const params = [];

        if (status !== 'all') {
            query += ' AND v.status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (v.name LIKE ? OR v.about_text LIKE ? OR v.city LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const [vendors] = await pool.query(query, params);

        // Filter by location if coords provided
        let results = vendors;
        if (lat && lng) {
            results = vendors
                .map(v => {
                    if (!v.latitude || !v.longitude) return null;
                    const dist = haversineDistance(parseFloat(lat), parseFloat(lng), v.latitude, v.longitude);
                    return { ...v, distance_km: dist };
                })
                .filter(v => v && v.distance_km <= radius_km)
                .sort((a, b) => a.distance_km - b.distance_km);
        }

        res.json(results);
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ error: 'שגיאה בטעינת החנויות' });
    }
});

// Get single vendor by slug (public)
router.get('/vendors/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        // Exclude sensitive fields (email, phone) from public vendor detail
        const [vendors] = await pool.query(`
            SELECT v.id, v.slug, v.name, v.logo_url, v.cover_url,
                   v.about_text, v.address, v.city, v.specialty, v.category,
                   v.latitude, v.longitude, v.delivery_available, v.kosher_certified,
                   v.status, v.created_at,
                   u.name as owner_name,
                   COALESCE((SELECT AVG(rating) FROM marketplace_reviews WHERE vendor_id = v.id), 0) as avg_rating,
                   COALESCE((SELECT COUNT(*) FROM marketplace_reviews WHERE vendor_id = v.id), 0) as review_count
            FROM marketplace_vendors v
            LEFT JOIN users u ON v.user_id = u.id
            WHERE v.slug = ? AND v.is_active = 1
        `, [slug]);

        if (vendors.length === 0) {
            return res.status(404).json({ error: 'חנות לא נמצאה' });
        }

        const vendor = vendors[0];

        // Get menu items
        const [menu] = await pool.query(`
            SELECT * FROM marketplace_menu_items
            WHERE vendor_id = ? AND is_available = 1
            ORDER BY category, display_order, name
        `, [vendor.id]);

        // Get opening hours
        const [hours] = await pool.query(`
            SELECT * FROM marketplace_hours
            WHERE vendor_id = ?
            ORDER BY day_of_week
        `, [vendor.id]);

        // Get active updates
        const [updates] = await pool.query(`
            SELECT * FROM marketplace_updates
            WHERE vendor_id = ? AND is_active = 1
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC
            LIMIT 5
        `, [vendor.id]);

        // Get recent reviews
        const [reviews] = await pool.query(`
            SELECT r.*, u.name as user_name
            FROM marketplace_reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.vendor_id = ? AND r.is_hidden = 0
            ORDER BY r.created_at DESC
            LIMIT 10
        `, [vendor.id]);

        res.json({
            ...vendor,
            menu,
            hours,
            updates,
            reviews
        });
    } catch (err) {
        console.error('Error fetching vendor:', err);
        res.status(500).json({ error: 'שגיאה בטעינת החנות' });
    }
});

// Create vendor (authenticated)
router.post('/vendors', authenticate, async (req, res) => {
    try {
        const {
            name, slug, logo_url, about_text, about_image_url,
            phone, email, website,
            address, city, latitude, longitude
        } = req.body;

        // Check if user already has a vendor
        const [existing] = await pool.query(
            'SELECT id FROM marketplace_vendors WHERE user_id = ?',
            [req.user.id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'כבר קיימת חנות למשתמש זה' });
        }

        // Check slug uniqueness
        const [slugCheck] = await pool.query(
            'SELECT id FROM marketplace_vendors WHERE slug = ?',
            [slug]
        );

        if (slugCheck.length > 0) {
            return res.status(400).json({ error: 'כתובת זו כבר בשימוש' });
        }

        const [result] = await pool.query(`
            INSERT INTO marketplace_vendors
            (user_id, name, slug, logo_url, about_text, about_image_url,
             phone, email, website, address, city, latitude, longitude, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `, [
            req.user.id, name, slug, logo_url, about_text, about_image_url,
            phone, email, website, address, city, latitude, longitude
        ]);

        // Create default hours
        await pool.query('CALL create_default_hours(?)', [result.insertId]);

        res.status(201).json({ success: true, vendor_id: result.insertId });
    } catch (err) {
        console.error('Error creating vendor:', err);
        res.status(500).json({ error: 'שגיאה ביצירת החנות' });
    }
});

// Update vendor (owner or admin)
router.put('/vendors/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership
        const [vendor] = await pool.query(
            'SELECT user_id FROM marketplace_vendors WHERE id = ?',
            [id]
        );

        if (!vendor.length) {
            return res.status(404).json({ error: 'חנות לא נמצאה' });
        }

        if (vendor[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        const {
            name, logo_url, about_text, about_image_url,
            phone, email, website,
            address, city, latitude, longitude, is_active,
            status, is_verified
        } = req.body;

        // Build dynamic update - only update fields that are provided
        const updates = [];
        const params = [];

        if (name !== undefined) { updates.push('name = ?'); params.push(name); }
        if (logo_url !== undefined) { updates.push('logo_url = ?'); params.push(logo_url); }
        if (about_text !== undefined) { updates.push('about_text = ?'); params.push(about_text); }
        if (about_image_url !== undefined) { updates.push('about_image_url = ?'); params.push(about_image_url); }
        if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
        if (email !== undefined) { updates.push('email = ?'); params.push(email); }
        if (website !== undefined) { updates.push('website = ?'); params.push(website); }
        if (address !== undefined) { updates.push('address = ?'); params.push(address); }
        if (city !== undefined) { updates.push('city = ?'); params.push(city); }
        if (latitude !== undefined) { updates.push('latitude = ?'); params.push(latitude); }
        if (longitude !== undefined) { updates.push('longitude = ?'); params.push(longitude); }
        if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active ? 1 : 0); }

        // Admin-only fields
        if (req.user.role === 'admin') {
            if (status !== undefined) { updates.push('status = ?'); params.push(status); }
            if (is_verified !== undefined) { updates.push('is_verified = ?'); params.push(is_verified ? 1 : 0); }
        }

        if (updates.length === 0) {
            return res.json({ success: true });
        }

        params.push(id);
        await pool.query(`UPDATE marketplace_vendors SET ${updates.join(', ')} WHERE id = ?`, params);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating vendor:', err);
        res.status(500).json({ error: 'שגיאה בעדכון החנות' });
    }
});

// Delete vendor (owner or admin)
router.delete('/vendors/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const [vendor] = await pool.query(
            'SELECT user_id FROM marketplace_vendors WHERE id = ?',
            [id]
        );

        if (!vendor.length) {
            return res.status(404).json({ error: 'חנות לא נמצאה' });
        }

        if (vendor[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        await pool.query('DELETE FROM marketplace_vendors WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting vendor:', err);
        res.status(500).json({ error: 'שגיאה במחיקת החנות' });
    }
});

// =====================================================
// MENU ITEMS ROUTES
// =====================================================

// Get menu for vendor (public)
router.get('/vendors/:vendorId/menu', async (req, res) => {
    try {
        const { vendorId } = req.params;

        const [items] = await pool.query(`
            SELECT * FROM marketplace_menu_items
            WHERE vendor_id = ? AND is_available = 1
            ORDER BY category, display_order, name
        `, [vendorId]);

        res.json(items);
    } catch (err) {
        console.error('Error fetching menu:', err);
        res.status(500).json({ error: 'שגיאה בטעינת התפריט' });
    }
});

// Add menu item (owner or admin)
router.post('/vendors/:vendorId/menu', authenticate, async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Check ownership
        const [vendor] = await pool.query(
            'SELECT user_id FROM marketplace_vendors WHERE id = ?',
            [vendorId]
        );

        if (!vendor.length || (vendor[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        const {
            name, name_hebrew, description, category,
            price, currency = 'ILS', image_url,
            is_available = true, stock_quantity, display_order = 0
        } = req.body;

        const [result] = await pool.query(`
            INSERT INTO marketplace_menu_items
            (vendor_id, name, name_hebrew, description, category, price, currency,
             image_url, is_available, stock_quantity, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            vendorId, name, name_hebrew, description, category, price, currency,
            image_url, is_available ? 1 : 0, stock_quantity, display_order
        ]);

        res.status(201).json({ success: true, item_id: result.insertId });
    } catch (err) {
        console.error('Error adding menu item:', err);
        res.status(500).json({ error: 'שגיאה בהוספת מנה' });
    }
});

// Update menu item (owner or admin)
router.put('/menu-items/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership via vendor
        const [item] = await pool.query(`
            SELECT mi.*, v.user_id
            FROM marketplace_menu_items mi
            JOIN marketplace_vendors v ON mi.vendor_id = v.id
            WHERE mi.id = ?
        `, [id]);

        if (!item.length || (item[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        const {
            name, name_hebrew, description, category,
            price, image_url, is_available, stock_quantity, display_order
        } = req.body;

        await pool.query(`
            UPDATE marketplace_menu_items SET
            name = ?, name_hebrew = ?, description = ?, category = ?,
            price = ?, image_url = ?, is_available = ?, stock_quantity = ?, display_order = ?
            WHERE id = ?
        `, [
            name, name_hebrew, description, category,
            price, image_url, is_available ? 1 : 0, stock_quantity, display_order,
            id
        ]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating menu item:', err);
        res.status(500).json({ error: 'שגיאה בעדכון המנה' });
    }
});

// Delete menu item (owner or admin)
router.delete('/menu-items/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership via vendor
        const [item] = await pool.query(`
            SELECT mi.*, v.user_id
            FROM marketplace_menu_items mi
            JOIN marketplace_vendors v ON mi.vendor_id = v.id
            WHERE mi.id = ?
        `, [id]);

        if (!item.length || (item[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        await pool.query('DELETE FROM marketplace_menu_items WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting menu item:', err);
        res.status(500).json({ error: 'שגיאה במחיקת המנה' });
    }
});

// =====================================================
// HOURS ROUTES
// =====================================================

// Get hours (public)
router.get('/vendors/:vendorId/hours', async (req, res) => {
    try {
        const { vendorId } = req.params;

        const [hours] = await pool.query(`
            SELECT * FROM marketplace_hours
            WHERE vendor_id = ?
            ORDER BY day_of_week
        `, [vendorId]);

        res.json(hours);
    } catch (err) {
        console.error('Error fetching hours:', err);
        res.status(500).json({ error: 'שגיאה בטעינת שעות' });
    }
});

// Update hours (owner or admin)
router.put('/vendors/:vendorId/hours', authenticate, async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Check ownership
        const [vendor] = await pool.query(
            'SELECT user_id FROM marketplace_vendors WHERE id = ?',
            [vendorId]
        );

        if (!vendor.length || (vendor[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        const { hours } = req.body; // Array of {day_of_week, open_time, close_time, is_closed}

        // Delete existing hours
        await pool.query('DELETE FROM marketplace_hours WHERE vendor_id = ?', [vendorId]);

        // Insert new hours
        for (const h of hours) {
            await pool.query(`
                INSERT INTO marketplace_hours (vendor_id, day_of_week, open_time, close_time, is_closed, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [vendorId, h.day_of_week, h.open_time, h.close_time, h.is_closed ? 1 : 0, h.notes]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating hours:', err);
        res.status(500).json({ error: 'שגיאה בעדכון שעות' });
    }
});

// Add closure (owner or admin)
router.post('/vendors/:vendorId/closures', authenticate, async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Check ownership
        const [vendor] = await pool.query(
            'SELECT user_id FROM marketplace_vendors WHERE id = ?',
            [vendorId]
        );

        if (!vendor.length || (vendor[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        const { closure_date, reason } = req.body;

        await pool.query(`
            INSERT INTO marketplace_closures (vendor_id, closure_date, reason)
            VALUES (?, ?, ?)
        `, [vendorId, closure_date, reason]);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Error adding closure:', err);
        res.status(500).json({ error: 'שגיאה בהוספת סגירה' });
    }
});

// =====================================================
// REVIEWS ROUTES
// =====================================================

// Get reviews (public)
router.get('/vendors/:vendorId/reviews', async (req, res) => {
    try {
        const { vendorId } = req.params;

        const [reviews] = await pool.query(`
            SELECT r.*, u.name as user_name
            FROM marketplace_reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.vendor_id = ? AND r.is_hidden = 0
            ORDER BY r.created_at DESC
        `, [vendorId]);

        res.json(reviews);
    } catch (err) {
        console.error('Error fetching reviews:', err);
        res.status(500).json({ error: 'שגיאה בטעינת תגובות' });
    }
});

// Add review (authenticated)
router.post('/vendors/:vendorId/reviews', authenticate, async (req, res) => {
    try {
        const { vendorId } = req.params;
        const { rating, comment } = req.body;

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'דירוג חייב להיות בין 1 ל-5' });
        }

        await pool.query(`
            INSERT INTO marketplace_reviews (vendor_id, user_id, rating, comment)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = ?, comment = ?
        `, [vendorId, req.user.id, rating, comment, rating, comment]);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Error adding review:', err);
        res.status(500).json({ error: 'שגיאה בהוספת תגובה' });
    }
});

// Delete review (owner or admin)
router.delete('/reviews/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        const [review] = await pool.query(
            'SELECT user_id FROM marketplace_reviews WHERE id = ?',
            [id]
        );

        if (!review.length || (review[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        await pool.query('DELETE FROM marketplace_reviews WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting review:', err);
        res.status(500).json({ error: 'שגיאה במחיקת תגובה' });
    }
});

// =====================================================
// UPDATES ROUTES
// =====================================================

// Get updates (public)
router.get('/vendors/:vendorId/updates', async (req, res) => {
    try {
        const { vendorId } = req.params;

        const [updates] = await pool.query(`
            SELECT * FROM marketplace_updates
            WHERE vendor_id = ? AND is_active = 1
              AND (expires_at IS NULL OR expires_at > NOW())
            ORDER BY created_at DESC
        `, [vendorId]);

        res.json(updates);
    } catch (err) {
        console.error('Error fetching updates:', err);
        res.status(500).json({ error: 'שגיאה בטעינת עדכונים' });
    }
});

// Add update (owner or admin)
router.post('/vendors/:vendorId/updates', authenticate, async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Check ownership
        const [vendor] = await pool.query(
            'SELECT user_id FROM marketplace_vendors WHERE id = ?',
            [vendorId]
        );

        if (!vendor.length || (vendor[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        const { title, content, image_url, expires_at } = req.body;

        await pool.query(`
            INSERT INTO marketplace_updates (vendor_id, title, content, image_url, expires_at)
            VALUES (?, ?, ?, ?, ?)
        `, [vendorId, title, content, image_url, expires_at]);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Error adding update:', err);
        res.status(500).json({ error: 'שגיאה בהוספת עדכון' });
    }
});

// Delete update (owner or admin)
router.delete('/updates/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        // Check ownership via vendor
        const [update] = await pool.query(`
            SELECT u.*, v.user_id
            FROM marketplace_updates u
            JOIN marketplace_vendors v ON u.vendor_id = v.id
            WHERE u.id = ?
        `, [id]);

        if (!update.length || (update[0].user_id !== req.user.id && req.user.role !== 'admin')) {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        await pool.query('DELETE FROM marketplace_updates WHERE id = ?', [id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting update:', err);
        res.status(500).json({ error: 'שגיאה במחיקת עדכון' });
    }
});

// =====================================================
// COMMUNITY REPORTS ROUTES
// =====================================================

// Get all reports (admin only)
router.get('/reports', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const [reports] = await pool.query(`
            SELECT r.*, u.name as reporter_name
            FROM marketplace_reports r
            JOIN users u ON r.reporter_id = u.id
            ORDER BY r.status, r.created_at DESC
        `);

        res.json(reports);
    } catch (err) {
        console.error('Error fetching reports:', err);
        res.status(500).json({ error: 'שגיאה בטעינת דיווחים' });
    }
});

// Submit report (authenticated)
router.post('/reports', authenticate, async (req, res) => {
    try {
        const { vendor_id, vendor_name, vendor_address, vendor_phone, description } = req.body;

        await pool.query(`
            INSERT INTO marketplace_reports
            (reporter_id, vendor_id, vendor_name, vendor_address, vendor_phone, description)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [req.user.id, vendor_id, vendor_name, vendor_address, vendor_phone, description]);

        res.status(201).json({ success: true, message: 'הדיווח נשלח בהצלחה' });
    } catch (err) {
        console.error('Error submitting report:', err);
        res.status(500).json({ error: 'שגיאה בשליחת דיווח' });
    }
});

// Approve/Reject report (admin)
router.put('/reports/:id', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, admin_notes } = req.body;

        await pool.query(`
            UPDATE marketplace_reports
            SET status = ?, admin_notes = ?, reviewed_by = ?, reviewed_at = NOW()
            WHERE id = ?
        `, [status, admin_notes, req.user.id, id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating report:', err);
        res.status(500).json({ error: 'שגיאה בעדכון דיווח' });
    }
});

// =====================================================
// CART ROUTES
// =====================================================

// Get user's cart (authenticated)
router.get('/cart', authenticate, async (req, res) => {
    try {
        const [items] = await pool.query(`
            SELECT c.*,
                   m.name, m.name_hebrew, m.price, m.image_url,
                   v.name as vendor_name, v.slug as vendor_slug
            FROM marketplace_cart_items c
            JOIN marketplace_menu_items m ON c.menu_item_id = m.id
            JOIN marketplace_vendors v ON m.vendor_id = v.id
            WHERE c.user_id = ?
        `, [req.user.id]);

        res.json(items);
    } catch (err) {
        console.error('Error fetching cart:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הסל' });
    }
});

// Add to cart (authenticated)
router.post('/cart', authenticate, async (req, res) => {
    try {
        const { menu_item_id, quantity = 1, notes } = req.body;

        await pool.query(`
            INSERT INTO marketplace_cart_items (user_id, menu_item_id, quantity, notes)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE quantity = quantity + ?, notes = ?
        `, [req.user.id, menu_item_id, quantity, notes, quantity, notes]);

        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ error: 'שגיאה בהוספה לסל' });
    }
});

// Update cart item (authenticated)
router.put('/cart/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, notes } = req.body;

        await pool.query(`
            UPDATE marketplace_cart_items
            SET quantity = ?, notes = ?
            WHERE id = ? AND user_id = ?
        `, [quantity, notes, id, req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error updating cart:', err);
        res.status(500).json({ error: 'שגיאה בעדכון הסל' });
    }
});

// Remove from cart (authenticated)
router.delete('/cart/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(`
            DELETE FROM marketplace_cart_items
            WHERE id = ? AND user_id = ?
        `, [id, req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error removing from cart:', err);
        res.status(500).json({ error: 'שגיאה בהסרה מהסל' });
    }
});

// Clear cart (authenticated)
router.delete('/cart', authenticate, async (req, res) => {
    try {
        await pool.query('DELETE FROM marketplace_cart_items WHERE user_id = ?', [req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error clearing cart:', err);
        res.status(500).json({ error: 'שגיאה בניקוי הסל' });
    }
});

// =====================================================
// ORDERS
// =====================================================

// Generate order number
function generateOrderNumber() {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${dateStr}-${random}`;
}

// Create order from cart
router.post('/orders', authenticate, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { customer_name, customer_phone, customer_notes, pickup_time } = req.body;

        if (!customer_name || !customer_phone) {
            await connection.rollback();
            return res.status(400).json({ error: 'שם וטלפון נדרשים' });
        }

        // Get cart items
        const [cartItems] = await connection.query(`
            SELECT
                c.*,
                m.name as item_name,
                m.name_hebrew as item_name_hebrew,
                m.description as item_description,
                m.price as item_price,
                m.vendor_id,
                m.currency
            FROM marketplace_cart_items c
            JOIN marketplace_menu_items m ON c.menu_item_id = m.id
            WHERE c.user_id = ?
        `, [req.user.id]);

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'הסל ריק' });
        }

        // Group by vendor
        const ordersByVendor = {};
        cartItems.forEach(item => {
            if (!ordersByVendor[item.vendor_id]) {
                ordersByVendor[item.vendor_id] = [];
            }
            ordersByVendor[item.vendor_id].push(item);
        });

        const createdOrders = [];

        // Create order for each vendor
        for (const [vendorId, items] of Object.entries(ordersByVendor)) {
            const totalPrice = items.reduce((sum, item) => sum + (item.item_price * item.quantity), 0);
            const currency = items[0].currency || 'ILS';
            const orderNumber = generateOrderNumber();

            // Create order
            const [orderResult] = await connection.query(`
                INSERT INTO marketplace_orders
                (order_number, user_id, vendor_id, status, total_price, currency, customer_name, customer_phone, customer_notes, pickup_time)
                VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
            `, [orderNumber, req.user.id, vendorId, totalPrice, currency, customer_name, customer_phone, customer_notes, pickup_time]);

            const orderId = orderResult.insertId;

            // Create order items
            for (const item of items) {
                await connection.query(`
                    INSERT INTO marketplace_order_items
                    (order_id, menu_item_id, item_name, item_name_hebrew, item_description, item_price, quantity, notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [orderId, item.menu_item_id, item.item_name, item.item_name_hebrew, item.item_description, item.item_price, item.quantity, item.notes]);
            }

            // Get vendor owner
            const [vendor] = await connection.query('SELECT user_id, name FROM marketplace_vendors WHERE id = ?', [vendorId]);

            // Create notification for vendor
            if (vendor[0] && vendor[0].user_id) {
                await connection.query(`
                    INSERT INTO marketplace_notifications
                    (user_id, type, order_id, vendor_id, title, message)
                    VALUES (?, 'new_order', ?, ?, ?, ?)
                `, [
                    vendor[0].user_id,
                    orderId,
                    vendorId,
                    'הזמנה חדשה!',
                    `הזמנה חדשה מ${customer_name} - ${orderNumber}`
                ]);
            }

            createdOrders.push({ order_id: orderId, order_number: orderNumber, vendor_name: vendor[0].name });
        }

        // Clear cart
        await connection.query('DELETE FROM marketplace_cart_items WHERE user_id = ?', [req.user.id]);

        await connection.commit();
        res.status(201).json({ success: true, orders: createdOrders });

    } catch (err) {
        await connection.rollback();
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'שגיאה ביצירת ההזמנה' });
    } finally {
        connection.release();
    }
});

// Get user's orders
router.get('/orders', authenticate, async (req, res) => {
    try {
        const [orders] = await pool.query(`
            SELECT
                o.*,
                v.name as vendor_name,
                v.slug as vendor_slug,
                v.phone as vendor_phone,
                v.address as vendor_address
            FROM marketplace_orders o
            JOIN marketplace_vendors v ON o.vendor_id = v.id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        `, [req.user.id]);

        // Get order items for each order
        for (const order of orders) {
            const [items] = await pool.query(`
                SELECT * FROM marketplace_order_items WHERE order_id = ?
            `, [order.id]);
            order.items = items;
        }

        res.json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'שגיאה בטעינת ההזמנות' });
    }
});

// Get vendor's orders
router.get('/vendors/:vendorId/orders', authenticate, async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Check ownership
        const [vendor] = await pool.query('SELECT user_id FROM marketplace_vendors WHERE id = ?', [vendorId]);
        if (!vendor.length) {
            return res.status(404).json({ error: 'חנות לא נמצאה' });
        }

        if (vendor[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        const [orders] = await pool.query(`
            SELECT o.*
            FROM marketplace_orders o
            WHERE o.vendor_id = ?
            ORDER BY
                CASE o.status
                    WHEN 'pending' THEN 1
                    WHEN 'confirmed' THEN 2
                    WHEN 'ready' THEN 3
                    WHEN 'completed' THEN 4
                    WHEN 'cancelled' THEN 5
                END,
                o.created_at DESC
        `, [vendorId]);

        // Get items for each order
        for (const order of orders) {
            const [items] = await pool.query('SELECT * FROM marketplace_order_items WHERE order_id = ?', [order.id]);
            order.items = items;
        }

        res.json(orders);
    } catch (err) {
        console.error('Error fetching vendor orders:', err);
        res.status(500).json({ error: 'שגיאה בטעינת ההזמנות' });
    }
});

// Update order status (vendor or admin)
router.put('/orders/:orderId', authenticate, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { orderId } = req.params;
        const { status, cancellation_reason } = req.body;

        if (!['pending', 'confirmed', 'ready', 'completed', 'cancelled'].includes(status)) {
            await connection.rollback();
            return res.status(400).json({ error: 'סטטוס לא תקין' });
        }

        // Get order and check permission
        const [orders] = await connection.query(`
            SELECT o.*, v.user_id as vendor_owner
            FROM marketplace_orders o
            JOIN marketplace_vendors v ON o.vendor_id = v.id
            WHERE o.id = ?
        `, [orderId]);

        if (!orders.length) {
            await connection.rollback();
            return res.status(404).json({ error: 'הזמנה לא נמצאה' });
        }

        const order = orders[0];

        // Check permission
        const isVendorOwner = order.vendor_owner === req.user.id;
        const isCustomer = order.user_id === req.user.id;
        const isAdmin = req.user.role === 'admin';

        if (!isVendorOwner && !isAdmin && !(isCustomer && status === 'cancelled')) {
            await connection.rollback();
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        // Build update query
        const updates = ['status = ?'];
        const params = [status];

        if (status === 'confirmed' && !order.confirmed_at) {
            updates.push('confirmed_at = NOW()');
        } else if (status === 'ready' && !order.ready_at) {
            updates.push('ready_at = NOW()');
        } else if (status === 'completed' && !order.completed_at) {
            updates.push('completed_at = NOW()');
        } else if (status === 'cancelled') {
            updates.push('cancelled_at = NOW()');
            if (cancellation_reason) {
                updates.push('cancellation_reason = ?');
                params.push(cancellation_reason);
            }
        }

        params.push(orderId);

        await connection.query(`
            UPDATE marketplace_orders SET ${updates.join(', ')} WHERE id = ?
        `, params);

        // Create notification
        let notificationType = null;
        let recipientId = null;
        let title = '';
        let message = '';

        if (status === 'confirmed') {
            notificationType = 'order_confirmed';
            recipientId = order.user_id;
            title = 'ההזמנה אושרה!';
            message = `הזמנתך ${order.order_number} אושרה על ידי המוכר`;
        } else if (status === 'ready') {
            notificationType = 'order_ready';
            recipientId = order.user_id;
            title = 'ההזמנה מוכנה!';
            message = `הזמנתך ${order.order_number} מוכנה לאיסוף`;
        } else if (status === 'completed') {
            notificationType = 'order_completed';
            recipientId = order.user_id;
            title = 'ההזמנה הושלמה';
            message = `הזמנתך ${order.order_number} הושלמה. תודה!`;
        } else if (status === 'cancelled') {
            notificationType = 'order_cancelled';
            recipientId = isCustomer ? order.vendor_owner : order.user_id;
            title = 'ההזמנה בוטלה';
            message = `הזמנה ${order.order_number} בוטלה`;
        }

        if (notificationType && recipientId) {
            await connection.query(`
                INSERT INTO marketplace_notifications
                (user_id, type, order_id, vendor_id, title, message)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [recipientId, notificationType, orderId, order.vendor_id, title, message]);
        }

        await connection.commit();
        res.json({ success: true, status });

    } catch (err) {
        await connection.rollback();
        console.error('Error updating order:', err);
        res.status(500).json({ error: 'שגיאה בעדכון ההזמנה' });
    } finally {
        connection.release();
    }
});

// =====================================================
// NOTIFICATIONS
// =====================================================

// Get user's notifications
router.get('/notifications', authenticate, async (req, res) => {
    try {
        const { unread_only } = req.query;

        let query = `
            SELECT n.*, o.order_number, v.name as vendor_name
            FROM marketplace_notifications n
            LEFT JOIN marketplace_orders o ON n.order_id = o.id
            LEFT JOIN marketplace_vendors v ON n.vendor_id = v.id
            WHERE n.user_id = ?
        `;

        if (unread_only === 'true') {
            query += ' AND n.is_read = FALSE';
        }

        query += ' ORDER BY n.created_at DESC LIMIT 50';

        const [notifications] = await pool.query(query, [req.user.id]);
        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'שגיאה בטעינת ההתראות' });
    }
});

// Mark notification as read
router.put('/notifications/:id/read', authenticate, async (req, res) => {
    try {
        await pool.query(`
            UPDATE marketplace_notifications
            SET is_read = TRUE
            WHERE id = ? AND user_id = ?
        `, [req.params.id, req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'שגיאה בעדכון התראה' });
    }
});

// Mark all notifications as read
router.put('/notifications/read-all', authenticate, async (req, res) => {
    try {
        await pool.query(`
            UPDATE marketplace_notifications
            SET is_read = TRUE
            WHERE user_id = ? AND is_read = FALSE
        `, [req.user.id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Error marking all notifications as read:', err);
        res.status(500).json({ error: 'שגיאה בעדכון התראות' });
    }
});

// Get vendor statistics
router.get('/vendors/:vendorId/statistics', authenticate, async (req, res) => {
    try {
        const { vendorId } = req.params;

        // Check ownership
        const [vendor] = await pool.query('SELECT user_id FROM marketplace_vendors WHERE id = ?', [vendorId]);
        if (!vendor.length) {
            return res.status(404).json({ error: 'חנות לא נמצאה' });
        }

        if (vendor[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'אין הרשאה' });
        }

        // Get statistics from view
        const [stats] = await pool.query(`
            SELECT * FROM marketplace_order_stats WHERE vendor_id = ?
        `, [vendorId]);

        // Get recent orders trend (last 7 days)
        const [dailyOrders] = await pool.query(`
            SELECT
                DATE(created_at) as order_date,
                COUNT(*) as orders_count,
                SUM(total_price) as daily_revenue
            FROM marketplace_orders
            WHERE vendor_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY DATE(created_at)
            ORDER BY order_date DESC
        `, [vendorId]);

        // Get top selling items
        const [topItems] = await pool.query(`
            SELECT
                oi.item_name,
                COUNT(*) as times_ordered,
                SUM(oi.quantity) as total_quantity,
                SUM(oi.item_price * oi.quantity) as total_revenue
            FROM marketplace_order_items oi
            JOIN marketplace_orders o ON oi.order_id = o.id
            WHERE o.vendor_id = ? AND o.status = 'completed'
            GROUP BY oi.item_name
            ORDER BY times_ordered DESC
            LIMIT 5
        `, [vendorId]);

        res.json({
            overview: stats[0] || {},
            daily_orders: dailyOrders,
            top_items: topItems
        });

    } catch (err) {
        console.error('Error fetching statistics:', err);
        res.status(500).json({ error: 'שגיאה בטעינת הסטטיסטיקות' });
    }
});

module.exports = router;
