const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const compression = require('compression');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3002;

// --- Security Headers ---
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://*.tile.openstreetmap.org", "https://unpkg.com", "https://images.unsplash.com", "https://ui-avatars.com"],
            connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
            scriptSrcAttr: ["'none'"],
            upgradeInsecureRequests: [],
        }
    } : false,
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
    },
    xXssProtection: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Permissions-Policy header
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=(self), payment=()');
    next();
});

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

const commentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: { error: 'יותר מדי בקשות, נסה שוב בעוד כמה דקות' },
    standardHeaders: true,
    legacyHeaders: false,
});

const gamificationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'יותר מדי בקשות' },
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
const searchLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: 'יותר מדי חיפושים, נסה שוב בעוד דקה' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/dictionary/search', searchLimiter);
app.use('/api/dictionary', require('./routes/dictionary'));
app.use('/api/dialects', require('./routes/dialects'));
app.use('/api/users', require('./routes/users'));
app.use('/api/gemini', geminiLimiter, require('./routes/gemini'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/comments', commentLimiter, require('./routes/comments'));
app.use('/api/recordings', uploadLimiter, require('./routes/recordings'));
app.use('/api/gamification', gamificationLimiter, require('./routes/gamification'));
app.use('/api/admin/features', require('./routes/features'));
app.use('/api/admin/settings', require('./routes/settings'));
app.use('/api/admin/seo', require('./routes/seo'));
app.use('/api/admin/gsc', require('./routes/gsc'));
app.use('/api/admin/analytics', require('./routes/analytics'));
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
const SITE_URL = process.env.SITE_URL || 'https://jun-juhuri.com';

// Helper to generate a single <urlset> XML
const buildUrlsetXml = (urls) => {
    const items = urls.map(u =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    );
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>`;
};

const toDate = (d) => d ? new Date(d).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

// Sitemap index (root) — only includes sitemaps that have entries
app.get('/sitemap.xml', async (req, res) => {
    try {
        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600');
        const today = new Date().toISOString().split('T')[0];

        const [[{rc}]] = await db.query(`SELECT COUNT(*) as rc FROM recipes WHERE is_approved = 1`);
        const [[{vc}]] = await db.query(`SELECT COUNT(*) as vc FROM marketplace_vendors WHERE status = 'active'`);

        const sitemaps = [
            { loc: `${SITE_URL}/sitemap-pages.xml`, lastmod: today },
            { loc: `${SITE_URL}/sitemap-words.xml`, lastmod: today },
        ];
        if (rc > 0) sitemaps.push({ loc: `${SITE_URL}/sitemap-recipes.xml`, lastmod: today });
        if (vc > 0) sitemaps.push({ loc: `${SITE_URL}/sitemap-marketplace.xml`, lastmod: today });

        const items = sitemaps.map(s =>
            `  <sitemap>\n    <loc>${s.loc}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>`
        );

        res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>`);
    } catch (err) {
        console.error('Sitemap index error:', err);
        res.status(500).send('Error generating sitemap index');
    }
});

// Static pages sitemap
app.get('/sitemap-pages.xml', (req, res) => {
    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    const today = new Date().toISOString().split('T')[0];
    res.send(buildUrlsetXml([
        { loc: `${SITE_URL}/`, lastmod: today, priority: '1.0', changefreq: 'daily' },
        { loc: `${SITE_URL}/dictionary`, lastmod: today, priority: '0.9', changefreq: 'daily' },
        { loc: `${SITE_URL}/tutor`, lastmod: today, priority: '0.8', changefreq: 'weekly' },
        { loc: `${SITE_URL}/recipes`, lastmod: today, priority: '0.8', changefreq: 'weekly' },
        { loc: `${SITE_URL}/marketplace`, lastmod: today, priority: '0.7', changefreq: 'weekly' },
        { loc: `${SITE_URL}/family`, lastmod: today, priority: '0.6', changefreq: 'monthly' },
    ]));
});

