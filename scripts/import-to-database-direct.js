#!/usr/bin/env node

/**
 * 📚 Dictionary Import - Phase 3: Direct Database Import
 *
 * תכונות:
 * - ייבוא ישיר ל-MySQL (ללא API)
 * - מהיר יותר לכמויות גדולות
 * - טיפול בכפילויות
 * - דוח מפורט
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Paths
const PROCESSED_DIR = path.join(__dirname, '../data/processed');
const LOGS_DIR = path.join(__dirname, '../data/logs');

class DirectDatabaseImporter {
    constructor() {
        this.stats = {
            total_entries: 0,
            imported: 0,
            skipped: 0,
            failed: 0,
            errors: []
        };

        this.connection = null;
    }

    /**
     * התחברות למסד נתונים
     */
    async connect() {
        console.log('🔌 Connecting to database...');

        this.connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE || process.env.DB_NAME || 'juhuri_dev',
            charset: 'utf8mb4'
        });

        console.log('✅ Connected to database\n');
    }

    /**
     * ייבוא קובץ JSON מעובד
     */
    async importFile(inputPath) {
        console.log('\n📚 Dictionary Import - Phase 3: Direct Database Import\n');
        console.log(`📂 Reading: ${inputPath}\n`);

        // Read processed JSON
        const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
        const entries = data.entries;

        this.stats.total_entries = entries.length;

        console.log(`Found ${entries.length} entries\n`);
        console.log('============================================================\n');

        // Connect to DB
        await this.connect();

        // Import entries
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];
            const progress = `[${i + 1}/${entries.length}]`;

            try {
                await this._importEntry(entry, progress);
            } catch (error) {
                console.error(`${progress} ❌ Failed to import "${entry.juhuri}":`, error.message);
                this.stats.failed++;
                this.stats.errors.push({
                    entry: entry.juhuri,
                    error: error.message
                });
            }
        }

        // Close connection
        await this.connection.end();

        // Summary
        this._printSummary();

        // Save log
        await this._saveLog();
    }

    /**
     * ייבוא entry בודד
     */
    async _importEntry(entry, progress) {
        // Check if entry already exists
        const [existing] = await this.connection.query(
            'SELECT id FROM dictionary_entries WHERE term = ?',
            [entry.juhuri]
        );

        if (existing.length > 0) {
            console.log(`${progress} ⚠️  Skipped (exists): ${entry.juhuri}`);
            this.stats.skipped++;
            return;
        }

        // Insert dictionary entry
        const [result] = await this.connection.query(
            `INSERT INTO dictionary_entries
            (term, detected_language, pronunciation_guide, source, source_name, status, notes, confidence, translation_source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                entry.juhuri,
                'Juhuri',
                entry.latin || null,
                entry.source || 'מאגר',
                entry.sourceName || entry.source_name || null,
                'active',  // Import directly as active
                entry.notes || '',
                entry.confidence || 0.9,
                entry.translation_source || 'Import'
            ]
        );

        const entryId = result.insertId;

        // Insert translation
        await this.connection.query(
            `INSERT INTO translations (entry_id, dialect, hebrew, latin, cyrillic, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())`,
            [
                entryId,
                entry.dialect || 'General',
                entry.hebrew || '',
                entry.latin || '',
                entry.russian || ''
            ]
        );

        // Insert definitions if present
        if (entry.definition) {
            await this.connection.query(
                `INSERT INTO definitions (entry_id, definition, created_at) VALUES (?, ?, NOW())`,
                [entryId, entry.definition]
            );
        }

        // Insert examples if present
        if (entry.examples && entry.examples.length > 0) {
            for (const example of entry.examples) {
                await this.connection.query(
                    `INSERT INTO examples (entry_id, example_text, created_at) VALUES (?, ?, NOW())`,
                    [entryId, example]
                );
            }
        }

        console.log(`${progress} ✅ Imported: ${entry.juhuri}`);
        this.stats.imported++;
    }

    /**
     * הצגת סיכום
     */
    _printSummary() {
        console.log('\n============================================================');
        console.log('✨ Import Summary\n');
        console.log(`Total entries:   ${this.stats.total_entries}`);
        console.log(`✅ Imported:      ${this.stats.imported}`);
        console.log(`⚠️  Skipped:       ${this.stats.skipped} (already exist)`);
        console.log(`❌ Failed:        ${this.stats.failed}`);
        console.log('============================================================\n');

        if (this.stats.errors.length > 0) {
            console.log('Errors:');
            this.stats.errors.slice(0, 10).forEach(err => {
                console.log(`  - ${err.entry}: ${err.error}`);
            });
            if (this.stats.errors.length > 10) {
                console.log(`  ... and ${this.stats.errors.length - 10} more\n`);
            }
        }
    }

    /**
     * שמירת לוג
     */
    async _saveLog() {
        const timestamp = new Date().toISOString();
        const logPath = path.join(LOGS_DIR, `import-direct-${timestamp.replace(/:/g, '-')}.log`);

        const logContent = `
Dictionary Direct Import Log
=============================
Timestamp: ${timestamp}
Total entries: ${this.stats.total_entries}
Imported: ${this.stats.imported}
Skipped: ${this.stats.skipped}
Failed: ${this.stats.failed}

${this.stats.errors.length > 0 ? 'Errors:\n' + this.stats.errors.map(e => `- ${e.entry}: ${e.error}`).join('\n') : 'No errors'}
`;

        fs.writeFileSync(logPath, logContent.trim());
        console.log(`📝 Log saved to: ${logPath}\n`);
    }
}

// Main execution
(async () => {
    try {
        const inputPath = process.argv[2];

        if (!inputPath) {
            console.error('❌ Usage: node import-to-database-direct.js <path-to-processed-json>\n');
            console.log('Example:');
            console.log('  node import-to-database-direct.js data/processed/dictionary-import-*.json\n');
            process.exit(1);
        }

        if (!fs.existsSync(inputPath)) {
            console.error(`❌ File not found: ${inputPath}\n`);
            process.exit(1);
        }

        const importer = new DirectDatabaseImporter();
        await importer.importFile(inputPath);

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
})();
