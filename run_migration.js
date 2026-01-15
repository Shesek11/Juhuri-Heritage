// Temporary script to run migration SQL using mysql2
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
    try {
        const sql = fs.readFileSync(path.resolve(__dirname, 'migrations/001_rbac_feature_flags.sql'), 'utf8');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev',
            multipleStatements: true,
        });
        await connection.query(sql);
        console.log('Migration applied successfully');
        await connection.end();
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
})();
