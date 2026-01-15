/**
 * Migration script to create user_badges table
 * Run: node scripts/create-badges-table.js
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

async function createBadgesTable() {
    console.log('🏅 Creating user_badges table...');

    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS user_badges (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                badge_id VARCHAR(50) NOT NULL,
                earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_badge (user_id, badge_id),
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        console.log('✅ user_badges table created successfully!');

    } catch (err) {
        if (err.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('⏭️ Table already exists');
        } else {
            console.error('❌ Error:', err.message);
        }
    } finally {
        if (connection) await connection.end();
    }
}

createBadgesTable();
