const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/encryption');

// Allowed setting keys (whitelist)
const ALLOWED_KEYS = ['gemini_api_key'];

/**
 * Mask a sensitive value for display.
 * Shows first 6 and last 3 characters: "AIzaSy...Rqw"
 */
function maskValue(value) {
  if (!value || value.length <= 10) return '***';
  return value.substring(0, 6) + '...' + value.substring(value.length - 3);
}

// GET /api/admin/settings - Get all settings (masked values only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const [settings] = await pool.query(
      `SELECT setting_key, encrypted_value, iv, auth_tag, description, updated_at
       FROM system_settings ORDER BY setting_key ASC`
    );

    const result = settings.map(s => {
      let maskedValue = '***';
      try {
        const decrypted = decrypt(s.encrypted_value, s.iv, s.auth_tag);
        maskedValue = maskValue(decrypted);
      } catch (e) {
        maskedValue = '[שגיאת פענוח]';
      }
      return {
        setting_key: s.setting_key,
        masked_value: maskedValue,
        description: s.description,
        updated_at: s.updated_at,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'שגיאה בטעינת הגדרות' });
  }
});

// PUT /api/admin/settings/:key - Create or update a setting
router.put('/:key', authenticate, requireAdmin, async (req, res) => {
  const { key } = req.params;
  const { value, description } = req.body;

  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    return res.status(400).json({ error: 'ערך לא תקין' });
  }

  if (!ALLOWED_KEYS.includes(key)) {
    return res.status(400).json({ error: 'מפתח הגדרה לא מורשה' });
  }

  try {
    const { encrypted, iv, authTag } = encrypt(value.trim());

    await pool.query(
      `INSERT INTO system_settings (setting_key, encrypted_value, iv, auth_tag, description, updated_by)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          encrypted_value = VALUES(encrypted_value),
          iv = VALUES(iv),
          auth_tag = VALUES(auth_tag),
          description = VALUES(description),
          updated_by = VALUES(updated_by),
          updated_at = CURRENT_TIMESTAMP`,
      [key, encrypted, iv, authTag, description || null, req.user.id]
    );

    // Audit log
    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
       VALUES ('SETTING_CHANGED', ?, ?, ?, ?)`,
      [
        `הגדרה "${key}" עודכנה`,
        req.user.id,
        req.user.name,
        JSON.stringify({ setting_key: key }),
      ]
    );

    // Invalidate gemini key cache
    try {
      const gemini = require('./gemini');
      if (gemini.invalidateApiKeyCache) gemini.invalidateApiKeyCache();
    } catch (e) { /* ignore */ }

    res.json({ success: true, setting_key: key, masked_value: maskValue(value.trim()) });
  } catch (err) {
    console.error('Error saving setting:', err);
    res.status(500).json({ error: 'שגיאה בשמירת הגדרה' });
  }
});

// DELETE /api/admin/settings/:key - Remove a setting (revert to .env)
router.delete('/:key', authenticate, requireAdmin, async (req, res) => {
  const { key } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM system_settings WHERE setting_key = ?',
      [key]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'הגדרה לא נמצאה' });
    }

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
       VALUES ('SETTING_CHANGED', ?, ?, ?, ?)`,
      [
        `הגדרה "${key}" נמחקה (חזרה ל-.env)`,
        req.user.id,
        req.user.name,
        JSON.stringify({ setting_key: key, action: 'deleted' }),
      ]
    );

    // Invalidate gemini key cache
    try {
      const gemini = require('./gemini');
      if (gemini.invalidateApiKeyCache) gemini.invalidateApiKeyCache();
    } catch (e) { /* ignore */ }

    res.json({ success: true, message: 'הגדרה נמחקה, המערכת תשתמש ב-.env' });
  } catch (err) {
    console.error('Error deleting setting:', err);
    res.status(500).json({ error: 'שגיאה במחיקת הגדרה' });
  }
});

// POST /api/admin/settings/test-gemini - Test the current Gemini API key
router.post('/test-gemini', authenticate, requireAdmin, async (req, res) => {
  try {
    let apiKey = null;
    let source = 'none';

    const [rows] = await pool.query(
      `SELECT encrypted_value, iv, auth_tag FROM system_settings WHERE setting_key = 'gemini_api_key'`
    );

    if (rows.length > 0) {
      try {
        apiKey = decrypt(rows[0].encrypted_value, rows[0].iv, rows[0].auth_tag);
        source = 'database';
      } catch (e) {
        return res.json({ success: false, source: 'db', error: 'שגיאת פענוח מפתח' });
      }
    }

    if (!apiKey) {
      apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) source = 'env';
    }

    if (!apiKey) {
      return res.json({ success: false, source: 'none', error: 'לא הוגדר מפתח API' });
    }

    // Lightweight test: list models
    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(testUrl);

    if (response.ok) {
      res.json({ success: true, source });
    } else {
      const errorData = await response.json().catch(() => ({}));
      res.json({
        success: false,
        source,
        error: errorData?.error?.message || `HTTP ${response.status}`,
      });
    }
  } catch (err) {
    console.error('Test Gemini error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
