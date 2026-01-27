#!/usr/bin/env node

/**
 * 🔄 Retry Missing Files Only
 *
 * סורק את data/raw ומוצא קבצים שלא עובדו עדיין
 * רץ OCR רק עליהם ומוסיף לקובץ intermediate קיים
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

const geminiHelper = require('./utils/gemini-helper');
const excelParser = require('./utils/excel-parser');
const pdfParser = require('./utils/pdf-parser');

const RAW_DIR = path.join(__dirname, '../data/raw');
const INTERMEDIATE_DIR = path.join(__dirname, '../data/intermediate');
const LOGS_DIR = path.join(__dirname, '../data/logs');

// Delay between API calls to avoid quota issues
const API_DELAY_MS = 3000;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function findMissingFiles() {
    // Find the latest intermediate file
    const intFiles = fs.readdirSync(INTERMEDIATE_DIR)
        .filter(f => f.startsWith('raw-') && f.endsWith('.json'))
        .sort()
        .reverse();

    if (intFiles.length === 0) {
        console.log('❌ No intermediate files found. Run import-dictionary-files.js first.');
        process.exit(1);
    }

    const latestIntFile = path.join(INTERMEDIATE_DIR, intFiles[0]);
    console.log(`📂 Using intermediate file: ${intFiles[0]}`);

    const intData = JSON.parse(fs.readFileSync(latestIntFile, 'utf8'));
    const processedFiles = new Set(intData.entries.map(e => e.source_file));

    // Get all raw files
    const rawFiles = fs.readdirSync(RAW_DIR).filter(f => !f.startsWith('.'));

    // Find missing
    const missing = rawFiles.filter(f => !processedFiles.has(f));

    return { missing, latestIntFile, intData };
}

async function processFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📄 Processing: ${fileName}`);
    console.log(`${'='.repeat(60)}\n`);

    let entries = [];

    try {
        // Excel files
        if (['.xlsx', '.xls', '.csv'].includes(ext)) {
            console.log(`📊 Type: Excel`);
            const result = await excelParser.parseFile(filePath);
            entries = result.entries || [];
        }
        // PDF files
        else if (ext === '.pdf') {
            console.log(`📄 Type: PDF`);
            const result = await pdfParser.parseFile(filePath);
            entries = result.entries || [];
        }
        // Image files (OCR)
        else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
            console.log(`🖼️  Type: Image (OCR)`);
            const result = await geminiHelper.extractTextFromImage(filePath);
            entries = result.entries || [];
        }
        else {
            console.log(`⚠️  Unsupported file type: ${ext}`);
            return { success: false, entries: [], error: 'Unsupported file type' };
        }

        // Add source info to entries
        entries = entries.map(entry => ({
            ...entry,
            source_file: fileName,
            source_type: ext,
            dialect: entry.dialect || 'General'
        }));

        console.log(`✅ Success: ${entries.length} entries extracted`);
        return { success: true, entries };

    } catch (error) {
        console.error(`❌ Failed: ${error.message}`);

        if (error.message.includes('429') || error.message.includes('quota')) {
            console.log('\n⏳ Gemini API quota exceeded.');
            console.log('   Waiting 60 seconds before continuing...\n');
            await sleep(60000);
            return { success: false, entries: [], error: 'Quota exceeded - will retry', retry: true };
        }

        return { success: false, entries: [], error: error.message };
    }
}

async function main() {
    console.log('\n📚 Dictionary Import - Retry Missing Files\n');
    console.log(`🤖 Model: ${process.env.GEMINI_MODEL || 'gemini-1.5-flash'}`);
    console.log(`⏱️  Delay between API calls: ${API_DELAY_MS}ms\n`);

    const { missing, latestIntFile, intData } = await findMissingFiles();

    if (missing.length === 0) {
        console.log('✅ All files have been processed! Nothing to retry.');
        return;
    }

    console.log(`\n📋 Found ${missing.length} missing file(s):\n`);
    missing.forEach((f, i) => {
        const stats = fs.statSync(path.join(RAW_DIR, f));
        console.log(`   ${i + 1}. ${f} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('Starting processing...');
    console.log('='.repeat(60));

    const results = {
        processed: 0,
        failed: 0,
        newEntries: [],
        errors: []
    };

    for (let i = 0; i < missing.length; i++) {
        const fileName = missing[i];
        const filePath = path.join(RAW_DIR, fileName);

        console.log(`\n[${i + 1}/${missing.length}]`);

        let result = await processFile(filePath);

        // Retry once if quota error
        if (result.retry) {
            console.log(`🔄 Retrying ${fileName}...`);
            result = await processFile(filePath);
        }

        if (result.success) {
            results.processed++;
            results.newEntries.push(...result.entries);
        } else {
            results.failed++;
            results.errors.push({ file: fileName, error: result.error });
        }

        // Delay between API calls
        if (i < missing.length - 1) {
            console.log(`\n⏳ Waiting ${API_DELAY_MS}ms before next file...`);
            await sleep(API_DELAY_MS);
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 RETRY SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ Files processed: ${results.processed}`);
    console.log(`❌ Files failed:    ${results.failed}`);
    console.log(`📚 New entries:     ${results.newEntries.length}`);

    if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
    }

    // Save results
    if (results.newEntries.length > 0) {
        // Option 1: Create new intermediate file with combined data
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const combinedData = {
            timestamp: new Date().toISOString(),
            files_processed: intData.files_processed + results.processed,
            total_entries: intData.total_entries + results.newEntries.length,
            entries: [...intData.entries, ...results.newEntries],
            retry_info: {
                original_file: path.basename(latestIntFile),
                files_retried: results.processed,
                new_entries_added: results.newEntries.length
            }
        };

        const outputPath = path.join(INTERMEDIATE_DIR, `raw-${timestamp}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(combinedData, null, 2));

        console.log(`\n💾 Combined results saved to:`);
        console.log(`   ${outputPath}`);
        console.log(`\n✨ Next step: Run process-dictionary-data.js on the new file`);
    }

    // Save log
    const logPath = path.join(LOGS_DIR, `retry-${new Date().toISOString().replace(/:/g, '-')}.log`);
    const logContent = `Dictionary Retry Log
====================
Timestamp: ${new Date().toISOString()}
Files retried: ${missing.length}
Files processed: ${results.processed}
Files failed: ${results.failed}
New entries: ${results.newEntries.length}

${results.errors.length > 0 ? 'Errors:\n' + results.errors.map(e => `- ${e.file}: ${e.error}`).join('\n') : 'No errors'}
`;
    fs.writeFileSync(logPath, logContent);
}

main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