// Dictionary words sitemap
app.get('/sitemap-words.xml', async (req, res) => {
    try {
        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600');
        const [entries] = await db.query(
            `SELECT hebrew_script, updated_at FROM dictionary_entries WHERE status = 'active' ORDER BY updated_at DESC`
        );
        res.send(buildUrlsetXml(entries.map(e => ({
            loc: `${SITE_URL}/word/${encodeURIComponent(e.hebrew_script)}`,
            lastmod: toDate(e.updated_at),
            changefreq: 'monthly',
            priority: '0.5'
        }))));
    } catch (err) {
        console.error('Sitemap words error:', err);
        res.status(500).send('Error generating words sitemap');
    }
});

// Recipes sitemap
app.get('/sitemap-recipes.xml', async (req, res) => {
    try {
        const [recipes] = await db.query(
            `SELECT id, updated_at FROM recipes WHERE is_approved = 1`
        );
        if (recipes.length === 0) return res.status(404).send('No recipes sitemap available');
        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600');
        res.send(buildUrlsetXml(recipes.map(r => ({
            loc: `${SITE_URL}/recipes/${r.id}`,
            lastmod: toDate(r.updated_at),
            changefreq: 'monthly',
            priority: '0.6'
        }))));
    } catch (err) {
        console.error('Sitemap recipes error:', err);
        res.status(500).send('Error generating recipes sitemap');
    }
});

// Marketplace vendors sitemap
app.get('/sitemap-marketplace.xml', async (req, res) => {
    try {
        res.header('Content-Type', 'application/xml');
        res.header('Cache-Control', 'public, max-age=3600');
        const [vendors] = await db.query(
            `SELECT slug, updated_at FROM marketplace_vendors WHERE status = 'active'`
        );
        res.send(buildUrlsetXml(vendors.map(v => ({
            loc: `${SITE_URL}/marketplace/${v.slug}`,
            lastmod: toDate(v.updated_at),
            changefreq: 'weekly',
            priority: '0.5'
        }))));
    } catch (err) {
        console.error('Sitemap marketplace error:', err);
        res.status(500).send('Error generating marketplace sitemap');
    }
});

// --- SPA Prerender (serves fully-rendered HTML to crawlers) ---
const PRERENDER_URL = process.env.PRERENDER_URL || 'http://127.0.0.1:3333';

