#!/usr/bin/env node

/**
 * 📚 Dictionary Import - Phase 2: Processing & Cleaning
 *
 * תכונות:
 * - זיהוי שפה אוטומטי
 * - תרגום רוסית→עברית (אם חסר)
 * - Transliteration ג'והורי→Latin
 * - המרה לקירילית
 * - דדופליקציה
 * - ולידציה
 * - פלט: data/processed/dictionary-import-{timestamp}.json
 */

const fs = require('fs');
const path = require('path');
const gemini = require('./utils/gemini-helper');

// Paths
const INTERMEDIATE_DIR = path.join(__dirname, '../data/intermediate');
const PROCESSED_DIR = path.join(__dirname, '../data/processed');
const LOGS_DIR = path.join(__dirname, '../data/logs');

// Valid dialects
const VALID_DIALECTS = [
    'Quba',
    'Derbent',
    'Madjalis',
    'Vartashen',
    'North Caucasus',
    'General'
];

class DictionaryDataProcessor {
    constructor() {
        this.stats = {
            total_input: 0,
            processed: 0,
            duplicates_removed: 0,
            validation_failed: 0,
            translations_added: 0,
            transliterations_added: 0,
            issues: []
        };

        this.processedEntries = [];
        this.seenTerms = new Map(); // For deduplication
    }

    /**
     * עיבוד קובץ JSON ביניים
     */
    async processFile(inputPath) {
        console.log('\n📚 Dictionary Import - Phase 2: Processing & Cleaning\n');
        console.log(`📂 Reading: ${inputPath}\n`);

        // Read input file
        if (!fs.existsSync(inputPath)) {
            console.error(`❌ File not found: ${inputPath}`);
            return;
        }

        const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
        const entries = data.entries || [];

        this.stats.total_input = entries.length;

        console.log(`Found ${entries.length} entries\n`);
        console.log(`${'='.repeat(60)}\n`);

        // Process each entry
        for (let i = 0; i < entries.length; i++) {
            const entry = entries[i];

            console.log(`[${i + 1}/${entries.length}] Processing: ${entry.juhuri || entry.hebrew || '(unknown)'}...`);

            const processed = await this._processEntry(entry);

            if (processed) {
                this.processedEntries.push(processed);
            }
        }

        // Summary
        this._printSummary();

        // Save results
        await this._saveResults();
    }

    /**
     * עיבוד entry בודד
     */
    async _processEntry(entry) {
        try {
            // 1. Validation - must have at least juhuri OR hebrew
            if (!entry.juhuri && !entry.hebrew) {
                this.stats.validation_failed++;
                this.stats.issues.push({
                    entry: JSON.stringify(entry),
                    reason: 'Missing both juhuri and hebrew fields'
                });
                console.log('   ❌ Validation failed: No juhuri or hebrew');
                return null;
            }

            // 2. Auto-detect juhuri if only hebrew present
            if (!entry.juhuri && entry.hebrew) {
                entry.juhuri = entry.hebrew;
                entry.hebrew = '';
                console.log('   ℹ️  Moved hebrew → juhuri (auto-detected)');
            }

            // 3. Check for duplicates
            const termKey = entry.juhuri.toLowerCase().trim();
            if (this.seenTerms.has(termKey)) {
                this.stats.duplicates_removed++;
                console.log('   ⚠️  Duplicate - skipping');
                return null;
            }
            this.seenTerms.set(termKey, true);

            // 4. Translate Russian → Hebrew if hebrew is missing
            if (entry.russian && !entry.hebrew) {
                console.log('   🔄 Translating Russian → Hebrew...');
                const translation = await gemini.translateRussianToHebrew(entry.russian);
                entry.hebrew = translation.hebrew;
                entry.confidence = Math.min(entry.confidence || 0.9, translation.confidence);
                entry.translation_source = 'AI';
                this.stats.translations_added++;
                console.log(`   ✓ Added Hebrew: ${entry.hebrew}`);
            }

            // 5. Transliterate Juhuri → Latin if missing
            if (entry.juhuri && !entry.latin) {
                // Only if juhuri is in Hebrew script
                if (/[\u0590-\u05FF]/.test(entry.juhuri)) {
                    console.log('   🔄 Transliterating Juhuri → Latin...');
                    const transliteration = await gemini.transliterateToLatin(entry.juhuri);
                    entry.latin = transliteration.latin;
                    this.stats.transliterations_added++;
                    console.log(`   ✓ Added Latin: ${entry.latin}`);
                }
            }

            // 6. Convert Russian to Cyrillic if needed
            if (entry.russian && !/[\u0400-\u04FF]/.test(entry.russian)) {
                console.log('   🔄 Converting Russian to Cyrillic...');
                entry.russian = await gemini.convertToCyrillic(entry.russian);
            }

            // 7. Normalize dialect
            if (entry.dialect) {
                const normalized = this._normalizeDialect(entry.dialect);
                if (normalized) {
                    entry.dialect = normalized;
                } else {
                    console.log(`   ⚠️  Unknown dialect "${entry.dialect}" → General`);
                    entry.dialect = 'General';
                }
            } else {
                entry.dialect = 'General';
            }

            // 8. Final validation
            if (!this._validateEntry(entry)) {
                this.stats.validation_failed++;
                console.log('   ❌ Validation failed');
                return null;
            }

            this.stats.processed++;
            console.log('   ✅ Processed successfully\n');

            return {
                juhuri: entry.juhuri.trim(),
                hebrew: entry.hebrew?.trim() || '',
                russian: entry.russian?.trim() || '',
                latin: entry.latin?.trim() || '',
                dialect: entry.dialect,
                definition: entry.definition?.trim() || '',
                examples: entry.examples || [],
                notes: entry.notes?.trim() || '',
                confidence: entry.confidence || 0.9,
                source_file: entry.source_file,
                source_type: entry.source_type,
                translation_source: entry.translation_source || 'Original'
            };

        } catch (error) {
            console.error(`   ❌ Error:`, error.message);
            this.stats.validation_failed++;
            this.stats.issues.push({
                entry: entry.juhuri || entry.hebrew || '(unknown)',
                reason: error.message
            });
            return null;
        }
    }

