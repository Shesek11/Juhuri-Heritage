#!/usr/bin/env node

/**
 * 📚 Dictionary Import - Phase 1: File Reading
 *
 * תכונות:
 * - סריקת תיקיית data/raw/
 * - ניתוב אוטומטי לפרסרים המתאימים
 * - איסוף כל ה-entries למבנה אחיד
 * - פלט: data/intermediate/raw-{timestamp}.json
 */

const fs = require('fs');
const path = require('path');
const excelParser = require('./utils/excel-parser');
const pdfParser = require('./utils/pdf-parser');
const geminiHelper = require('./utils/gemini-helper');

// Paths
const RAW_DIR = path.join(__dirname, '../data/raw');
const INTERMEDIATE_DIR = path.join(__dirname, '../data/intermediate');
const LOGS_DIR = path.join(__dirname, '../data/logs');

class DictionaryFileImporter {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            files_processed: 0,
            files_failed: 0,
            total_entries: 0,
            by_source: {
                excel: 0,
                pdf: 0,
                images: 0
            },
            files: [],
            errors: []
        };
    }

    /**
     * סריקת תיקייה וקריאת כל הקבצים
     */
    async processAllFiles() {
        console.log('\n📚 Dictionary Import - Phase 1: Reading Files\n');
        console.log(`📂 Scanning: ${RAW_DIR}\n`);

        // Check if raw directory exists
        if (!fs.existsSync(RAW_DIR)) {
            console.error(`❌ Directory not found: ${RAW_DIR}`);
            console.log(`\n💡 Please create it and add your files:\n   mkdir -p ${RAW_DIR}\n`);
            return;
        }

        // Get all files
        const files = fs.readdirSync(RAW_DIR);

        if (files.length === 0) {
            console.log('⚠️  No files found in data/raw/');
            console.log('\n💡 Add your dictionary files to data/raw/ and run again.\n');
            return;
        }

        console.log(`Found ${files.length} file(s):\n`);

        // Process each file
        for (const file of files) {
            const filePath = path.join(RAW_DIR, file);
            const stat = fs.statSync(filePath);

            // Skip directories
            if (stat.isDirectory()) {
                continue;
            }

            await this._processFile(filePath, file);
        }

        // Summary
        this._printSummary();

        // Save results
        await this._saveResults();
    }

    /**
     * עיבוד קובץ בודד - משופר עם Fallback חכם
     */
    async _processFile(filePath, fileName) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`📄 Processing: ${fileName}`);
        console.log(`${'='.repeat(60)}\n`);

        const ext = path.extname(fileName).toLowerCase();

        try {
            let result = { entries: [], error: null };

            // Route to appropriate parser
            if (['.xlsx', '.xls', '.csv'].includes(ext)) {
                result = await this._processExcel(filePath);
                this.results.by_source.excel += result.entries?.length || 0;
            }
            else if (ext === '.pdf') {
                // Smart PDF: try text first, fallback to OCR if empty
                result = await this._processSmartPDF(filePath);
                this.results.by_source.pdf += result.entries?.length || 0;
            }
            else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                result = await this._processImage(filePath);
                this.results.by_source.images += result.entries?.length || 0;
            }
            else {
                console.log(`⚠️  Unsupported file type: ${ext}`);
                this.results.errors.push({
                    file: fileName,
                    error: `Unsupported file type: ${ext}`
                });
                this.results.files_failed++;
                return;
            }

            // Record results
            if (result.error) {
                console.error(`❌ Failed: ${result.error}`);
                this.results.errors.push({
                    file: fileName,
                    error: result.error
                });
                this.results.files_failed++;
            } else {
                const entriesCount = result.entries?.length || 0;

                // Warning if file processed but returned 0 entries
                if (entriesCount === 0) {
                    console.warn(`⚠️  Warning: File processed but 0 entries found`);
                }

                console.log(`\n✅ Success: ${entriesCount} entries extracted`);

                this.results.files.push({
                    file: fileName,
                    type: ext,
                    entries_count: entriesCount,
                    result: result
                });

                this.results.files_processed++;
                this.results.total_entries += entriesCount;
            }

        } catch (error) {
            console.error(`❌ Unexpected error:`, error.message);
            this.results.errors.push({
                file: fileName,
                error: error.message
            });
            this.results.files_failed++;
        }
    }

    /**
     * PDF חכם - מנסה טקסט, אם נכשל עובר ל-OCR
     */
    async _processSmartPDF(filePath) {
        console.log('📄 Type: PDF (Attempting text parse...)');

        try {
            // Try 1: Regular PDF text extraction (fast & cheap)
            const textResult = await pdfParser.parseFile(filePath);

            // If succeeded and has results - great!
            if (textResult && textResult.entries && textResult.entries.length > 0) {
                console.log(`   ✓ Text extraction successful`);
                return textResult;
            }

            console.log('   🔸 Standard parse yielded 0 entries');
            console.log('   🔸 Likely a scanned PDF or complex layout');
            console.log('   🔄 Switching to OCR/Gemini mode...');

            // Try 2: Use Gemini OCR (like for images)
            // Gemini API supports PDF files directly
            const ocrResult = await geminiHelper.extractTextFromImage(filePath);

            if (ocrResult && ocrResult.entries && ocrResult.entries.length > 0) {
                console.log(`   ✓ OCR extraction successful`);
                return ocrResult;
            }

            console.log(`   ⚠️  OCR also returned 0 entries`);
            return { entries: [], error: null };

        } catch (error) {
            console.error(`   ❌ Error in PDF processing: ${error.message}`);
            return { entries: [], error: error.message };
        }
    }

    /**
     * קריאת Excel
     */
    async _processExcel(filePath) {
        console.log('📊 Type: Excel');
        return await excelParser.parseFile(filePath);
    }

    /**
     * קריאת PDF
     */
    async _processPDF(filePath) {
        console.log('📄 Type: PDF');
        return await pdfParser.parseFile(filePath);
    }

    /**
     * קריאת תמונה (OCR)
     */
    async _processImage(filePath) {
        console.log('🖼️  Type: Image (OCR)');
        return await geminiHelper.extractTextFromImage(filePath);
    }

    /**
     * הצגת סיכום
     */
    _printSummary() {
        console.log(`\n${'='.repeat(60)}`);
        console.log('📊 IMPORT SUMMARY');
        console.log(`${'='.repeat(60)}\n`);

        console.log(`✅ Files processed: ${this.results.files_processed}`);
        console.log(`❌ Files failed:    ${this.results.files_failed}`);
        console.log(`📚 Total entries:   ${this.results.total_entries}\n`);

        console.log('By source:');
        console.log(`   📊 Excel:  ${this.results.by_source.excel}`);
        console.log(`   📄 PDF:    ${this.results.by_source.pdf}`);
        console.log(`   🖼️  Images: ${this.results.by_source.images}\n`);

        if (this.results.errors.length > 0) {
            console.log('⚠️  Errors:');
            this.results.errors.forEach(err => {
                console.log(`   - ${err.file}: ${err.error}`);
            });
            console.log('');
        }
    }

    /**
     * שמירת תוצאות ל-JSON
     */
    async _saveResults() {
        // Create intermediate directory if needed
        if (!fs.existsSync(INTERMEDIATE_DIR)) {
            fs.mkdirSync(INTERMEDIATE_DIR, { recursive: true });
        }

        // Create logs directory if needed
        if (!fs.existsSync(LOGS_DIR)) {
            fs.mkdirSync(LOGS_DIR, { recursive: true });
        }

        // Generate timestamp for filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const outputPath = path.join(INTERMEDIATE_DIR, `raw-${timestamp}.json`);

        // Aggregate all entries from all files
        const allEntries = [];
        this.results.files.forEach(file => {
            if (file.result.entries) {
                file.result.entries.forEach(entry => {
                    allEntries.push({
                        ...entry,
                        source_file: file.file,
                        source_type: file.type
                    });
                });
            }
        });

        // Final output structure
        const output = {
            timestamp: this.results.timestamp,
            files_processed: this.results.files_processed,
            total_entries: allEntries.length,
            by_source: this.results.by_source,
            entries: allEntries,
            metadata: {
                files: this.results.files.map(f => ({
                    file: f.file,
                    type: f.type,
                    entries: f.entries_count
                })),
                errors: this.results.errors
            }
        };

        // Save to file
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

        // Save log
        const logPath = path.join(LOGS_DIR, `import-${timestamp}.log`);
        const logContent = `
Dictionary Import Log
=====================
Timestamp: ${this.results.timestamp}
Files processed: ${this.results.files_processed}
Files failed: ${this.results.files_failed}
Total entries: ${this.results.total_entries}

By source:
- Excel: ${this.results.by_source.excel}
- PDF: ${this.results.by_source.pdf}
- Images: ${this.results.by_source.images}

${this.results.errors.length > 0 ? '\nErrors:\n' + this.results.errors.map(e => `- ${e.file}: ${e.error}`).join('\n') : ''}
`;
        fs.writeFileSync(logPath, logContent);

        console.log(`\n💾 Results saved to:`);
        console.log(`   ${outputPath}`);
        console.log(`\n📝 Log saved to:`);
        console.log(`   ${logPath}`);

        console.log(`\n✨ Next step: Run process-dictionary-data.js to clean and validate\n`);
    }
}

// Run if called directly
if (require.main === module) {
    const importer = new DictionaryFileImporter();
    importer.processAllFiles().catch(error => {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = DictionaryFileImporter;
