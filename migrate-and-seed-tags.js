#!/usr/bin/env node
// Script to migrate recipe_tags table and seed enhanced categorized tags

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./server/config/db');

async function migrateAndSeedTags() {
    console.log('🔄 מעדכן מבנה טבלה ומוסיף תגיות משופרות...');
    console.log('');

    try {
        const connection = await pool.getConnection();

        // Step 1: Apply migration
        console.log('📋 שלב 1: מוסיף עמודת category לטבלת recipe_tags...');
        const migrationPath = path.join(__dirname, 'migrations', '003_add_tag_categories.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        const migrationStatements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of migrationStatements) {
            try {
                await connection.query(statement);
            } catch (err) {
                // Ignore "duplicate column" errors
                if (!err.message.includes('Duplicate column') && !err.message.includes('duplicate key')) {
                    throw err;
                }
            }
        }
        console.log('✅ Migration הושלם בהצלחה!');
        console.log('');

        // Step 2: Seed enhanced tags
        console.log('📋 שלב 2: מוסיף תגיות משופרות...');
        const seedPath = path.join(__dirname, 'seed-enhanced-tags.sql');
        const seedSQL = fs.readFileSync(seedPath, 'utf8');

        const seedStatements = seedSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        let addedCount = 0;
        for (const statement of seedStatements) {
            try {
                await connection.query(statement);
                if (statement.toUpperCase().includes('INSERT')) {
                    addedCount++;
                }
            } catch (err) {
                // Ignore duplicate key errors (tags already exist)
                if (!err.message.includes('Duplicate entry') && !err.message.includes('duplicate key')) {
                    console.error('⚠️  שגיאה בהוספת תגית:', err.message);
                }
            }
        }

        console.log(`✅ ${addedCount} קבוצות תגיות נוספו בהצלחה!`);
        console.log('');

        // Step 3: Show summary
        console.log('📊 סיכום תגיות לפי קטגוריה:');
        const [categories] = await connection.query(`
            SELECT category, COUNT(*) as count
            FROM recipe_tags
            GROUP BY category
            ORDER BY category
        `);

        categories.forEach(cat => {
            console.log(`   • ${cat.category}: ${cat.count} תגיות`);
        });

        connection.release();

        console.log('');
        console.log('🎉 המערכת עודכנה בהצלחה!');
        console.log('');
        console.log('📝 מה הוספנו:');
        console.log('   • קטגוריות: סוג מאכל, ארוחה, מרכיבים, אירועים, רמת קושי, מקור, שיטת בישול, תזונה, עונה');
        console.log('   • חגים: כל החגים היהודיים + אירועי חיים');
        console.log('   • אפשרות לסינון מרובה (multi-select)');
        console.log('   • תגיות זמן אוטומטיות (מבוסס על prep_time/cook_time)');
        console.log('');

        process.exit(0);
    } catch (error) {
        console.error('');
        console.error('❌ שגיאה:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the migration and seeding
migrateAndSeedTags();
