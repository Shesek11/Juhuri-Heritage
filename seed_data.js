const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const recipes = [
    {
        title: 'דושפרה (כיסונים)',
        description: 'מרק כיסונים בוכרי מסורתי עם בשר וירקות, מנה חגיגית במיוחד.',
        ingredients: JSON.stringify([{ item: 'קמח', amount: '1 ק"ג' }, { item: 'בשר טחון', amount: '500 גרם' }, { item: 'בצל', amount: '2' }]),
        instructions: JSON.stringify([{ step: 'מכינים בצק...' }, { step: 'ממלאים את הכיסונים...' }]),
        image_url: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&q=80&w=1000'
    },
    {
        title: 'אוש פלוב',
        description: 'האושפלו המסורתי - אורז עם גזר, בשר וכמון. המלכה של המטבח הבוכרי.',
        ingredients: JSON.stringify([{ item: 'אורז', amount: '1 ק"ג' }, { item: 'גזר', amount: '1 ק"ג' }, { item: 'בשר כבש', amount: '1 ק"ג' }]),
        instructions: JSON.stringify([{ step: 'חותכים גזר לרצועות דקות...' }, { step: 'מטגנים את הבשר...' }]),
        image_url: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&q=80&w=1000'
    }
];

const vendors = [
    {
        business_name: 'המטבח של סבתא שושנה',
        description: 'אוכל בוכרי אותנטי בטעם של פעם. משלוחים באזור תל אביב.',
        phone: '050-1234567',
        address: 'החשמונאים 10, תל אביב',
        latitude: 32.0699,
        longitude: 34.7838,
        cover_image: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?auto=format&fit=crop&q=80&w=1000',
        rating: 4.8
    },
    {
        business_name: 'מאפיית הקווקז',
        description: 'מאפים טריים כל בוקר, לחם בוכרי, גושגיז\'ה וסמבוסק.',
        phone: '052-9876543',
        address: 'הרצל 45, נתניה',
        latitude: 32.3215,
        longitude: 34.8532,
        cover_image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1000',
        rating: 4.9
    }
];

const members = [
    { first_name: 'אברהם', last_name: 'מזרחי', gender: 'male', birth_date: '1940-01-01', is_alive: true },
    { first_name: 'שרה', last_name: 'מזרחי', gender: 'female', birth_date: '1942-05-15', is_alive: true },
    { first_name: 'יצחק', last_name: 'מזרחי', gender: 'male', birth_date: '1970-03-20', is_alive: true, father_tmp: 'אברהם', mother_tmp: 'שרה' },
    { first_name: 'רבקה', last_name: 'כהן', gender: 'female', birth_date: '1972-08-10', is_alive: true },
    { first_name: 'דוד', last_name: 'מזרחי', gender: 'male', birth_date: '2000-11-25', is_alive: true, father_tmp: 'יצחק', mother_tmp: 'רבקה' }
];

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev'
        });

        console.log('🌱 Seeding database...');

        // Function to find or create user
        const getOrCreateUser = async (email, name) => {
            const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
            if (users.length > 0) return users[0].id;

            const passwordHash = await bcrypt.hash('123456', 10);
            const [res] = await connection.execute(
                'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)',
                [email, passwordHash, name, 'user']
            );
            return res.insertId;
        };

        const adminId = await getOrCreateUser('admin@juhuri.app', 'Admin User'); // Main Admin

        console.log(`Using Admin ID: ${adminId}`);

        // Seed Recipes (All owned by Admin for now)
        for (const recipe of recipes) {
            // Check existence
            const [existing] = await connection.execute('SELECT id FROM recipes WHERE title = ?', [recipe.title]);
            if (existing.length === 0) {
                const [res] = await connection.execute(
                    'INSERT INTO recipes (title, description, ingredients, instructions, region_id, user_id, is_approved) VALUES (?, ?, ?, ?, 1, ?, 1)',
                    [recipe.title, recipe.description, recipe.ingredients, recipe.instructions, adminId]
                );
                await connection.execute(
                    'INSERT INTO recipe_photos (recipe_id, url, is_main, alt_text) VALUES (?, ?, 1, ?)',
                    [res.insertId, recipe.image_url, recipe.title]
                );
            }
        }
        console.log('✅ Recipes seeded');

        // Seed Vendors (Need unique users)
        for (let i = 0; i < vendors.length; i++) {
            const vendor = vendors[i];
            // Create specific user for this vendor to ensure 1:1 constraint
            const vendorUserId = await getOrCreateUser(`vendor${i + 1}@juhuri.app`, `Vendor Agent ${i + 1}`);

            // Check if user already has a vendor profile
            const [existingVendor] = await connection.execute('SELECT id FROM vendors WHERE user_id = ?', [vendorUserId]);

            if (existingVendor.length === 0) {
                const [res] = await connection.execute(
                    'INSERT INTO vendors (user_id, business_name, description, phone, address, latitude, longitude, cover_image, rating, is_open) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
                    [vendorUserId, vendor.business_name, vendor.description, vendor.phone, vendor.address, vendor.latitude, vendor.longitude, vendor.cover_image, vendor.rating]
                );

                await connection.execute('INSERT INTO menu_items (vendor_id, title, description, price, category) VALUES (?, "גושגיז\'ה", "מאפה בשר עסיסי", 15, "main")', [res.insertId]);
                await connection.execute('INSERT INTO menu_items (vendor_id, title, description, price, category) VALUES (?, "לחם בוכרי", "לחם עגול מסורתי", 10, "side")', [res.insertId]);
            }
        }
        console.log('✅ Vendors seeded');

        // Seed Family
        const idMap = {};
        for (const m of members) {
            const [existing] = await connection.execute('SELECT id FROM family_members WHERE first_name = ? AND last_name = ?', [m.first_name, m.last_name]);
            let memberId;
            if (existing.length > 0) {
                memberId = existing[0].id;
            } else {
                const [res] = await connection.execute(
                    'INSERT INTO family_members (first_name, last_name, gender, birth_date, is_alive) VALUES (?, ?, ?, ?, ?)',
                    [m.first_name, m.last_name, m.gender, m.birth_date, m.is_alive]
                );
                memberId = res.insertId;
            }
            idMap[m.first_name] = memberId;
        }

        // Link relations
        for (const m of members) {
            if (m.father_tmp && idMap[m.father_tmp]) {
                await connection.execute('UPDATE family_members SET father_id = ?, mother_id = ? WHERE id = ?', [idMap[m.father_tmp], idMap[m.mother_tmp], idMap[m.first_name]]);
            }
        }
        // Link Spouse
        if (idMap['רבקה'] && idMap['יצחק']) {
            await connection.execute('UPDATE family_members SET spouse_id = ? WHERE id = ?', [idMap['רבקה'], idMap['יצחק']]);
            await connection.execute('UPDATE family_members SET spouse_id = ? WHERE id = ?', [idMap['יצחק'], idMap['רבקה']]);
        }

        console.log('✅ Family Tree seeded');

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
})();
