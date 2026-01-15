const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev'
        });

        await connection.query("UPDATE feature_flags SET status='active' WHERE feature_key='marketplace_module'");
        console.log('✅ Enabled marketplace_module feature flag');

        await connection.end();
    } catch (err) {
        console.error('Error:', err);
    }
})();
