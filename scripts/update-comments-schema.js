/**
 * Migration script to update comments table for guest support
 * Run: node scripts/update-comments-schema.js
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    multipleStatements: true
};

async function updateCommentsSchema() {
    console.log('🚀 Updating comments table for guest support...');

    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log(`✅ Connected to database: ${DB_CONFIG.database}`);

        const updates = [
            // 1. Allow NULL user_id for guest comments
            `ALTER TABLE comments MODIFY COLUMN user_id INT NULL;`,

            // 2. Add guest_name column
            `ALTER TABLE comments ADD COLUMN IF NOT EXISTS guest_name VARCHAR(100);`,

            // 3. Add status column for moderation
            `ALTER TABLE comments ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved';`,

            // 4. Add index on status for faster moderation queries
            `CREATE INDEX IF NOT EXISTS idx_status ON comments(status);`
        ];

        for (const sql of updates) {
            try {
                await connection.query(sql);
                console.log(`   ✨ Applied: ${sql.substring(0, 60)}...`);
            } catch (err) {
                // Ignore "duplicate column" or "index exists" errors
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME') {
                    console.log(`   ⏭️ Skipped (already exists): ${sql.substring(0, 40)}...`);
                } else {
                    console.error(`   ⚠️ Error: ${err.message}`);
                }
            }
        }

        console.log('\n🎉 Comments table updated successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

updateCommentsSchema();
