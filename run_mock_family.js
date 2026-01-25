const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
    try {
        console.log('👨‍👩‍👧‍👦 Creating mock family data - 4 generations...');
        const sql = fs.readFileSync(path.resolve(__dirname, 'create_mock_family.sql'), 'utf8');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev',
            multipleStatements: true,
        });

        await connection.query(sql);
        console.log('✅ Mock family data created successfully!');
        console.log('   📊 Created 32 family members across 4 generations');
        console.log('   👥 Including: married, divorced, widowed, adopted, half-siblings');

        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed to create mock data:', err.message);
        console.error(err);
        process.exit(1);
    }
})();
