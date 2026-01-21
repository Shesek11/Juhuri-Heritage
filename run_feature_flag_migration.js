/**
 * Run Migration 009: Add coming_soon status to feature flags
 */
require('dotenv').config();
const db = require('./server/config/db');

async function runMigration() {
    console.log('\n⏰ Running Migration 009: Feature Flag Coming Soon Status');
    console.log('==========================================================\n');

    try {
        console.log('📝 Modifying feature_flags status ENUM...');
        await db.query(`
            ALTER TABLE feature_flags 
            MODIFY COLUMN status ENUM('active', 'admin_only', 'coming_soon', 'disabled') DEFAULT 'disabled'
        `);
        console.log('   ✅ ENUM updated successfully!\n');
    } catch (err) {
        if (err.code === 'ER_DUPLICATED_VALUE_IN_TYPE') {
            console.log('   ⏭️  ENUM already includes coming_soon, skipping\n');
        } else {
            console.error(`   ❌ Error: ${err.message}\n`);
        }
    }

    console.log('✨ Migration 009 completed!\n');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
