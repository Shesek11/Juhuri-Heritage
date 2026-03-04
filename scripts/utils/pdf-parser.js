#!/usr/bin/env node

/**
 * 📄 PDF Parser for Dictionary Import
 *
 * תכונות:
 * - קריאת PDF עם טקסט
 * - OCR ל-PDFs סרוקים (via Gemini Vision)
 * - ניתוח טקסט לא מובנה
 */

const pdf = require('pdf-parse');
const fs = require('fs');
const gemini = require('./gemini-helper');

class PDFParser {
    /**
     * קריאת קובץ PDF והמרה ל-entries
     */
    async parseFile(filePath) {
        try {
            console.log(`📄 Reading PDF: ${filePath}`);

            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdf(dataBuffer);

            const text = pdfData.text;

            console.log(`   Pages: ${pdfData.numpages}`);
            console.log(`   Characters: ${text.length}`);

            if (text.length < 50) {
                console.log('   ⚠ Very little text - might be scanned PDF, trying OCR...');
                return await this._parseScannedPDF(filePath);
            }

            // Parse structured text
            console.log('   Analyzing text structure...');
            const result = await gemini.parseUnstructuredText(text, 'pdf');

            if (!result.entries || result.entries.length === 0) {
                console.log('   ⚠ No entries found, trying alternative parsing...');
                return await this._parseLineByLine(text, filePath);
            }

            console.log(`   ✓ Extracted ${result.entries.length} entries`);

            return {
                entries: result.entries,
                source_file: filePath,
                pages: pdfData.numpages
            };

        } catch (error) {
            console.error(`❌ PDF parse error:`, error.message);

            // If regular parsing fails, try OCR
            console.log('   Trying OCR as fallback...');
            return await this._parseScannedPDF(filePath);
        }
    }

    /**
     * PDF סרוק - צריך OCR
     */
    async _parseScannedPDF(filePath) {
        console.log('   🔍 Using OCR (Gemini Vision)...');

        // For scanned PDFs, we need to convert to images first
        // This is a simplified approach - treating the PDF file as an image
        try {
            const result = await gemini.extractTextFromImage(filePath);

            return {
                entries: result.entries || [],
                source_file: filePath,
                method: 'OCR'
            };

        } catch (error) {
            console.error(`❌ OCR failed:`, error.message);
            return {
                entries: [],
                error: 'OCR failed: ' + error.message,
                source_file: filePath
            };
        }
    }

    /**
     * ניתוח שורה-שורה פשוט
     * לטקסט פשוט כמו רשימות
     */
    async _parseLineByLine(text, filePath) {
        const lines = text.split('\n').filter(line => line.trim().length > 2);

        const entries = [];

        for (const line of lines) {
            const entry = this._parseSimpleLine(line);
            if (entry) {
                entries.push(entry);
            }
        }

        console.log(`   ✓ Parsed ${entries.length} entries line-by-line`);

        return {
            entries,
            source_file: filePath,
            method: 'line-by-line'
        };
    }

    /**
     * ניתוח שורה פשוטה
     * פורמטים נפוצים:
     * - word = translation
     * - word - translation
     * - word: translation
     */
    _parseSimpleLine(line) {
        line = line.trim();

        // Try different separators
        const separators = ['=', '-', ':', '–', '—'];

        for (const sep of separators) {
            if (line.includes(sep)) {
                const parts = line.split(sep).map(p => p.trim());

                if (parts.length >= 2) {
                    const left = parts[0];
                    const right = parts.slice(1).join(' - ');

                    // Detect which side is which language
                    const entry = this._identifyLanguages(left, right);

                    if (entry) {
                        return {
                            ...entry,
                            confidence: 0.75 // Lower confidence for simple parsing
                        };
                    }
                }
            }
        }

        return null;
    }

    /**
     * זיהוי שפות ב-2 צדדים
     */
    _identifyLanguages(left, right) {
        const entry = {
            juhuri: '',
            hebrew: '',
            russian: '',
            latin: ''
        };

        // Hebrew script (most likely Hebrew or Juhuri)
        if (/[\u0590-\u05FF]/.test(left)) {
            entry.juhuri = left;
        } else if (/[a-zA-Z]/.test(left)) {
            entry.latin = left;
        } else if (/[\u0400-\u04FF]/.test(left)) {
            entry.russian = left;
        }

        // Right side
        if (/[\u0590-\u05FF]/.test(right)) {
            entry.hebrew = right;
        } else if (/[a-zA-Z]/.test(right)) {
            if (!entry.latin) {
                entry.latin = right;
            }
        } else if (/[\u0400-\u04FF]/.test(right)) {
            entry.russian = right;
        }

        // If left was empty, try right as juhuri
        if (!entry.juhuri && entry.hebrew) {
            entry.juhuri = entry.hebrew;
            entry.hebrew = '';
        }

        // Must have at least juhuri
        if (!entry.juhuri) {
            return null;
        }

        return entry;
    }
}

module.exports = new PDFParser();
