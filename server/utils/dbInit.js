const fs = require('fs').promises;
const path = require('path');
const db = require('../config/db');

async function initializeDatabase() {
    try {
        // Check if one of the key tables exists to decide if we need to init
        const [rows] = await db.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'dialects'
        `);

        if (rows.length > 0) {
            console.log('✅ Database schema verified (tables exist)');
            return;
        }

        console.log('⚠️ Database tables missing. Initializing schema from schema.sql...');

        const schemaPath = path.join(__dirname, '../../schema.sql');
        const sql = await fs.readFile(schemaPath, 'utf8');

        // Split statements by semicolon
        // We assume simple SQL without semicolons inside strings for this specific schema
        const statements = sql
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0);

        for (const statement of statements) {
            // Skip empty statements or comments-only
            if (!statement) continue;

            try {
                await db.query(statement);
            } catch (err) {
                console.error('⚠️ Warning executing statement:', err.message);
                // Continue despite errors (e.g. if table exists but check failed)
            }
        }

        console.log('✅ Database initialized successfully');

    } catch (error) {
        console.error('❌ Failed to initialize database:', error.message);
        // We log but don't exit, in case the server can partially function or this is a connection error specific to init
    }
}

module.exports = initializeDatabase;
