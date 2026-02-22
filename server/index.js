const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3002;

// --- Security Headers ---
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
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
        }
    } : false,
    crossOriginEmbedderPolicy: false
}));

// --- Response Compression (gzip/brotli) ---
app.use(compression());

// --- CORS ---
const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:5173'];

app.use(cors({
    origin: corsOrigins,
    credentials: true,
    maxAge: 86400
}));

// --- Rate Limiting ---
const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
    message: { error: 'יותר מדי בקשות, נסה שוב בעוד דקה' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'יותר מדי ניסיונות התחברות, נסה שוב בעוד 15 דקות' },
    standardHeaders: true,
    legacyHeaders: false,
});

const geminiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 30,
    message: { error: 'מכסת AI הגיעה למקסימום, נסה שוב בעוד שעה' },
    standardHeaders: true,
    legacyHeaders: false,
});

const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'יותר מדי העלאות, נסה שוב בעוד 15 דקות' },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', globalLimiter);

// --- Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const passport = require('./config/passport');
app.use(passport.initialize());

// --- API Routes (with specific rate limiters) ---
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/dictionary', require('./routes/dictionary'));
app.use('/api/dialects', require('./routes/dialects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/gemini', geminiLimiter, require('./routes/gemini'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/recordings', uploadLimiter, require('./routes/recordings'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/admin/features', require('./routes/features'));
app.use('/api/admin/settings', require('./routes/settings'));
app.use('/api/admin/seo', require('./routes/seo'));
app.use('/api/recipes', require('./routes/recipes'));
app.use('/api/marketplace', require('./routes/marketplace'));
app.use('/api/family', require('./routes/familyTree'));
app.use('/api/family/community', require('./routes/merge'));
app.use('/api/family/gedcom', require('./routes/gedcom'));
app.use('/api/upload', uploadLimiter, require('./routes/upload'));
app.use('/api/feedback', require('./routes/feedback'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- Health Check ---
const db = require('./config/db');

app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected'
        });
    } catch (err) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected'
        });
    }
});

// --- Dynamic Sitemap ---
const SITE_URL = process.env.SITE_URL || 'https://juhuri.shesek.xyz';

app.get('/sitemap.xml', async (req, res) => {
    try {
        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache

        // Static pages
        const staticUrls = [
            { loc: '/', priority: '1.0', changefreq: 'daily' },
            { loc: '/tutor', priority: '0.8', changefreq: 'weekly' },
            { loc: '/recipes', priority: '0.8', changefreq: 'weekly' },
            { loc: '/marketplace', priority: '0.7', changefreq: 'weekly' },
            { loc: '/family', priority: '0.6', changefreq: 'monthly' },
        ];

        // Dynamic: dictionary entries
        const [entries] = await db.query(
            `SELECT term, updated_at FROM dictionary_entries WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1000`
        );

        // Dynamic: approved recipes
        const [recipes] = await db.query(
            `SELECT id, updated_at FROM recipes WHERE is_approved = 1`
        );

        // Dynamic: active vendors
        const [vendors] = await db.query(
            `SELECT slug, updated_at FROM marketplace_vendors WHERE status = 'active'`
        );

        const toDate = (d) => d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        const urls = [
            ...staticUrls.map(u => `  <url>\n    <loc>${SITE_URL}${u.loc}</loc>\n    <priority>${u.priority}</priority>\n    <changefreq>${u.changefreq}</changefreq>\n  </url>`),
            ...entries.map(e => `  <url>\n    <loc>${SITE_URL}/word/${encodeURIComponent(e.term)}</loc>\n    <lastmod>${toDate(e.updated_at)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>`),
            ...recipes.map(r => `  <url>\n    <loc>${SITE_URL}/recipes/${r.id}</loc>\n    <lastmod>${toDate(r.updated_at)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`),
            ...vendors.map(v => `  <url>\n    <loc>${SITE_URL}/marketplace/${v.slug}</loc>\n    <lastmod>${toDate(v.updated_at)}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.5</priority>\n  </url>`),
        ];

        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`);
    } catch (err) {
        console.error('Sitemap generation error:', err);
        res.status(500).send('Error generating sitemap');
    }
});

// --- Crawler Meta Injection (for social sharing previews) ---
const CRAWLER_UA = /facebookexternalhit|twitterbot|telegrambot|linkedinbot|slackbot|whatsapp|pinterest|discordbot/i;

const injectMetaTags = async (req, res, indexHtml) => {
    let title = 'מורשת ג\'והורי | המילון לשימור השפה';
    let description = 'מילון ג\'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים';
    let image = `${SITE_URL}/images/og-default.png`;
    const url = `${SITE_URL}${req.path}`;

    try {
        const wordMatch = req.path.match(/^\/word\/(.+)$/);
        const recipeMatch = req.path.match(/^\/recipes\/(\d+)$/);
        const vendorMatch = req.path.match(/^\/marketplace\/(.+)$/);

        if (wordMatch) {
            const term = decodeURIComponent(wordMatch[1]);
            const [entries] = await db.query(
                'SELECT term FROM dictionary_entries WHERE term = ? AND status = ? LIMIT 1',
                [term, 'active']
            );
            if (entries.length) {
                title = `${term} - תרגום ג'והורי | מורשת ג'והורי`;
                description = `חפש את המשמעות של "${term}" במילון הג'והורי-עברי`;
            }
        } else if (recipeMatch) {
            const [recipes] = await db.query(
                'SELECT title, description FROM recipes WHERE id = ? AND is_approved = 1 LIMIT 1',
                [recipeMatch[1]]
            );
            if (recipes.length) {
                title = `${recipes[0].title} - מתכון | מורשת ג'והורי`;
                description = recipes[0].description || `מתכון מסורתי: ${recipes[0].title}`;
            }
        } else if (vendorMatch) {
            const [vendors] = await db.query(
                'SELECT name, about_text FROM marketplace_vendors WHERE slug = ? AND status = ? LIMIT 1',
                [vendorMatch[1], 'active']
            );
            if (vendors.length) {
                title = `${vendors[0].name} - שוק | מורשת ג'והורי`;
                description = vendors[0].about_text || `${vendors[0].name} בשוק הקהילתי`;
            }
        }
    } catch (err) {
        console.error('Crawler meta injection DB error:', err);
    }

    // Escape HTML entities for safety
    const esc = (s) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return indexHtml
        .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}">`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}">`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}">`)
        .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(image)}">`)
        .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}">`)
        .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}">`)
        .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}">`);
};

