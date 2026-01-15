
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '', // Default XAMPP password is empty
    multipleStatements: true
};

const DB_NAME = 'juhuri_dev';

async function setupLocalDB() {
    console.log('🚀 Starting Local Database Setup for XAMPP...');

    let connection;
    try {
        // 1. Connect to MySQL server
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Connected to local MySQL server');

        // 2. Create Database
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`✅ Database '${DB_NAME}' created`);

        // 3. Switch to the new DB
        await connection.query(`USE ${DB_NAME}`);

        // 4. Read schema.sql
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSql = await fs.readFile(schemaPath, 'utf8');
        console.log('✅ Read schema.sql file');

        // 5. Execute Schema
        // We split by semicolon to execute statement by statement if needed, 
        // but mysql2 supports multipleStatements: true, so we can run it in fewer chunks.
        // However, splitting is safer for error tracking.
        const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`📋 Executing ${statements.length} logic blocks from schema...`);

        for (const statement of statements) {
            try {
                await connection.query(statement);
            } catch (err) {
                // Ignore "Table already exists" warnings if we are re-running
                if (err.code !== 'ER_TABLE_EXISTS_ERROR') {
                    console.warn(`⚠️ Warning executing statement: ${err.message}`);
                }
            }
        }

        console.log(`✨ Schema imported successfully!`);

        // 6. Create a default Admin user if not exists
        const adminEmail = 'admin@juhuri.com';
        const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [adminEmail]);

        if (users.length === 0) {
            // Create default admin: password 'admin' (hashed via bcrypt typically, but here plain for dev or update logic)
            // Note: In real app we use bcrypt. For now, let's insert a dummy.
            // Actually, the app expects hashed password. Let's ask user to register or provide a hash.
            // For simplicity, we won't insert a user now, the user can register via UI.
            console.log('ℹ️ No users found. You can register a new user via the app.');
        }

        console.log('\n🎉 Local setup complete!');
        console.log('👉 Next step: Create .env file with local credentials.');

    } catch (err) {
        console.error('❌ Error setting up database:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('💡 Hint: Is XAMPP MySQL running? Check the Control Panel.');
        }
    } finally {
        if (connection) await connection.end();
    }
}

setupLocalDB();
