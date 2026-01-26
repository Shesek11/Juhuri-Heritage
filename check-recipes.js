#!/usr/bin/env node
// Check how many recipes exist in the database

require('dotenv').config();
const pool = require('./server/config/db');

async function checkRecipes() {
    try {
        const connection = await pool.getConnection();

        // Count recipes
        const [countResult] = await connection.query('SELECT COUNT(*) as count FROM recipes');
        console.log(`📊 מספר מתכונים במסד נתונים: ${countResult[0].count}`);

        // Show recipes
        const [recipes] = await connection.query('SELECT id, title, created_at FROM recipes LIMIT 10');

        if (recipes.length > 0) {
            console.log('\n📝 מתכונים קיימים:');
            recipes.forEach(recipe => {
                console.log(`   ${recipe.id}. ${recipe.title}`);
            });
        } else {
            console.log('\n⚠️  אין מתכונים במסד הנתונים!');
        }

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error('❌ שגיאה:', error.message);
        process.exit(1);
    }
}

checkRecipes();
