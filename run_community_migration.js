/**
 * Run Community Features Migration
 * Adds tables for audit logs, merge suggestions, and collaborative editing
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    console.log('🚀 Starting Community Features Migration...\n');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'juhuri',
        multipleStatements: true
    });

    try {
        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', '006_community_features.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolon and filter empty statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            const preview = statement.substring(0, 60).replace(/\n/g, ' ');

            try {
                await connection.query(statement);
                console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
            } catch (err) {
                // Some statements might fail if already applied (IF NOT EXISTS helps)
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') {
                    console.log(`⏭️  [${i + 1}/${statements.length}] Already exists: ${preview}...`);
                } else {
                    console.error(`❌ [${i + 1}/${statements.length}] Error: ${err.message}`);
                    console.error(`   Statement: ${preview}...`);
                }
            }
        }

        console.log('\n✨ Migration completed!\n');

        // Verify tables exist
        console.log('📊 Verifying new tables:');
        const [tables] = await connection.query(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME LIKE 'family_%'
            ORDER BY TABLE_NAME
        `, [process.env.DB_NAME || 'juhuri']);

        tables.forEach(t => console.log(`   ✓ ${t.TABLE_NAME}`));

        // Check new columns
        console.log('\n📊 Verifying new columns in family_members:');
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = ? 
            AND TABLE_NAME = 'family_members'
            AND COLUMN_NAME IN ('external_id', 'external_source', 'last_name_soundex', 'merged_into')
        `, [process.env.DB_NAME || 'juhuri']);

        columns.forEach(c => console.log(`   ✓ ${c.COLUMN_NAME}`));

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

runMigration();
