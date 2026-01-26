#!/usr/bin/env node
// Script to seed demo recipes into the database using Node.js

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import the database pool
const pool = require('./server/config/db');

async function seedRecipes() {
    console.log('🌱 מכניס נתוני דמו למסד נתונים...');
    console.log(`📍 שרת: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`💾 מסד נתונים: ${process.env.DB_DATABASE || process.env.DB_NAME}`);
    console.log('');

    try {
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'seed-recipes.sql');

        if (!fs.existsSync(sqlFilePath)) {
            console.error('❌ שגיאה: קובץ seed-recipes.sql לא נמצא');
            process.exit(1);
        }

        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split by semicolons to get individual statements
        // Remove comments and empty statements
        const statements = sqlContent
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 מריץ ${statements.length} פקודות SQL...`);
        console.log('');

        // Execute each statement
        const connection = await pool.getConnection();

        try {
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement) {
                    await connection.query(statement);
                    process.stdout.write(`\r⏳ התקדמות: ${i + 1}/${statements.length}`);
                }
            }
            console.log('\n');
        } finally {
            connection.release();
        }

        console.log('✅ נתוני הדמו הוכנסו בהצלחה!');
        console.log('📊 נוספו:');
        console.log('   • 5 מתכונים מסורתיים');
        console.log('   • 8 תגיות');
        console.log('   • הערות ולייקים לדוגמה');
        console.log('');
        console.log('🎉 המערכת מוכנה לשימוש!');

        process.exit(0);
    } catch (error) {
        console.error('');
        console.error('❌ שגיאה בהכנסת הנתונים:');
        console.error(error.message);
        process.exit(1);
    }
}

// Run the seed function
seedRecipes();
