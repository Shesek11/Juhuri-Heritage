const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev',
            multipleStatements: true
        });

        console.log('Running migration 005_add_avatar.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '005_add_avatar.sql'), 'utf8');

        await connection.query(sql);
        console.log('✅ Migration completed successfully');

        await connection.end();
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('⚠️ Column already exists, skipping.');
        } else {
            console.error('❌ Migration failed:', err);
            process.exit(1);
        }
    }
})();
