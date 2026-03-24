/**
 * Run Migration 010: Cleanup feature flags
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./server/config/db');

async function runMigration() {
    console.log('\n🧹 Running Migration 010: Cleanup Feature Flags');
    console.log('=================================================\n');

    try {
        const sql = fs.readFileSync(path.resolve(__dirname, 'migrations/010_cleanup_feature_flags.sql'), 'utf8');
        const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));

        for (const stmt of statements) {
            console.log(`📝 ${stmt.trim().substring(0, 60)}...`);
            await db.query(stmt);
            console.log('   ✅ Done\n');
        }

        // Verify
        const [flags] = await db.query('SELECT feature_key, name, status FROM feature_flags ORDER BY name');
        console.log('📋 Current feature flags:');
        flags.forEach(f => console.log(`   ${f.status.padEnd(12)} ${f.feature_key.padEnd(20)} ${f.name}`));
        console.log(`\n✨ Migration 010 completed! ${flags.length} flags total.\n`);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
    }

    process.exit(0);
}

runMigration();