    /**
     * נרמול ניב
     */
    _normalizeDialect(dialect) {
        const d = dialect.toLowerCase().trim();

        const mapping = {
            'quba': 'Quba',
            'куба': 'Quba',
            'קובה': 'Quba',
            'derbent': 'Derbent',
            'дербент': 'Derbent',
            'דרבנט': 'Derbent',
            'madjalis': 'Madjalis',
            'מג\'לס': 'Madjalis',
            'vartashen': 'Vartashen',
            'ורתשן': 'Vartashen',
            'north caucasus': 'North Caucasus',
            'צפון קווקז': 'North Caucasus',
            'general': 'General',
            'כללי': 'General'
        };

        return mapping[d] || null;
    }

    /**
     * ולידציה סופית
     */
    _validateEntry(entry) {
        // Must have juhuri OR hebrew (at least one, with minimum 2 characters)
        const hasJuhuri = entry.juhuri && entry.juhuri.length >= 2;
        const hasHebrew = entry.hebrew && entry.hebrew.length >= 2;

        if (!hasJuhuri && !hasHebrew) {
            this.stats.issues.push({
                entry: JSON.stringify(entry),
                reason: 'Both juhuri and hebrew too short or missing'
            });
            return false;
        }

        // If only hebrew exists (no juhuri), copy hebrew to juhuri for DB compatibility
        if (!hasJuhuri && hasHebrew) {
            entry.juhuri = entry.hebrew;
        }

        // Note: We no longer require translations - entries with only juhuri or only hebrew are allowed

        // Dialect must be valid
        if (!VALID_DIALECTS.includes(entry.dialect)) {
            this.stats.issues.push({
                entry: entry.juhuri || entry.hebrew,
                reason: `Invalid dialect: ${entry.dialect}`
            });
            return false;
        }

        return true;
    }

    /**
     * הצגת סיכום
     */
    _printSummary() {
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 PROCESSING SUMMARY');
        console.log(`${'='.repeat(60)}\n`);

        console.log(`📥 Input entries:        ${this.stats.total_input}`);
        console.log(`✅ Successfully processed: ${this.stats.processed}`);
        console.log(`🗑️  Duplicates removed:  ${this.stats.duplicates_removed}`);
        console.log(`❌ Validation failed:    ${this.stats.validation_failed}\n`);

        console.log('AI Enhancements:');
        console.log(`   🌐 Translations added:      ${this.stats.translations_added}`);
        console.log(`   🔤 Transliterations added:  ${this.stats.transliterations_added}\n`);

        if (this.stats.issues.length > 0 && this.stats.issues.length <= 10) {
            console.log('⚠️  Issues (sample):');
            this.stats.issues.slice(0, 10).forEach(issue => {
                console.log(`   - ${issue.entry}: ${issue.reason}`);
            });
            console.log('');
        } else if (this.stats.issues.length > 10) {
            console.log(`⚠️  ${this.stats.issues.length} issues found (see log file for details)\n`);
        }
    }

    /**
     * שמירת תוצאות
     */
    async _saveResults() {
        // Create processed directory if needed
        if (!fs.existsSync(PROCESSED_DIR)) {
            fs.mkdirSync(PROCESSED_DIR, { recursive: true });
        }

        // Generate timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = path.join(PROCESSED_DIR, `dictionary-import-${timestamp}.json`);

        // Final output
        const output = {
            timestamp: new Date().toISOString(),
            ready_for_import: this.stats.processed,
            duplicates_removed: this.stats.duplicates_removed,
            validation_failed: this.stats.validation_failed,
            ai_enhancements: {
                translations_added: this.stats.translations_added,
                transliterations_added: this.stats.transliterations_added
            },
            entries: this.processedEntries,
            issues: this.stats.issues
        };

        // Save to file
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        // Save log
        const logPath = path.join(LOGS_DIR, `process-${timestamp}.log`);
        const logContent = `
Dictionary Processing Log
=========================
Timestamp: ${output.timestamp}
Input entries: ${this.stats.total_input}
Processed: ${this.stats.processed}
Duplicates removed: ${this.stats.duplicates_removed}
Validation failed: ${this.stats.validation_failed}

AI Enhancements:
- Translations added: ${this.stats.translations_added}
- Transliterations added: ${this.stats.transliterations_added}

${this.stats.issues.length > 0 ? '\nIssues:\n' + this.stats.issues.map(i => `- ${i.entry}: ${i.reason}`).join('\n') : ''}
`;
        fs.writeFileSync(logPath, logContent);

        console.log(`\n💾 Results saved to:`);
        console.log(`   ${outputPath}`);
        console.log(`\n📝 Log saved to:`);
        console.log(`   ${logPath}`);

        console.log(`\n✨ Next step: Run import-to-database.js to import to DB\n`);
    }
}

// Run if called directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error('\n❌ Usage: node process-dictionary-data.js <input-file.json>\n');
        console.log('Example:');
        console.log('  node process-dictionary-data.js data/intermediate/raw-2024-01-26.json\n');
        process.exit(1);
    }

    const inputPath = args[0];
    const processor = new DictionaryDataProcessor();
    processor.processFile(inputPath).catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DictionaryDataProcessor;
