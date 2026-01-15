// Run migration for recipes module
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
    try {
        console.log('🍽️ Running Recipes Module migration...');
        const sql = fs.readFileSync(path.resolve(__dirname, 'migrations/002_recipes_module.sql'), 'utf8');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev',
            multipleStatements: true,
        });
        await connection.query(sql);
        console.log('✅ Recipes Module migration applied successfully');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
})();