// --- SEO Redirects Middleware ---
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    try {
        const [redirects] = await db.query(
            'SELECT to_path, status_code FROM seo_redirects WHERE from_path = ? AND is_active = TRUE LIMIT 1',
            [req.path]
        );
        if (redirects.length > 0) {
            // Increment hit counter (fire and forget)
            db.query('UPDATE seo_redirects SET hits = hits + 1 WHERE from_path = ?', [req.path]).catch(() => {});
            return res.redirect(redirects[0].status_code, redirects[0].to_path);
        }
    } catch (err) {
        // Table might not exist yet, ignore
    }
    next();
});

// --- Serve static files in production ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist'), {
        maxAge: '1y',
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));

    // Crawler-aware SPA fallback
    app.get('*', async (req, res) => {
        if (req.path.startsWith('/api')) return;

        const indexPath = path.join(__dirname, '../dist/index.html');
        const isCrawler = CRAWLER_UA.test(req.headers['user-agent'] || '');

        if (isCrawler) {
            try {
                const html = fs.readFileSync(indexPath, 'utf8');
                const injected = await injectMetaTags(req, res, html);
                res.send(injected);
            } catch (err) {
                console.error('Crawler injection error:', err);
                res.sendFile(indexPath);
            }
        } else {
            res.sendFile(indexPath);
        }
    });
}

// --- Error Handling ---
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);

    // Async file logging (non-blocking)
    const logEntry = `${new Date().toISOString()} - ${err.message}\n${err.stack}\n\n`;
    fs.appendFile('server_error.log', logEntry, (writeErr) => {
        if (writeErr) console.error('Failed to write error log:', writeErr.message);
    });

    res.status(500).json({
        error: 'שגיאת שרת פנימית'
    });
});

// --- Start Server with Graceful Shutdown ---
const http = require('http');
const initializeDatabase = require('./utils/dbInit');

let server;

initializeDatabase().then(() => {
    server = http.createServer(app);

    server.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    if (server) {
        server.close(async () => {
            console.log('Server closed');
            try {
                await db.end();
                console.log('Database pool closed');
            } catch (e) { /* ignore */ }
            process.exit(0);
        });

        setTimeout(() => {
            console.error('Forced shutdown after timeout');
            process.exit(1);
        }, 30000);
    } else {
        process.exit(0);
    }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;
