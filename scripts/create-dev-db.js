
const mysql = require('mysql2/promise');
require('dotenv').config();

const SOURCE_DB = process.env.DB_DATABASE;
const TARGET_DB = 'juhuri_dev';

async function cloneDatabase() {
    console.log(`🚀 Starting Database Clone: ${SOURCE_DB} ➡️ ${TARGET_DB}`);

    let connection;
    try {
        // Connect without database selected to create the new one
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to MySQL server');

        // Create Dev Database
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${TARGET_DB} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database ${TARGET_DB} created/verified`);

        // Get all tables from source
        const [tables] = await connection.query(`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`, [SOURCE_DB]);

        if (tables.length === 0) {
            console.error(`❌ Source database ${SOURCE_DB} has no tables! Check .env configuration.`);
            process.exit(1);
        }

        console.log(`📋 Found ${tables.length} tables to clone:`, tables.map(t => t.TABLE_NAME).join(', '));

        for (const row of tables) {
            const tableName = row.TABLE_NAME;

            // Drop target table if exists
            await connection.query(`DROP TABLE IF EXISTS ${TARGET_DB}.${tableName}`);

            // Create table structure
            await connection.query(`CREATE TABLE ${TARGET_DB}.${tableName} LIKE ${SOURCE_DB}.${tableName}`);

            // Copy data
            await connection.query(`INSERT INTO ${TARGET_DB}.${tableName} SELECT * FROM ${SOURCE_DB}.${tableName}`);

            console.log(`   ✨ Cloned table: ${tableName}`);
        }

        console.log('\n🎉 Database replication complete!');
        console.log('👉 Next step: Update your .env file to use DB_DATABASE=juhuri_dev');

    } catch (err) {
        console.error('❌ Error creating development database:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

cloneDatabase();
