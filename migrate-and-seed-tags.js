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

        // First, check if category column exists
        const [columns] = await connection.query(
            "SHOW COLUMNS FROM recipe_tags LIKE 'category'"
        );

        if (columns.length === 0) {
            // Add the category column
            await connection.query(
                "ALTER TABLE recipe_tags ADD COLUMN category VARCHAR(50) DEFAULT 'general'"
            );
            console.log('   ✓ עמודת category נוספה');

            // Add index
            try {
                await connection.query(
                    'CREATE INDEX idx_recipe_tags_category ON recipe_tags(category)'
                );
                console.log('   ✓ אינדקס נוסף');
            } catch (err) {
                if (!err.message.includes('Duplicate key')) {
                    console.error('   ⚠️  שגיאה ביצירת אינדקס:', err.message);
                }
            }
        } else {
            console.log('   ✓ עמודת category כבר קיימת');
        }

        // Update existing tags with categories
        console.log('   📝 מעדכן תגיות קיימות...');
        await connection.query("UPDATE recipe_tags SET category = 'ingredient_type' WHERE name IN ('meat', 'dairy', 'pareve')");
        await connection.query("UPDATE recipe_tags SET category = 'occasion' WHERE name IN ('holiday', 'shabbat', 'passover', 'rosh-hashana')");
        await connection.query("UPDATE recipe_tags SET category = 'food_type' WHERE name IN ('appetizer', 'main-dish', 'dessert', 'soup', 'bread')");
        await connection.query("UPDATE recipe_tags SET category = 'origin' WHERE name = 'traditional'");
        await connection.query("UPDATE recipe_tags SET category = 'difficulty' WHERE name = 'quick'");

        console.log('✅ Migration הושלם בהצלחה!');
        console.log('');

        // Step 2: Seed enhanced tags
        console.log('📋 שלב 2: מוסיף תגיות משופרות...');
        const seedPath = path.join(__dirname, 'seed-enhanced-tags.sql');
        const seedSQL = fs.readFileSync(seedPath, 'utf8');

        // Split properly by detecting INSERT statements
        const insertRegex = /INSERT INTO recipe_tags[^;]+;/gi;
        const insertStatements = seedSQL.match(insertRegex) || [];

        let addedCount = 0;
        let updatedCount = 0;

        for (const statement of insertStatements) {
            try {
                const result = await connection.query(statement);
                // Check if rows were inserted or updated
                if (result[0].affectedRows > 0) {
                    if (result[0].insertId > 0) {
                        addedCount++;
                    } else {
                        updatedCount++;
                    }
                }
            } catch (err) {
                console.error('⚠️  שגיאה:', err.message);
            }
        }

        console.log(`✅ ${insertStatements.length} קבוצות תגיות עובדו (${addedCount} חדשות, ${updatedCount} עודכנו)`);
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
