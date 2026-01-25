const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
    try {
        console.log('📊 Adding generation column to family_members table...');
        const sql = fs.readFileSync(path.resolve(__dirname, 'migrations/010_add_generation_column.sql'), 'utf8');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev',
            multipleStatements: true,
        });

        await connection.query(sql);
        console.log('✅ Generation column added successfully');
        console.log('   Now you can run: node run_mock_family.js');

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        if (err.message.includes('Duplicate column')) {
            console.log('ℹ️  Column already exists, skipping...');
            process.exit(0);
        }
        process.exit(1);
    }
})();