async function fetchPrerender(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${PRERENDER_URL}/render?url=${encodeURIComponent(url)}`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) throw new Error(`Prerender returned ${res.status}`);
        return await res.text();
    } catch (err) {
        console.error('Prerender fetch failed:', err.message);
        return null;
    }
}

// --- Crawler Meta Injection (SEO + social sharing) ---
const CRAWLER_UA = /googlebot|bingbot|yandex|facebookexternalhit|twitterbot|telegrambot|linkedinbot|slackbot|whatsapp|pinterest|discordbot|applebot|duckduckbot|petalbot/i;

// Known valid static routes
const VALID_ROUTES = new Set(['/', '/dictionary', '/tutor', '/recipes', '/marketplace', '/family']);

const injectMetaTags = async (req, res, indexHtml) => {
    let title = 'מורשת ג\'והורי | המילון לשימור השפה';
    let description = 'מילון ג\'והורי-עברי אינטראקטיבי לשימור שפת יהודי ההרים';
    let image = `${SITE_URL}/images/og-default.png`;
    const url = `${SITE_URL}${req.path}`;
    let jsonLd = null;
    let bodyContent = '';
    let isValidPage = VALID_ROUTES.has(req.path);

    try {
        const wordMatch = req.path.match(/^\/word\/(.+)$/);
        const recipeMatch = req.path.match(/^\/recipes\/(\d+)$/);
        const vendorMatch = req.path.match(/^\/marketplace\/(.+)$/);

        if (wordMatch) {
            const term = decodeURIComponent(wordMatch[1]);
            const [entries] = await db.query(
                `SELECT de.hebrew_script, de.hebrew_short, de.russian_short, de.english_short, de.part_of_speech,
                        de.hebrew_script as t_hebrew_script, t.latin_script, t.cyrillic_script, t.pronunciation_guide
                 FROM dictionary_entries de
                 LEFT JOIN dialect_scripts t ON de.id = t.entry_id
                 WHERE de.hebrew_script = ? AND de.status = 'active' LIMIT 1`,
                [term]
            );
            if (entries.length) {
                const e = entries[0];
                isValidPage = true;
                title = `${term} - תרגום ג'והורי | מורשת ג'והורי`;
                const meanings = [e.hebrew_short, e.russian_short, e.english_short].filter(Boolean).join(' | ');
                description = meanings
                    ? `${term}: ${meanings} - מילון ג'והורי-עברי`
                    : `חפש את המשמעות של "${term}" במילון הג'והורי-עברי`;
                const ldData = {
                    "@type": "DefinedTerm",
                    "name": term,
                    "description": meanings || description,
                    "inLanguage": "jdt",
                    "inDefinedTermSet": {
                        "@type": "DefinedTermSet",
                        "name": "מילון ג'והורי-עברי",
                        "url": SITE_URL,
                        "inLanguage": ["jdt", "he", "ru"]
                    }
                };
                if (e.latin_script) ldData.termCode = e.latin_script;
                jsonLd = JSON.stringify(ldData);
                bodyContent = `<h1>${term}</h1>`;
                if (e.hebrew_short) bodyContent += `<p>עברית: ${e.hebrew_short}</p>`;
                if (e.russian_short) bodyContent += `<p>Русский: ${e.russian_short}</p>`;
                if (e.english_short) bodyContent += `<p>English: ${e.english_short}</p>`;
                if (e.latin_script) bodyContent += `<p>Latin: ${e.latin_script}</p>`;
                if (e.part_of_speech) bodyContent += `<p>חלק דיבור: ${e.part_of_speech}</p>`;
            }
        } else if (recipeMatch) {
            const [recipes] = await db.query(
                `SELECT r.title, r.description, r.prep_time, r.cook_time, r.servings,
                        r.ingredients, r.instructions, r.created_at,
                        u.name as author_name
                 FROM recipes r
                 LEFT JOIN users u ON r.user_id = u.id
                 WHERE r.id = ? AND r.is_approved = 1 LIMIT 1`,
                [recipeMatch[1]]
            );
            if (recipes.length) {
                const r = recipes[0];
                isValidPage = true;
                title = `${r.title} - מתכון | מורשת ג'והורי`;
                description = r.description || `מתכון מסורתי: ${r.title}`;
                const ldData = {
                    "@type": "Recipe",
                    "name": r.title,
                    "description": description,
                    "recipeCuisine": "Caucasian Jewish"
                };
                if (r.author_name) ldData.author = { "@type": "Person", "name": r.author_name };
                if (r.created_at) ldData.datePublished = new Date(r.created_at).toISOString().split('T')[0];
                if (r.prep_time) ldData.prepTime = `PT${r.prep_time}M`;
                if (r.cook_time) ldData.cookTime = `PT${r.cook_time}M`;
                if (r.servings) ldData.recipeYield = `${r.servings} מנות`;
                try {
                    const ingredients = typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : r.ingredients;
                    if (Array.isArray(ingredients) && ingredients.length) ldData.recipeIngredient = ingredients;
                } catch (_) {}
                try {
                    const instructions = typeof r.instructions === 'string' ? JSON.parse(r.instructions) : r.instructions;
                    if (Array.isArray(instructions) && instructions.length) {
                        ldData.recipeInstructions = instructions.map(step => ({ "@type": "HowToStep", "text": step }));
                    }
                } catch (_) {}
                jsonLd = JSON.stringify(ldData);
                bodyContent = `<h1>${r.title}</h1><p>${description}</p>`;
            }
        } else if (vendorMatch) {
            const [vendors] = await db.query(
                'SELECT name, about_text FROM marketplace_vendors WHERE slug = ? AND status = ? LIMIT 1',
                [vendorMatch[1], 'active']
            );
            if (vendors.length) {
                isValidPage = true;
                title = `${vendors[0].name} - שוק | מורשת ג'והורי`;
                description = vendors[0].about_text || `${vendors[0].name} בשוק הקהילתי`;
                jsonLd = JSON.stringify({
                    "@type": "LocalBusiness",
                    "name": vendors[0].name,
                    "description": description,
                    "url": url
                });
                bodyContent = `<h1>${vendors[0].name}</h1><p>${description}</p>`;
            }
        } else if (req.path === '/') {
            isValidPage = true;
            jsonLd = JSON.stringify({
                "@type": "WebSite",
                "name": "מורשת ג'והורי",
                "alternateName": "Juhuri Heritage",
                "url": SITE_URL,
                "description": description,
                "inLanguage": ["jdt", "he", "ru"],
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": { "@type": "EntryPoint", "urlTemplate": `${SITE_URL}/?q={search_term_string}` },
                    "query-input": "required name=search_term_string"
                }
            });
            bodyContent = `<h1>מורשת ג'והורי - המילון לשימור השפה</h1><p>${description}</p>`;
        } else if (req.path === '/dictionary') {
            isValidPage = true;
            title = 'מילון ג\'והורי-עברי | מורשת ג\'והורי';
            description = 'מילון ג\'והורי-עברי מקיף. חפשו מילים בשפת יהודי ההרים עם תרגום לעברית, רוסית ותעתיק לטיני.';
            bodyContent = `<h1>מילון ג'והורי-עברי</h1><p>${description}</p><p>חפשו מילים בג'והורית, עברית או רוסית. המילון כולל הגיית מילים, דוגמאות שימוש ותרגומים.</p>`;
        } else if (req.path === '/tutor') {
            isValidPage = true;
            title = 'מורה פרטי AI לג\'והורית | מורשת ג\'והורי';
            description = 'למד ג\'והורית עם מורה פרטי מבוסס בינה מלאכותית. תרגול שיחה, תרגום ודקדוק בשפת יהודי ההרים.';
            bodyContent = `<h1>מורה פרטי AI לג'והורית</h1><p>${description}</p><p>התחל שיחה עם סבא מרדכי - מורה וירטואלי שילמד אותך את שפת ג'והורי, שפת יהודי ההרים מהקווקז.</p>`;
        } else if (req.path === '/recipes') {
            isValidPage = true;
            title = 'מתכונים מסורתיים של יהודי ההרים | מורשת ג\'והורי';
            description = 'אוסף מתכונים מסורתיים של יהודי הקווקז - מאכלי ג\'והורי אותנטיים עם מרכיבים ושלבי הכנה.';
            bodyContent = `<h1>מתכונים מסורתיים של יהודי ההרים</h1><p>${description}</p>`;
        } else if (req.path === '/marketplace') {
            isValidPage = true;
            title = 'שוק קהילתי | מורשת ג\'והורי';
            description = 'שוק קהילתי של יהודי ההרים - מוצרים, שירותים ועסקים של הקהילה הג\'והורית בישראל.';
            bodyContent = `<h1>שוק קהילתי - יהודי ההרים</h1><p>${description}</p>`;
        } else if (req.path === '/family') {
            isValidPage = true;
            title = 'עץ משפחה וגנאולוגיה | מורשת ג\'והורי';
            description = 'חקרו את עץ המשפחה והרשת הקהילתית של יהודי ההרים. גלו קשרים משפחתיים ושורשים.';
            bodyContent = `<h1>עץ משפחה - יהודי ההרים</h1><p>${description}</p><p>בנו את עץ המשפחה שלכם וגלו קשרים עם משפחות אחרות בקהילה הג\'והורית.</p>`;
        }
    } catch (err) {
        console.error('Crawler meta injection DB error:', err);
    }

    // Escape HTML entities for safety
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // For body content - less aggressive escaping (we control the template)
    const escBody = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Strip duplicate tags that prerender/React Helmet may have added
    let cleaned = indexHtml
        .replace(/<title>.*?<\/title>/g, '')                          // remove ALL title tags
        .replace(/<meta name="description"[^>]*>/g, '')               // remove ALL description metas
        .replace(/<link rel="canonical"[^>]*>/g, '')                  // remove ALL canonical links
        .replace(/<meta property="og:[^"]*"[^>]*>/g, '')              // remove ALL og: tags
        .replace(/<meta name="twitter:[^"]*"[^>]*>/g, '')             // remove ALL twitter: tags
        .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');  // remove ALL JSON-LD

    // Inject authoritative meta tags
    const metaBlock = `<title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="he_IL">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="מורשת ג'והורי">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image" content="${esc(image)}">`;

    let html = cleaned.replace(/<meta charset="UTF-8"[^>]*>/, `<meta charset="UTF-8">\n  ${metaBlock}`);

    // Build @graph with Organization + BreadcrumbList + page-specific schema
    const graph = [{
        "@type": "Organization",
        "name": "Juhuri Heritage",
        "alternateName": "מורשת ג'והורי",
        "url": SITE_URL,
        "logo": `${SITE_URL}/images/og-default.png`,
        "description": "שימור שפת ג'והורי, מתכונים ומורשת תרבותית של יהודי ההרים"
    }];

    if (jsonLd) {
        graph.push(JSON.parse(jsonLd));
    }

    // Add BreadcrumbList for non-homepage routes
    if (req.path !== '/') {
        const breadcrumb = {
            "@type": "BreadcrumbList",
            "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "דף הבית", "item": SITE_URL }
            ]
        };
        const wordMatch = req.path.match(/^\/word\//);
        const recipeMatch = req.path.match(/^\/recipes\/(\d+)$/);
        const vendorMatch = req.path.match(/^\/marketplace\/(.+)$/);
        if (wordMatch) {
            breadcrumb.itemListElement.push({ "@type": "ListItem", "position": 2, "name": "מילון", "item": SITE_URL });
            breadcrumb.itemListElement.push({ "@type": "ListItem", "position": 3, "name": title.split(' - ')[0] });
        } else if (recipeMatch) {
            breadcrumb.itemListElement.push({ "@type": "ListItem", "position": 2, "name": "מתכונים", "item": `${SITE_URL}/recipes` });
            breadcrumb.itemListElement.push({ "@type": "ListItem", "position": 3, "name": title.split(' - ')[0] });
        } else if (vendorMatch) {
            breadcrumb.itemListElement.push({ "@type": "ListItem", "position": 2, "name": "שוק", "item": `${SITE_URL}/marketplace` });
            breadcrumb.itemListElement.push({ "@type": "ListItem", "position": 3, "name": title.split(' - ')[0] });
        } else {
            breadcrumb.itemListElement.push({ "@type": "ListItem", "position": 2, "name": title.split(' | ')[0] });
        }
        graph.push(breadcrumb);
    }

    const fullLd = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
    html = html.replace('</head>', `  <script type="application/ld+json">${fullLd}</script>\n</head>`);

    // Inject visible content for crawlers (inside noscript for non-JS rendering)
    if (bodyContent) {
        html = html.replace('<div id="root"></div>', `<div id="root"></div>\n  <noscript><main>${bodyContent}</main></noscript>`);
    }

    return { html, isValidPage };
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

