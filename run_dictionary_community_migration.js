// Run Migration 007: Dictionary Community Features
const pool = require('./server/config/db');

async function runMigration() {
    const fs = require('fs');
    const path = require('path');

    const migrationPath = path.join(__dirname, 'migrations', '007_dictionary_community.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // First, remove all comment lines
    const cleanedSql = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n');

    // Then split by semicolon
    const statements = cleanedSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`Running ${statements.length} migration statements...`);

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        console.log(`\n--- Statement ${i + 1} ---`);
        console.log(stmt.substring(0, 80) + (stmt.length > 80 ? '...' : ''));
        try {
            await pool.query(stmt);
            console.log(`✓ Statement ${i + 1}/${statements.length} executed`);
        } catch (err) {
            // Ignore "already exists" errors
            if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_TABLE_EXISTS_ERROR' ||
                err.message.includes('Duplicate column') || err.message.includes('already exists')) {
                console.log(`⚠ Statement ${i + 1} skipped (already exists)`);
            } else {
                console.error(`✗ Statement ${i + 1} failed:`, err.message);
            }
        }
    }

    console.log('\n✅ Migration 007 complete!');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
