const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

(async () => {
    try {
        console.log('🗑️  Clearing existing mock data (ID >= 1000)...');

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev',
            multipleStatements: true,
        });

        // Delete existing mock data
        await connection.query('DELETE FROM family_parent_child WHERE parent_id >= 1000 OR child_id >= 1000');
        console.log('   ✅ Cleared parent-child relationships');

        await connection.query('DELETE FROM family_partnerships WHERE person1_id >= 1000 OR person2_id >= 1000');
        console.log('   ✅ Cleared partnerships');

        const result = await connection.query('DELETE FROM family_members WHERE id >= 1000');
        console.log(`   ✅ Deleted ${result[0].affectedRows} existing mock members`);

        await connection.end();

        console.log('\n👨‍👩‍👧‍👦 Creating new mock family data - 4 generations...');

        // Now run the mock data script
        const sql = fs.readFileSync(path.resolve(__dirname, 'create_mock_family.sql'), 'utf8');
        const connection2 = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USERNAME || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'juhuri_dev',
            multipleStatements: true,
        });

        await connection2.query(sql);
        console.log('✅ Mock family data created successfully!');
        console.log('   📊 Created 32 family members across 4 generations');
        console.log('   👥 Including: married, divorced, widowed, adopted, half-siblings');

        await connection2.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Failed:', err.message);
        console.error(err);
        process.exit(1);
    }
})();
