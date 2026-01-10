const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT token
const authenticate = (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: 'נדרשת התחברות' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'טוקן לא תקין או פג תוקף' });
    }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'נדרשות הרשאות מנהל' });
    }
    next();
};

// Middleware to check if user is admin or approver
const requireApprover = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'approver')) {
        return res.status(403).json({ error: 'נדרשות הרשאות מאשר' });
    }
    next();
};

// Optional authentication - doesn't fail if no token
const optionalAuth = (req, res, next) => {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (err) {
            // Invalid token - continue without user
        }
    }
    next();
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = {
    authenticate,
    requireAdmin,
    requireApprover,
    optionalAuth,
    generateToken
};
