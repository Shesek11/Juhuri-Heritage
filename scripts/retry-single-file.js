#!/usr/bin/env node

/**
 * 🔄 ניסיון חוזר לקובץ בודד
 */

const geminiHelper = require('./utils/gemini-helper');
const fs = require('fs');
const path = require('path');

async function retryFile(filePath) {
    console.log(`\n🔄 Retrying OCR for: ${path.basename(filePath)}\n`);

    try {
        const result = await geminiHelper.extractTextFromImage(filePath);

        console.log(`\n✅ SUCCESS! Found ${result.entries?.length || 0} entries\n`);

        if (result.entries && result.entries.length > 0) {
            // Save to intermediate
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const outputPath = path.join(__dirname, '../data/intermediate', `retry-${timestamp}.json`);

            const output = {
                timestamp: new Date().toISOString(),
                source_file: path.basename(filePath),
                entries: result.entries
            };

            fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
            console.log(`📝 Saved to: ${outputPath}\n`);

            // Print sample
            console.log('Sample entries:');
            result.entries.slice(0, 5).forEach((entry, i) => {
                console.log(`  ${i + 1}. ${entry.juhuri} - ${entry.hebrew || entry.russian}`);
            });
        }

    } catch (error) {
        console.error(`\n❌ Failed:`, error.message);

        if (error.message.includes('429') || error.message.includes('quota')) {
            console.log('\n⏳ Gemini API quota exceeded.');
            console.log('   The free tier allows 20 requests per day.');
            console.log('   Please try again in 24 hours.\n');
        }
    }
}

// Main
const filePath = process.argv[2];

if (!filePath) {
    console.error('❌ Usage: node retry-single-file.js <file-path>');
    process.exit(1);
}

if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
}

retryFile(filePath);
