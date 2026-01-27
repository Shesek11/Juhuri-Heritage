#!/usr/bin/env node

/**
 * 📚 Dictionary Import - Phase 3: Database Import
 *
 * תכונות:
 * - ייבוא ל-DB דרך API
 * - Batch processing (100 entries per request)
 * - טיפול בשגיאות
 * - דוח מפורט
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// Paths
const PROCESSED_DIR = path.join(__dirname, '../data/processed');
const LOGS_DIR = path.join(__dirname, '../data/logs');

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const BATCH_SIZE = 100;

class DictionaryDatabaseImporter {
    constructor() {
        this.stats = {
            total_entries: 0,
            imported: 0,
            failed: 0,
            batches_sent: 0,
            errors: []
        };

        this.authToken = null;
    }

    /**
     * אימות משתמש
     */
    async authenticate() {
        const email = process.env.ADMIN_EMAIL;
        const password = process.env.ADMIN_PASSWORD;

        if (!email || !password) {
            console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env file\n');
            console.log('Please add to .env:');
            console.log('  ADMIN_EMAIL=your-admin@email.com');
            console.log('  ADMIN_PASSWORD=your-password\n');
            throw new Error('Missing credentials');
        }

        try {
            console.log(`🔐 Authenticating as ${email}...`);

            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
                email,
                password
            });

            this.authToken = response.data.token;
            console.log('✅ Authentication successful\n');

        } catch (error) {
            console.error('❌ Authentication failed:', error.response?.data?.error || error.message);
            throw error;
        }
    }

    /**
     * ייבוא קובץ JSON מעובד
     */
    async importFile(inputPath) {
        console.log('\n📚 Dictionary Import - Phase 3: Database Import\n');
        console.log(`📂 Reading: ${inputPath}\n`);

        // Read input file
        if (!fs.existsSync(inputPath)) {
            console.error(`❌ File not found: ${inputPath}`);
            return;
        }

        const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
        const entries = data.entries || [];

        this.stats.total_entries = entries.length;

        console.log(`Found ${entries.length} entries`);
        console.log(`Batch size: ${BATCH_SIZE}\n`);
        console.log(`${'='.repeat(60)}\n`);

        // Authenticate first
        await this.authenticate();

        // Convert to API format
        const apiEntries = entries.map(e => this._convertToAPIFormat(e));

        // Send in batches
        const batches = this._createBatches(apiEntries, BATCH_SIZE);

        console.log(`Sending ${batches.length} batches...\n`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`[${i + 1}/${batches.length}] Sending batch of ${batch.length} entries...`);

            try {
                const result = await this._sendBatch(batch);
                this.stats.imported += result.addedCount || 0;
                this.stats.batches_sent++;
                console.log(`   ✅ Imported ${result.addedCount} entries\n`);

            } catch (error) {
                console.error(`   ❌ Batch failed:`, error.response?.data?.error || error.message);
                this.stats.failed += batch.length;
                this.stats.errors.push({
                    batch: i + 1,
                    error: error.response?.data?.error || error.message
                });
                console.log('');
            }

            // Small delay between batches to avoid overwhelming the server
            await this._sleep(500);
        }

        // Summary
        this._printSummary();

        // Save log
        await this._saveLog();
    }

    /**
     * המרה לפורמט API
     *
     * מיפוי מקורות:
     * - AI = תרגום AI (מרוסית לעברית)
     * - Manual = ספרות (מהסריקות/מסמכים)
     * - User = קהילה (הצעות משתמשים)
     */
    _convertToAPIFormat(entry) {
        // Determine source based on translation_source
        // AI = AI translated the Hebrew from Russian
        // Manual = Hebrew came from original scanned documents (ספרות)
        // User = community submissions (קהילה)
        let source = 'Manual'; // Default: from literature/scans

        if (entry.translation_source === 'AI') {
            source = 'AI';
        } else if (entry.translation_source === 'User' || entry.translation_source === 'Community') {
            source = 'User';
        }
        // 'Original' or anything else = 'Manual' (ספרות)

        return {
            term: entry.juhuri,
            detectedLanguage: 'Juhuri',
            pronunciationGuide: entry.latin || null,
            source: source,
            sourceFile: entry.source_file, // Keep original filename for reference
            translations: [
                {
                    dialect: entry.dialect || 'General',
                    hebrew: entry.hebrew || '',
                    latin: entry.latin || '',
                    cyrillic: entry.russian || ''
                }
            ],
            definitions: entry.definition ? [entry.definition] : [],
            examples: entry.examples || [],
            notes: entry.notes || '',
            confidence: entry.confidence
        };
    }

    /**
     * יצירת batches
     */
    _createBatches(array, size) {
        const batches = [];
        for (let i = 0; i < array.length; i += size) {
            batches.push(array.slice(i, i + size));
        }
        return batches;
    }

    /**
     * שליחת batch לAPI
     */
    async _sendBatch(batch) {
        const response = await axios.post(
            `${API_BASE_URL}/api/dictionary/entries/batch`,
            { entries: batch },
            {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data;
    }

    /**
     * Sleep helper
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * הצגת סיכום
     */
    _printSummary() {
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 IMPORT SUMMARY');
        console.log(`${'='.repeat(60)}\n`);

        console.log(`📥 Total entries:     ${this.stats.total_entries}`);
        console.log(`✅ Successfully imported: ${this.stats.imported}`);
        console.log(`❌ Failed:            ${this.stats.failed}`);
        console.log(`📦 Batches sent:      ${this.stats.batches_sent}\n`);

        if (this.stats.errors.length > 0) {
            console.log('⚠️  Errors:');
            this.stats.errors.forEach(err => {
                console.log(`   - Batch ${err.batch}: ${err.error}`);
            });
            console.log('');
        }

        console.log('✨ Import complete! Entries are set to "active" status.\n');
        console.log('Next steps:');
        console.log('  1. Review imported entries in the admin dashboard');
        console.log('  2. Verify translations and make corrections if needed');
        console.log('  3. Entries are immediately visible in the dictionary\n');
    }

    /**
     * שמירת לוג
     */
    async _saveLog() {
        // Create logs directory if needed
        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const logPath = path.join(LOGS_DIR, `import-db-${timestamp}.log`);

        const logContent = `
Dictionary Database Import Log
==============================
Timestamp: ${new Date().toISOString()}
Total entries: ${this.stats.total_entries}
Imported: ${this.stats.imported}
Failed: ${this.stats.failed}
Batches sent: ${this.stats.batches_sent}

${this.stats.errors.length > 0 ? '\nErrors:\n' + this.stats.errors.map(e => `- Batch ${e.batch}: ${e.error}`).join('\n') : 'No errors'}
`;

        fs.writeFileSync(logPath, logContent);

        console.log(`📝 Log saved to:`);
        console.log(`   ${logPath}\n`);
    }
}

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('\n❌ Usage: node import-to-database.js <processed-file.json>\n');
        console.log('Example:');
        console.log('  node import-to-database.js data/processed/dictionary-import-2024-01-26.json\n');
        console.log('Required .env variables:');
        console.log('  ADMIN_EMAIL=your-admin@email.com');
        console.log('  ADMIN_PASSWORD=your-password');
        console.log('  API_BASE_URL=http://localhost:5000 (optional, defaults to localhost)\n');
        process.exit(1);
    }

    const inputPath = args[0];
    const importer = new DictionaryDatabaseImporter();

    importer.importFile(inputPath).catch(error => {
        console.error('\n❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = DictionaryDatabaseImporter;
