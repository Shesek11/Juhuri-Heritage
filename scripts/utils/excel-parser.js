#!/usr/bin/env node

/**
 * 📊 Excel Parser for Dictionary Import
 *
 * תכונות:
 * - קריאת קבצי Excel (xlsx, xls)
 * - זיהוי אוטומטי של עמודות
 * - טיפול במבנה גמיש
 */

const XLSX = require('xlsx');
const gemini = require('./gemini-helper');

class ExcelParser {
    /**
     * קריאת קובץ Excel והמרה ל-entries
     */
    async parseFile(filePath) {
        try {
            console.log(`📊 Reading Excel: ${filePath}`);

            const workbook = XLSX.readFile(filePath);
            const sheetName = workbook.SheetNames[0]; // First sheet
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (rawData.length === 0) {
                return { entries: [], error: 'Empty file' };
            }

            // Detect column structure
            const columns = await this._detectColumns(rawData);

            console.log(`   Detected columns:`, columns);

            // Parse rows
            const entries = [];
            for (let i = 1; i < rawData.length; i++) { // Skip header row
                const row = rawData[i];

                if (!row || row.length === 0 || !row.some(cell => cell)) {
                    continue; // Skip empty rows
                }

                const entry = this._parseRow(row, columns);

                if (entry) {
                    entries.push(entry);
                }
            }

            console.log(`   ✓ Extracted ${entries.length} entries`);

            return {
                entries,
                source_file: filePath,
                columns_detected: columns
            };

        } catch (error) {
            console.error(`❌ Excel parse error:`, error.message);
            return { entries: [], error: error.message };
        }
    }

    /**
     * זיהוי אוטומטי של עמודות
     */
    async _detectColumns(data) {
        const headerRow = data[0];

        const columns = {
            juhuri: -1,
            hebrew: -1,
            russian: -1,
            latin: -1,
            dialect: -1,
            definition: -1,
            notes: -1
        };

        // Try to detect by header names
        headerRow.forEach((header, index) => {
            if (!header) return;

            const h = header.toString().toLowerCase().trim();

            // Juhuri column
            if (h.includes('juhuri') || h.includes('ג\'והורי') || h.includes('judeo')) {
                columns.juhuri = index;
            }
            // Hebrew column
            else if (h.includes('hebrew') || h.includes('עברית') || h.includes('иврит')) {
                columns.hebrew = index;
            }
            // Russian column
            else if (h.includes('russian') || h.includes('רוסית') || h.includes('русский')) {
                columns.russian = index;
            }
            // Latin/transliteration
            else if (h.includes('latin') || h.includes('transliter') || h.includes('romaniz')) {
                columns.latin = index;
            }
            // Dialect
            else if (h.includes('dialect') || h.includes('ניב') || h.includes('диалект')) {
                columns.dialect = index;
            }
            // Definition
            else if (h.includes('definition') || h.includes('הגדרה') || h.includes('определение')) {
                columns.definition = index;
            }
            // Notes
            else if (h.includes('note') || h.includes('הערה') || h.includes('примечание')) {
                columns.notes = index;
            }
        });

        // If not found by header, try to detect by content
        if (Object.values(columns).every(v => v === -1)) {
            console.log('   ⚠ Headers not recognized, detecting by content...');
            return this._detectByContent(data);
        }

        return columns;
    }

    /**
     * זיהוי לפי תוכן (אם אין headers)
     */
    _detectByContent(data) {
        const sampleRow = data[1] || data[0]; // Second or first row

        const columns = {
            juhuri: -1,
            hebrew: -1,
            russian: -1,
            latin: -1,
            dialect: -1,
            definition: -1
        };

        sampleRow.forEach((cell, index) => {
            if (!cell) return;

            const text = cell.toString();

            // Hebrew script (א-ת)
            if (/[\u0590-\u05FF]/.test(text)) {
                if (columns.hebrew === -1) {
                    columns.hebrew = index;
                } else if (columns.juhuri === -1) {
                    columns.juhuri = index; // Juhuri can use Hebrew script
                }
            }

            // Cyrillic (А-Я)
            if (/[\u0400-\u04FF]/.test(text)) {
                columns.russian = index;
            }

            // Latin only (a-z)
            if (/^[a-zA-Z\s\-']+$/.test(text) && columns.latin === -1) {
                columns.latin = index;
            }
        });

        return columns;
    }

    /**
     * המרת שורה ל-entry
     */
    _parseRow(row, columns) {
        const entry = {
            juhuri: '',
            hebrew: '',
            russian: '',
            latin: '',
            dialect: null,
            definition: '',
            notes: '',
            confidence: 0.9
        };

        // Extract fields based on detected columns
        if (columns.juhuri >= 0 && row[columns.juhuri]) {
            entry.juhuri = row[columns.juhuri].toString().trim();
        }

        if (columns.hebrew >= 0 && row[columns.hebrew]) {
            entry.hebrew = row[columns.hebrew].toString().trim();
        }

        if (columns.russian >= 0 && row[columns.russian]) {
            entry.russian = row[columns.russian].toString().trim();
        }

        if (columns.latin >= 0 && row[columns.latin]) {
            entry.latin = row[columns.latin].toString().trim();
        }

        if (columns.dialect >= 0 && row[columns.dialect]) {
            entry.dialect = row[columns.dialect].toString().trim();
        }

        if (columns.definition >= 0 && row[columns.definition]) {
            entry.definition = row[columns.definition].toString().trim();
        }

        if (columns.notes >= 0 && row[columns.notes]) {
            entry.notes = row[columns.notes].toString().trim();
        }

        // Validation: must have at least juhuri OR hebrew
        if (!entry.juhuri && !entry.hebrew) {
            return null;
        }

        // Auto-detect juhuri if only hebrew is present but looks like Juhuri
        if (!entry.juhuri && entry.hebrew) {
            entry.juhuri = entry.hebrew;
            entry.hebrew = '';
        }

        return entry;
    }
}

module.exports = new ExcelParser();
