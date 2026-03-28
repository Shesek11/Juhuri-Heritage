const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/db');
const { authenticate, generateToken } = require('../middleware/auth');
const { logEvent } = require('../utils/logEvent');
const passport = require('passport');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

// Shared cookie options
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
};

// GET /api/auth/google
// Starts the Google Login Flow
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /api/auth/google/callback
// Google redirects back here
router.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=failed' }),
    async (req, res) => {
        // Successful authentication
        const user = req.user;

        // Generate our own JWT
        const safeUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            joinedAt: user.joined_at,
            contributionsCount: user.contributions_count,
            xp: user.xp,
            level: user.level,
            currentStreak: user.current_streak
        };
        const token = generateToken(safeUser);

        // Set cookie
        res.cookie('token', token, cookieOptions);

        // Redirect to frontend (home page)
        // We use window.location.origin in dev, but here we just redirect relative to root '/'
        res.redirect('/?login=success');
    }
);


// POST /api/auth/register
router.post('/register', [
    body('name').trim().notEmpty().withMessage('נדרש שם')
        .isLength({ min: 2, max: 100 }).withMessage('שם חייב להכיל 2-100 תווים'),
    body('email').trim().isEmail().withMessage('כתובת אימייל לא חוקית')
        .normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('הסיסמה חייבת להכיל לפחות 8 תווים')
        .isLength({ max: 128 }).withMessage('הסיסמה ארוכה מדי'),
    validate
], async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if email exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'כתובת האימייל כבר קיימת במערכת' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Check if this is the admin email
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const role = email.toLowerCase() === adminEmail ? 'admin' : 'user';

        // Insert user
        const [result] = await db.query(
            `INSERT INTO users (email, password_hash, name, role, last_login_date) 
             VALUES (?, ?, ?, ?, NOW())`,
            [email.toLowerCase(), passwordHash, name, role]
        );

        const userId = result.insertId;

        // Log event
        await logEvent('USER_REGISTER', `משתמש חדש נרשם: ${name}`, { id: userId, name }, { email: email.toLowerCase() }, req);

        // Get full user data
        const [users] = await db.query(
            `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak 
             FROM users WHERE id = ?`,
            [userId]
        );

        const user = users[0];
        const token = generateToken(user);

        // Set cookie
        res.cookie('token', token, cookieOptions);

        res.json({ user, token });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'שגיאה בהרשמה' });
    }
});

// POST /api/auth/login
router.post('/login', [
    body('email').trim().isEmail().withMessage('כתובת אימייל לא חוקית').normalizeEmail(),
    body('password').notEmpty().withMessage('נדרשת סיסמה'),
    validate
], async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email.toLowerCase()]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
        }

        const user = users[0];

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'אימייל או סיסמה שגויים' });
        }

        // Update streak logic
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastLogin = user.last_login_date ? new Date(user.last_login_date) : null;

        let newStreak = user.current_streak || 1;
        if (lastLogin) {
            lastLogin.setHours(0, 0, 0, 0);
            const diffDays = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                newStreak = (user.current_streak || 0) + 1;
            } else if (diffDays > 1) {
                newStreak = 1;
            }
        }

        // Update last login
        await db.query(
            'UPDATE users SET last_login_date = NOW(), current_streak = ? WHERE id = ?',
            [newStreak, user.id]
        );

        // Log event
        await logEvent('USER_LOGIN', `משתמש התחבר: ${user.name}`, { id: user.id, name: user.name }, null, req);

        // Prepare safe user object (without password)
        const safeUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            joinedAt: user.joined_at,
            contributionsCount: user.contributions_count,
            xp: user.xp,
            level: user.level,
            currentStreak: newStreak
        };

        const token = generateToken(safeUser);

        // Set cookie
        res.cookie('token', token, cookieOptions);

        res.json({ user: safeUser, token });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'שגיאה בהתחברות' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('token', { path: '/', httpOnly: true, sameSite: 'lax' });
    res.json({ message: 'התנתקת בהצלחה' });
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak 
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ error: 'משתמש לא נמצא' });
        }

        // Get completed units
        const [progress] = await db.query(
            'SELECT unit_id FROM user_progress WHERE user_id = ?',
            [req.user.id]
        );

        const user = {
            ...users[0],
            joinedAt: users[0].joined_at,
            contributionsCount: users[0].contributions_count,
            currentStreak: users[0].current_streak,
            completedUnits: progress.map(p => p.unit_id)
        };

        res.json({ user });
    } catch (err) {
        console.error('Get user error:', err);
        res.status(500).json({ error: 'שגיאה בטעינת משתמש' });
    }
});

// PUT /api/auth/profile - Update profile
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { name, password } = req.body;
        const updates = [];
        const params = [];

        if (name) {
            updates.push('name = ?');
            params.push(name);
        }

        if (password && password.length >= 8) {
            const passwordHash = await bcrypt.hash(password, 10);
            updates.push('password_hash = ?');
            params.push(passwordHash);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'אין שינויים לשמור' });
        }

        params.push(req.user.id);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        // Get updated user
        const [users] = await db.query(
            `SELECT id, email, name, role, joined_at, contributions_count, xp, level, current_streak 
             FROM users WHERE id = ?`,
            [req.user.id]
        );

        res.json({ user: users[0] });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ error: 'שגיאה בעדכון פרופיל' });
    }
});

module.exports = router;
