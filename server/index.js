const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3002;

// Security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com"],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            scriptSrcAttr: ["'none'"],
            upgradeInsecureRequests: [],
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    xXssProtection: false,
}));

// Permissions-Policy header
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(self), payment=()');
    next();
});

// Rate limiters
const commentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: { error: 'יותר מדי בקשות, נסה שוב בעוד כמה דקות' }
});

const gamificationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'יותר מדי בקשות' }
});

// CORS configuration
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: corsOrigins,
    credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const passport = require('./config/passport');
app.use(passport.initialize());

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dictionary', require('./routes/dictionary'));
app.use('/api/dialects', require('./routes/dialects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/gemini', require('./routes/gemini'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/comments', commentLimiter, require('./routes/comments'));
app.use('/api/recordings', require('./routes/recordings'));
app.use('/api/gamification', gamificationLimiter, require('./routes/gamification'));
app.use('/api/admin/features', require('./routes/features'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/family', require('./routes/familyTree'));
app.use('/api/family/community', require('./routes/merge'));
app.use('/api/family/gedcom', require('./routes/gedcom'));
app.use('/api/upload', require('./routes/upload'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
const db = require('./config/db');

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        const [tables] = await db.query('SHOW TABLES');
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
            tables: tables.map(t => Object.values(t)[0])
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: err.message
        });
    }
});

// Serve static files from React build in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist')));

    // Handle React routing - send all non-API requests to index.html
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(__dirname, '../dist/index.html'));
        }
    });
}

// Error handling middleware
// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    // Log to file
    const fs = require('fs');
    fs.appendFileSync('server_error.log', `${new Date().toISOString()} - ${err.message}\n${err.stack}\n\n`);

    res.status(500).json({
        error: 'שגיאת שרת פנימית',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
// Initialize Database
const initializeDatabase = require('./utils/dbInit');
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

module.exports = app;
