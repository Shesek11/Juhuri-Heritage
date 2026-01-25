require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./server/config/db');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'server/database/migrations/005_family_relationships.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split functionality of the file into statements is hard because it contains logic.
        // But pool.query might not support multiple statements unless multipleStatements: true is set.
        // server/config/db.js doesn't show multipleStatements: true.

        // However, the migration adds columns using basic ALTER TABLE.
        // Let's manually run the specific ALTER statements we need.

        console.log('Adding columns to family_members...');

        const alterQuery = `
            ALTER TABLE family_members 
            ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) AFTER maiden_name,
            ADD COLUMN IF NOT EXISTS previous_name VARCHAR(100) AFTER nickname,
            ADD COLUMN IF NOT EXISTS title VARCHAR(50) AFTER previous_name;
        `;

        await pool.query(alterQuery);
        console.log('✅ Columns added successfully.');

        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

runMigration();
