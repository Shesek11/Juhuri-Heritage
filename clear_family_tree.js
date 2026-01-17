
const db = require('./server/config/db');

async function clearFamilyData() {
    try {
        console.log('🗑️ Clearing family tree data...');

        // Delete in order of dependencies (child tables first)
        await db.query('DELETE FROM parent_child_relationships');
        await db.query('DELETE FROM partnerships');
        await db.query('DELETE FROM family_members');

        console.log('✅ Family tree data cleared successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing data:', error);
        process.exit(1);
    }
}

clearFamilyData();
