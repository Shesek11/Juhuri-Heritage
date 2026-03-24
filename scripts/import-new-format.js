#!/usr/bin/env node

/**
 * Import dictionary entries from new-format JSON files to database.
 * Handles the current field structure: term, latin, cyrillic, hebrew, russian, etc.
 */

const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node import-new-format.js <json-file>');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const entries = data.entries;
  console.log('File: ' + inputPath);
  console.log('Source: ' + data.sourceName);
  console.log('Entries: ' + entries.length + '\n');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
    charset: 'utf8mb4',
  });

  let imported = 0, skipped = 0, failed = 0;

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];

    // Term should be Hebrew-script Juhuri or Cyrillic. Latin stays in translations only.
    // If no term/cyrillic, still import — term will be empty, showing "missing" placeholder.
    const term = e.term || e.cyrillic || '';
    // Must have at least term, latin, or cyrillic to be importable
    if (!term && !e.latin) { skipped++; continue; }

    try {
      // Check for exact duplicate (same term AND same russian)
      const russian = e.russian || '';
      const [existing] = await conn.query(
        'SELECT id FROM dictionary_entries WHERE term = ? AND (russian = ? OR (russian IS NULL AND ? = \'\'))',
        [term, russian, russian]
      );
      if (existing.length > 0) { skipped++; continue; }

      // Insert dictionary entry
      const [result] = await conn.query(
        `INSERT INTO dictionary_entries
         (term, detected_language, pronunciation_guide, part_of_speech, russian, source, source_name, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
        [
          term,
          'Juhuri',
          e.pronunciationGuide || null,
          e.partOfSpeech || null,
          e.russian || null,
          e.source || data.source || 'מאגר',
          e.sourceName || data.sourceName || null,
        ]
      );

      const entryId = result.insertId;

      // Insert translation if we have hebrew or latin or cyrillic
      const hebrew = e.hebrew || '';
      const latin = e.latin || '';
      const cyrillic = e.cyrillic || '';

      if (hebrew || latin || cyrillic) {
        // Get dialect_id (NULL for unknown)
        let dialectId = null;
        if (e.dialect) {
          const [dialects] = await conn.query(
            'SELECT id FROM dialects WHERE name = ?', [e.dialect]
          );
          if (dialects.length > 0) dialectId = dialects[0].id;
        }

        await conn.query(
          `INSERT INTO translations (entry_id, dialect_id, hebrew, latin, cyrillic)
           VALUES (?, ?, ?, ?, ?)`,
          [entryId, dialectId, hebrew, latin, cyrillic]
        );
      }

      // Insert definition if present
      if (e.definition) {
        await conn.query(
          'INSERT INTO definitions (entry_id, definition) VALUES (?, ?)',
          [entryId, e.definition]
        );
      }

      imported++;
      if (imported % 100 === 0) {
        process.stdout.write('\r  Imported: ' + imported + ' / Skipped: ' + skipped);
      }
    } catch (err) {
      failed++;
      if (failed <= 5) console.error('\n  Error on "' + term + '": ' + err.message);
    }
  }

  await conn.end();

  console.log('\n\nDone!');
  console.log('  Imported: ' + imported);
  console.log('  Skipped: ' + skipped);
  console.log('  Failed: ' + failed);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