// --- Serve robots.txt (DB-first, then file fallback) ---
app.get('/robots.txt', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT setting_value FROM seo_settings WHERE setting_key = 'robots_txt'`
        );
        if (rows.length > 0) {
            res.type('text/plain').send(rows[0].setting_value);
            return;
        }
    } catch (err) {
        // Table might not exist yet, fall through
    }
    // Fallback to static file (check dist first, then public)
    const distPath = path.join(__dirname, '../dist/robots.txt');
    const publicPath = path.join(__dirname, '../public/robots.txt');
    if (fs.existsSync(distPath)) {
        res.type('text/plain').sendFile(distPath);
    } else if (fs.existsSync(publicPath)) {
        res.type('text/plain').sendFile(publicPath);
    } else {
        res.type('text/plain').send('User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://jun-juhuri.com/sitemap.xml\n');
    }
});

// --- Serve llms.txt (DB-first, then file fallback) ---
app.get('/llms.txt', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT setting_value FROM seo_settings WHERE setting_key = 'llms_txt'`
        );
        if (rows.length > 0) {
            res.type('text/plain').send(rows[0].setting_value);
            return;
        }
    } catch (err) {
        // Table might not exist yet, fall through
    }
    const distPath = path.join(__dirname, '../dist/llms.txt');
    const publicPath = path.join(__dirname, '../public/llms.txt');
    if (fs.existsSync(distPath)) {
        res.type('text/plain').sendFile(distPath);
    } else if (fs.existsSync(publicPath)) {
        res.type('text/plain').sendFile(publicPath);
    } else {
        res.status(404).send('Not found');
    }
});

