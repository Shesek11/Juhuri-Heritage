// check_db.js
console.log('🔎 Starting DB verification...');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

(async () => {
    try {
        console.log('🔗 Connecting to MySQL...');
        const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev',
        });
        console.log('✅ Connected');

        const [tables] = await conn.query('SHOW TABLES;');
        console.log('=== Tables ===');
        tables.forEach(row => console.log(Object.values(row)[0]));

        const [roleCol] = await conn.query("SHOW COLUMNS FROM users LIKE 'role';");
        console.log('\n=== users.role column ===');
        console.log(roleCol.length ? 'exists' : 'missing');

        const [ff] = await conn.query("SHOW TABLES LIKE 'feature_flags';");
        console.log('\n=== feature_flags table ===');
        console.log(ff.length ? 'exists' : 'missing');

        await conn.end();
        console.log('✅ Verification completed');
        process.exit(0);
    } catch (err) {
        console.error('Error checking DB:', err.message);
        process.exit(1);
    }
})();
