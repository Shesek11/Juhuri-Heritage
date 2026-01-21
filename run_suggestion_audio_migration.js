/**
 * Run Migration 008: Add audio support to translation suggestions
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./server/config/db');

async function runMigration() {
    console.log('\n🎤 Running Migration 008: Suggestion Audio Support');
    console.log('================================================\n');

    const migrationPath = path.join(__dirname, 'migrations', '008_suggestion_audio.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
        try {
            console.log(`📝 Executing: ${statement.substring(0, 60)}...`);
            await db.query(statement);
            console.log('   ✅ Success\n');
        } catch (err) {
            // Ignore "column already exists" errors
            if (err.code === 'ER_DUP_FIELDNAME' || err.message.includes('Duplicate column name')) {
                console.log('   ⏭️  Column already exists, skipping\n');
            } else {
                console.error(`   ❌ Error: ${err.message}\n`);
            }
        }
    }

    console.log('✨ Migration 008 completed!\n');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
