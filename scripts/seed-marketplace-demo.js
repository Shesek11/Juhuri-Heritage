#!/usr/bin/env node

/**
 * 🌱 סקריפט להוספת נתוני דמה למערכת השוק
 * Usage: node scripts/seed-marketplace-demo.js
 *
 * יוצר חנויות דמה באזור חדרה/פרדס חנה עם:
 * - Vendors עם מיקומים אמיתיים
 * - תפריט מלא
 * - שעות פתיחה
 * - ביקורות
 * - עדכונים/מבצעים
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

// Database configuration
const DB_CONFIG = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'juhuri_heritage',
    multipleStatements: true,
    charset: 'utf8mb4'
};

// Demo data - Vendors in Hadera/Pardes Hanna area
const DEMO_VENDORS = [
    {
        name: 'המטבח של סבתא רוזה',
        slug: 'grandma-roza-kitchen',
        about_text: 'אוכל ג\'והורי ביתי מסורתי מהמטבח של סבתא רוזה. מתכונים עתיקים מדורי דורות.',
        phone: '050-1234567',
        email: 'roza@example.com',
        address: 'רחוב הרצל 45, חדרה',
        city: 'חדרה',
        latitude: 32.4344,
        longitude: 34.9189,
        logo_url: 'https://ui-avatars.com/api/?name=Roza&background=f97316&color=fff&size=200',
        owner_name: 'רוזה אליהו',
        menu: [
            { name: 'דושפרה', description: 'מרק מסורתי עם כופתאות בשר ועשבי תיבול', price: 48, category: 'מנות עיקריות' },
            { name: 'קובה', description: 'כופתאות בורגול במילוי בשר ותבלינים', price: 42, category: 'מנות עיקריות' },
            { name: 'פלאו', description: 'אורז מתובל עם בשר ופירות יבשים', price: 55, category: 'מנות עיקריות' },
            { name: 'קוטלטי', description: 'קציצות עוף ברוטב עגבניות', price: 38, category: 'מנות עיקריות' },
            { name: 'גוז׳ינאק', description: 'חטיף אגוזים ודבש מסורתי', price: 25, category: 'קינוחים' },
        ],
        updates: [
            { title: '🎉 מבצע סוף שבוע!', content: 'כל המנות במחיר מיוחד ליום שישי - הזמינו מראש!' }
        ]
    },
    {
        name: 'טעמי קווקז - אליהו',
        slug: 'kavkaz-flavors',
        about_text: 'מסעדה קווקזית עם מגוון מנות מהמטבח הג\'והורי והגאורגי. אווירה משפחתית וחמה.',
        phone: '052-9876543',
        email: 'kavkaz@example.com',
        address: 'שדרות ביאלק 12, פרדס חנה',
        city: 'פרדס חנה',
        latitude: 32.4719,
        longitude: 34.9739,
        about_image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
        owner_name: 'אליהו יוסף',
        menu: [
            { name: 'חצ׳פורי', description: 'פיתה גאורגית במילוי גבינות וביצה', price: 45, category: 'מאפים' },
            { name: 'חינקלי', description: 'כיסוני בשר גאורגיים עסיסיים', price: 52, category: 'מנות עיקריות' },
            { name: 'שאשליק', description: 'שיפודי בשר בקר מתובלים', price: 68, category: 'מנות עיקריות' },
            { name: 'לובייה', description: 'תבשיל שעועית ירוקה ברוטב עגבניות', price: 35, category: 'מנות צד' },
            { name: 'באקלבה', description: 'מאפה פריך במילוי אגוזים ודבש', price: 28, category: 'קינוחים' },
            { name: 'צ׳ורצ׳כלה', description: 'אגוזי מלך בציפוי מיץ ענבים מרוכז', price: 32, category: 'קינוחים' },
        ],
        updates: [
            { title: '🍢 תפריט שישי מיוחד', content: 'שאשליק טרי על האש! הזמינו עד יום חמישי בצהריים' }
        ]
    },
    {
        name: 'אוכל בושרי של לילי',
        slug: 'lili-bukharian-food',
        about_text: 'מאכלים בושריים ביתיים מוכנים באהבה. התמחות בפלאו, קובה ומאפים מסורתיים.',
        phone: '054-3216789',
        address: 'רחוב יהלום 28, חדרה',
        city: 'חדרה',
        latitude: 32.4456,
        longitude: 34.9278,
        logo_url: 'https://ui-avatars.com/api/?name=Lili&background=ec4899&color=fff&size=200',
        owner_name: 'לילי דדון',
        menu: [
            { name: 'פלאו אפגני', description: 'אורז בסמטי עם גזר, צימוקים ובשר טלה', price: 62, category: 'מנות עיקריות' },
            { name: 'קובה חמוצה', description: 'כופתאות במרק עגבניות חמוץ-מתוק', price: 46, category: 'מנות עיקריות' },
            { name: 'סמבוסק', description: 'בורקסים קטנים במילוי בשר ובצל', price: 36, category: 'מאפים' },
            { name: 'נאן בושרי', description: 'לחם מסורתי מהתנור', price: 18, category: 'לחמים' },
            { name: 'חלווה', description: 'קינוח מסורתי מטחינה גולמית', price: 22, category: 'קינוחים' },
        ]
    },
    {
        name: 'בית ברכה - קייטרינג ביתי',
        slug: 'beit-bracha-catering',
        about_text: 'קייטרינג ביתי לאירועים משפחתיים. מתמחים במנות מסורתיות לשבתות וחגים.',
        phone: '050-7654321',
        email: 'bracha@example.com',
        address: 'רחוב הנשיא 67, פרדס חנה',
        city: 'פרדס חנה',
        latitude: 32.4689,
        longitude: 34.9812,
        owner_name: 'ברכה כהן',
        menu: [
            { name: 'גונדי', description: 'כופתאות גרוס עוף ברוטב', price: 44, category: 'מנות עיקריות' },
            { name: 'טבית', description: 'תבשיל שבת מסורתי עם בשר ותפוחי אדמה', price: 58, category: 'מנות עיקריות' },
            { name: 'שילה פלאו', description: 'אורז עם שעועית ובשר', price: 52, category: 'מנות עיקריות' },
            { name: 'מנטי', description: 'כיסוני בשר מאודים במילוי בשר וקישואים', price: 48, category: 'מנות עיקריות' },
        ],
        updates: [
            { title: '🕯️ מנות לשבת ולחגים', content: 'הזמינו מנות מסורתיות לשבת עד יום חמישי! מינימום 4 מנות.' }
        ]
    },
    {
        name: 'מאפיית זרחי',
        slug: 'zarchi-bakery',
        about_text: 'מאפייה מסורתית עם לחמים ומאפים טריים מדי יום. ריחות של פעם מהתנור.',
        phone: '053-8765432',
        address: 'רחוב ויצמן 156, חדרה',
        city: 'חדרה',
        latitude: 32.4389,
        longitude: 34.9156,
        logo_url: 'https://ui-avatars.com/api/?name=Zarchi&background=eab308&color=000&size=200',
        owner_name: 'יוסף זרחי',
        menu: [
            { name: 'לחם טנדירי', description: 'לחם מסורתי מתנור טאבון', price: 12, category: 'לחמים' },
            { name: 'נאן עם שומשום', description: 'לחם רך עם שומשום קלוי', price: 14, category: 'לחמים' },
            { name: 'בולאני', description: 'מאפה פריך במילוי תפוחי אדמה', price: 20, category: 'מאפים' },
            { name: 'פטיר', description: 'לחם שכבות חמאתי', price: 16, category: 'לחמים' },
            { name: 'שירמל', description: 'עוגיות חמאה עם אגוזים', price: 24, category: 'עוגיות' },
            { name: 'רוגלך', description: 'מאפה במילוי ריבה ואגוזים', price: 26, category: 'מאפים' },
        ]
    },
    {
        name: 'השיפודייה הקווקזית',
        slug: 'caucasus-kebab',
        about_text: 'שיפודים על האש בסגנון קווקזי אותנטי. בשר טרי וטחון במקום מדי יום.',
        phone: '052-1239876',
        address: 'שדרות החילוץ 89, חדרה',
        city: 'חדרה',
        latitude: 32.4401,
        longitude: 34.9234,
        about_image_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
        owner_name: 'דוד משיאשוילי',
        menu: [
            { name: 'שאשליק כבש', description: 'שיפודי כבש טרי על האש', price: 72, category: 'שיפודים' },
            { name: 'ליולה קבאב', description: 'קבב טחון על שיפוד', price: 58, category: 'שיפודים' },
            { name: 'כבד עוף מטוגן', description: 'כבד עוף טרי מטוגן עם בצל', price: 42, category: 'מנות עיקריות' },
            { name: 'פרגית על האש', description: 'שיפודי עוף עסיסיים', price: 54, category: 'שיפודים' },
            { name: 'מצבר', description: 'תערובת ירקות צלויים', price: 28, category: 'מנות צד' },
        ],
        updates: [
            { title: '🔥 שישי על האש!', content: 'כל השיפודים טריים מהמנגל! הזמינו מראש ליום שישי' }
        ]
    }
];

async function createVendor(connection, vendorData) {
    try {
        // 1. Create vendor
        const [vendorResult] = await connection.query(
            `INSERT INTO marketplace_vendors (
                name, slug, about_text, phone, email, address, city,
                latitude, longitude, logo_url, about_image_url,
                is_active, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 'active')`,
            [
                vendorData.name,
                vendorData.slug,
                vendorData.about_text,
                vendorData.phone,
                vendorData.email || null,
                vendorData.address,
                vendorData.city,
                vendorData.latitude,
                vendorData.longitude,
                vendorData.logo_url || null,
                vendorData.about_image_url || null
            ]
        );

        const vendorId = vendorResult.insertId;
        log(colors.green, `  ✓ Created vendor: ${vendorData.name} (ID: ${vendorId})`);

        // 2. Create default opening hours
        await connection.query('CALL create_default_hours(?)', [vendorId]);
        log(colors.blue, `    • Added default hours`);

        // 3. Create menu items
        if (vendorData.menu && vendorData.menu.length > 0) {
            for (const item of vendorData.menu) {
                await connection.query(
                    `INSERT INTO marketplace_menu_items (
                        vendor_id, name, description, price, currency, category, is_available
                    ) VALUES (?, ?, ?, ?, 'ILS', ?, TRUE)`,
                    [vendorId, item.name, item.description, item.price, item.category]
                );
            }
            log(colors.blue, `    • Added ${vendorData.menu.length} menu items`);
        }

        // 4. Create updates/promotions
        if (vendorData.updates && vendorData.updates.length > 0) {
            for (const update of vendorData.updates) {
                await connection.query(
                    `INSERT INTO marketplace_updates (
                        vendor_id, title, content, is_active
                    ) VALUES (?, ?, ?, TRUE)`,
                    [vendorId, update.title, update.content]
                );
            }
            log(colors.blue, `    • Added ${vendorData.updates.length} updates`);
        }

        return vendorId;
    } catch (error) {
        log(colors.red, `  ✗ Failed to create vendor: ${vendorData.name}`);
        console.error(error.message);
        return null;
    }
}

async function createDemoReviews(connection, vendorIds) {
    // Note: Reviews require user_id (FOREIGN KEY to users table)
    // We'll skip creating reviews in demo data unless users exist

    try {
        // Check if there are any users in the system
        const [users] = await connection.query(
            'SELECT id FROM users LIMIT 5'
        );

        if (users.length === 0) {
            log(colors.yellow, '  ⚠ No users found - skipping reviews (reviews require registered users)');
            return;
        }

        const demoReviews = [
            { rating: 5, comment: 'אוכל מדהים! בדיוק כמו אצל סבתא. טעמים אותנטיים ומנות עשירות.' },
            { rating: 5, comment: 'השירות מעולה והאוכל טרי ומעולה. ממליץ בחום!' },
            { rating: 4, comment: 'מנות טעימות מאוד, רק זמן ההמתנה קצת ארוך.' },
            { rating: 5, comment: 'גילוי מדהים! אוכל ביתי אמיתי, מומלץ בחום!' },
            { rating: 4, comment: 'טעים מאוד, מחכים לעוד מנות חדשות בתפריט' },
        ];

        let reviewCount = 0;
        for (const vendorId of vendorIds) {
            // Add 1-2 random reviews per vendor
            const numReviews = Math.min(users.length, Math.floor(Math.random() * 2) + 1);

            for (let i = 0; i < numReviews; i++) {
                const review = demoReviews[Math.floor(Math.random() * demoReviews.length)];
                const userId = users[i % users.length].id;

                try {
                    await connection.query(
                        `INSERT INTO marketplace_reviews (
                            vendor_id, user_id, rating, comment, is_verified
                        ) VALUES (?, ?, ?, ?, FALSE)`,
                        [vendorId, userId, review.rating, review.comment]
                    );
                    reviewCount++;
                } catch (error) {
                    // Skip duplicate reviews (user can only review vendor once)
                }
            }
        }

        log(colors.blue, `  ✓ Added ${reviewCount} demo reviews`);
    } catch (error) {
        log(colors.yellow, `  ⚠ Could not create reviews: ${error.message}`);
    }
}

async function updateVendorStats(connection, vendorIds) {
    // Update marketplace_vendor_stats table
    for (const vendorId of vendorIds) {
        await connection.query(`
            INSERT INTO marketplace_vendor_stats (vendor_id, total_reviews, average_rating, total_menu_items)
            SELECT
                v.id,
                COALESCE(COUNT(DISTINCT r.id), 0) as total_reviews,
                COALESCE(AVG(r.rating), 0.00) as average_rating,
                COALESCE(COUNT(DISTINCT m.id), 0) as total_menu_items
            FROM marketplace_vendors v
            LEFT JOIN marketplace_reviews r ON r.vendor_id = v.id
            LEFT JOIN marketplace_menu_items m ON m.vendor_id = v.id
            WHERE v.id = ?
            GROUP BY v.id
            ON DUPLICATE KEY UPDATE
                total_reviews = VALUES(total_reviews),
                average_rating = VALUES(average_rating),
                total_menu_items = VALUES(total_menu_items)
        `, [vendorId]);
    }

    log(colors.blue, `  ✓ Updated vendor statistics for ${vendorIds.length} vendors`);
}

async function main() {
    log(colors.magenta, '════════════════════════════════════════════════════════');
    log(colors.magenta, '   🌱 Marketplace Demo Data Seeder');
    log(colors.magenta, '════════════════════════════════════════════════════════');
    console.log('');
    log(colors.yellow, `Database: ${DB_CONFIG.database}`);
    log(colors.yellow, `Area: חדרה / פרדס חנה`);
    log(colors.yellow, `Vendors: ${DEMO_VENDORS.length}`);
    console.log('');

    let connection;

    try {
        // Connect to database
        log(colors.blue, 'Connecting to database...');
        connection = await mysql.createConnection(DB_CONFIG);
        log(colors.green, '✅ Connected successfully');
        console.log('');

        // Create vendors
        log(colors.blue, 'Creating demo vendors...\n');
        const vendorIds = [];

        for (const vendorData of DEMO_VENDORS) {
            const vendorId = await createVendor(connection, vendorData);
            if (vendorId) {
                vendorIds.push(vendorId);
            }
            console.log('');
        }

        // Create reviews
        log(colors.blue, 'Creating demo reviews...');
        await createDemoReviews(connection, vendorIds);
        console.log('');

        // Update statistics
        log(colors.blue, 'Updating vendor statistics...');
        await updateVendorStats(connection, vendorIds);
        console.log('');

        // Success summary
        log(colors.magenta, '════════════════════════════════════════════════════════');
        log(colors.green, '   ✅ Demo data created successfully!');
        log(colors.magenta, '════════════════════════════════════════════════════════');
        console.log('');
        log(colors.yellow, `Created ${vendorIds.length} vendors with:`);
        log(colors.blue, `  • Opening hours (default schedule)`);
        log(colors.blue, `  • Menu items (${DEMO_VENDORS.reduce((sum, v) => sum + (v.menu?.length || 0), 0)} total items)`);
        log(colors.blue, `  • Updates/promotions`);
        log(colors.blue, `  • Customer reviews`);
        console.log('');
        log(colors.yellow, 'Next step: Visit https://jun-juhuri.com/marketplace');
        console.log('');

    } catch (error) {
        log(colors.red, '\n❌ Error:');
        console.error(error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run the script
main();
