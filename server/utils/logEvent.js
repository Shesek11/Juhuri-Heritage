const db = require('../config/db');

/**
 * Get client IP from request (handles proxies)
 */
function getClientIp(req) {
    if (!req) return null;
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return req.ip || req.connection?.remoteAddress || null;
}

/**
 * Log a system event with optional IP tracking
 * @param {string} eventType - One of the system_logs event_type enum values
 * @param {string} description - Human-readable description
 * @param {object|null} actor - { id, name } of the user performing the action
 * @param {object|null} metadata - Additional structured data
 * @param {object|null} req - Express request object (for IP extraction)
 */
async function logEvent(eventType, description, actor, metadata, req) {
    try {
        const ip = getClientIp(req);
        await db.query(
            `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                eventType,
                description,
                actor?.id || null,
                actor?.name || null,
                metadata ? JSON.stringify(metadata) : null,
                ip,
            ]
        );
    } catch (err) {
        console.error('Failed to log event:', eventType, err.message);
    }
}

module.exports = { logEvent, getClientIp };