// --- Serve static files in production ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../dist'), {
        maxAge: '1y',
        index: false, // Don't auto-serve index.html for '/' — let catch-all handle it for crawler injection
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
            }
        }
    }));

    // Inject GA Measurement ID into HTML
    const GA_ID = process.env.GA_MEASUREMENT_ID || '';
    const injectGA = (html) => GA_ID ? html.replace(/GA_MEASUREMENT_ID/g, GA_ID) : html.replace(/<script[^>]*gtag[^>]*><\/script>\s*<script>[^<]*<\/script>\s*/g, '');

    // Crawler-aware SPA fallback with proper 404 handling
    app.get('*', async (req, res) => {
        if (req.path.startsWith('/api')) return;

        const indexPath = path.join(__dirname, '../dist/index.html');
        const isCrawler = CRAWLER_UA.test(req.headers['user-agent'] || '');

        if (isCrawler) {
            try {
                // Try prerender first — returns fully-rendered HTML with all content
                const prerenderHtml = await fetchPrerender(`${SITE_URL}${req.originalUrl}`);
                const baseHtml = prerenderHtml || fs.readFileSync(indexPath, 'utf8');

                // Apply SEO meta tags (title, OG, JSON-LD) on top of whichever HTML we got
                const { html, isValidPage } = await injectMetaTags(req, res, baseHtml);
                if (!isValidPage) {
                    res.status(404).send(injectGA(html));
                } else {
                    res.send(injectGA(html));
                }
            } catch (err) {
                console.error('Crawler injection error:', err);
                const html = fs.readFileSync(indexPath, 'utf8');
                res.send(injectGA(html));
            }
        } else {
            const html = fs.readFileSync(indexPath, 'utf8');
            res.send(injectGA(html));
        }
    });
}

// --- Error Handling ---
app.use((err, req, res, next) => {
    console.error('Server Error:', err.message);

    // Async file logging (non-blocking, with size cap)
    const logEntry = `${new Date().toISOString()} - ${err.message}\n${err.stack}\n\n`;
    const LOG_FILE = 'server_error.log';
    const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
    fs.stat(LOG_FILE, (statErr, stats) => {
        if (!statErr && stats.size > MAX_LOG_SIZE) {
            fs.rename(LOG_FILE, `server_error.${Date.now()}.log`, () => {
                fs.appendFile(LOG_FILE, logEntry, () => {});
            });
        } else {
            fs.appendFile(LOG_FILE, logEntry, () => {});
        }
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

// --- Crash Protection ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
    const logEntry = `${new Date().toISOString()} - UNHANDLED_REJECTION: ${reason?.stack || reason}\n\n`;
    fs.appendFile('server_error.log', logEntry, () => {});
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    const logEntry = `${new Date().toISOString()} - UNCAUGHT_EXCEPTION: ${err.stack}\n\n`;
    fs.appendFileSync('server_error.log', logEntry);
    // Give time to flush logs, then exit (PM2 will restart)
    setTimeout(() => process.exit(1), 1000);
});

module.exports = app;
