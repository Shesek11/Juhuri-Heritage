
const mysql = require('mysql2/promise');
require('dotenv').config();

const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, // This will be empty string if not set in .env
    database: process.env.DB_DATABASE,
    multipleStatements: true
};

async function migrateSchema() {
    console.log('🚀 Starting Community Schema Migration...');

    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
        console.log(`✅ Connected to database: ${DB_CONFIG.database}`);

        const updates = [
            // 1. Update USERS table
            `ALTER TABLE users 
             ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255) UNIQUE,
             ADD COLUMN IF NOT EXISTS avatar_url TEXT,
             ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'local',
             ADD COLUMN IF NOT EXISTS bio TEXT;`,

            // 2. Create COMMENTS table
            `CREATE TABLE IF NOT EXISTS comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                entry_id INT NOT NULL,
                content TEXT NOT NULL,
                likes_count INT DEFAULT 0,
                is_hidden BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
                INDEX idx_entry (entry_id),
                INDEX idx_user (user_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

            // 3. Create AUDIO_RECORDINGS table
            `CREATE TABLE IF NOT EXISTS audio_recordings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                entry_id INT NOT NULL,
                dialect_id INT NULL,
                file_url VARCHAR(512) NOT NULL,
                status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                likes_count INT DEFAULT 0,
                duration_seconds INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
                FOREIGN KEY (dialect_id) REFERENCES dialects(id) ON DELETE SET NULL,
                INDEX idx_status (status),
                INDEX idx_entry_dialect (entry_id, dialect_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

            // 4. Create LIKES table (Polymorphic-ish)
            `CREATE TABLE IF NOT EXISTS likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                target_type ENUM('comment', 'recording', 'entry') NOT NULL,
                target_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_like (user_id, target_type, target_id),
                INDEX idx_target (target_type, target_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
        ];

        console.log(`📋 Applying ${updates.length} schema updates...`);

        for (const sql of updates) {
            try {
                await connection.query(sql);
                console.log(`   ✨ Applied update: ${sql.substring(0, 50)}...`);
            } catch (err) {
                console.error(`   ⚠️ Error applying update: ${err.message}`);
            }
        }

        console.log('\n🎉 Migration complete! Database is ready for Community Features.');

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error('💡 Hint: Check your .env file credentials.');
    } finally {
        if (connection) await connection.end();
    }
}

migrateSchema();
