#!/usr/bin/env node

/**
 * Import 27K deduplicated dictionary entries to the database.
 *
 * Steps:
 * 1. Delete all old dictionary data (entries, translations, definitions, examples)
 * 2. Import from dictionary-unified-deduped.json
 * 3. Insert field_sources records for imported fields
 *
 * Usage: node scripts/import-27k-to-database.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const INPUT = path.resolve(__dirname, '../data/processed/dictionary-unified-deduped.json');
const BATCH_SIZE = 500;

// Detect language from term characters
function detectLanguage(term) {
  if (!term) return 'Hebrew';
  const hebrewChars = (term.match(/[\u0590-\u05FF]/g) || []).length;
  const latinChars = (term.match(/[a-zA-Z]/g) || []).length;
  const cyrillicChars = (term.match(/[\u0400-\u04FF]/g) || []).length;

  if (hebrewChars > latinChars && hebrewChars > cyrillicChars) return 'Juhuri'; // Juhuri in Hebrew script
  if (latinChars > hebrewChars) return 'English';
  return 'Juhuri';
}

async function run() {
  console.log('📖 Reading input file...');
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const entries = data.entries;
  console.log(`📊 Total entries to import: ${entries.length}`);

  // Connect to database
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });

  const conn = await pool.getConnection();

  try {
    // =====================
    // STEP 1: Delete old data
    // =====================
    console.log('\n🗑️  Deleting old dictionary data...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('DELETE FROM field_sources');
    await conn.query('DELETE FROM examples');
    await conn.query('DELETE FROM definitions');
    await conn.query('DELETE FROM translations');
    await conn.query('DELETE FROM dictionary_entries');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Old data deleted');

    // Reset auto-increment
    await conn.query('ALTER TABLE dictionary_entries AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE translations AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE definitions AUTO_INCREMENT = 1');

    // =====================
    // STEP 2: Import in batches
    // =====================
    console.log(`\n📥 Importing ${entries.length} entries in batches of ${BATCH_SIZE}...`);

    let imported = 0;
    let skipped = 0;
    let fieldSourceRecords = [];

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);

      await conn.beginTransaction();

      try {
        for (const entry of batch) {
          const term = (entry.term || '').trim();
          if (!term) {
            skipped++;
            continue;
          }

          const detectedLanguage = detectLanguage(term);
          const pronunciationGuide = entry.pronunciationGuide || null;
          const partOfSpeech = entry.partOfSpeech || null;
          const russian = entry.russian || null;
          const definition = entry.definition || null;
          const hebrew = entry.hebrew || null;
          const latin = entry.latin || null;
          const sourceInfo = entry.sources ? JSON.stringify(entry.sources) : null;

          // Insert dictionary_entry
          const [result] = await conn.query(
            `INSERT INTO dictionary_entries
             (term, detected_language, pronunciation_guide, part_of_speech, russian, source, status, source_info)
             VALUES (?, ?, ?, ?, ?, 'Manual', 'active', ?)`,
            [term, detectedLanguage, pronunciationGuide, partOfSpeech, russian, sourceInfo]
          );

          const entryId = result.insertId;

          // Insert translation (dialect_id = NULL for unknown)
          await conn.query(
            `INSERT INTO translations (entry_id, dialect_id, hebrew, latin, cyrillic)
             VALUES (?, NULL, ?, ?, '')`,
            [entryId, hebrew, latin]
          );

          // Insert definition
          if (definition) {
            await conn.query(
              `INSERT INTO definitions (entry_id, definition) VALUES (?, ?)`,
              [entryId, definition]
            );
          }

          // Track field sources for this entry
          const fields = [];
          if (term) fields.push('term');
          if (hebrew) fields.push('hebrew');
          if (russian) fields.push('russian');
          if (latin) fields.push('latin');
          if (definition) fields.push('definition');
          if (pronunciationGuide) fields.push('pronunciationGuide');
          if (partOfSpeech) fields.push('partOfSpeech');

          for (const field of fields) {
            fieldSourceRecords.push([entryId, field, 'import']);
          }

          imported++;
        }

        await conn.commit();

        // Batch insert field_sources every 2000 records
        if (fieldSourceRecords.length >= 2000) {
          await insertFieldSources(conn, fieldSourceRecords);
          fieldSourceRecords = [];
        }

        const pct = ((i + batch.length) / entries.length * 100).toFixed(1);
        process.stdout.write(`\r   ${i + batch.length}/${entries.length} (${pct}%) - imported: ${imported}, skipped: ${skipped}`);

      } catch (err) {
        await conn.rollback();
        console.error(`\n❌ Error in batch at index ${i}:`, err.message);
        throw err;
      }
    }

    // Insert remaining field_sources
    if (fieldSourceRecords.length > 0) {
      await insertFieldSources(conn, fieldSourceRecords);
    }

    console.log(`\n\n✅ Import complete!`);
    console.log(`   Imported: ${imported}`);
    console.log(`   Skipped:  ${skipped}`);

    // =====================
    // STEP 3: Verify
    // =====================
    const [[{ entryCount }]] = await conn.query('SELECT COUNT(*) as entryCount FROM dictionary_entries');
    const [[{ transCount }]] = await conn.query('SELECT COUNT(*) as transCount FROM translations');
    const [[{ defCount }]] = await conn.query('SELECT COUNT(*) as defCount FROM definitions');
    const [[{ fsCount }]] = await conn.query('SELECT COUNT(*) as fsCount FROM field_sources');

    console.log(`\n📊 Database counts:`);
    console.log(`   dictionary_entries: ${entryCount}`);
    console.log(`   translations:      ${transCount}`);
    console.log(`   definitions:       ${defCount}`);
    console.log(`   field_sources:     ${fsCount}`);

    // Test search
    const [testResults] = await conn.query(
      `SELECT de.term, t.hebrew, de.russian
       FROM dictionary_entries de
       JOIN translations t ON de.id = t.entry_id
       WHERE de.term LIKE '%סאלום%' OR t.hebrew LIKE '%שלום%'
       LIMIT 3`
    );
    console.log(`\n🔍 Test search "שלום/סאלום":`);
    testResults.forEach(r => console.log(`   ${r.term} → ${r.hebrew} (${r.russian || '-'})`));

  } finally {
    conn.release();
    await pool.end();
  }
}

async function insertFieldSources(conn, records) {
  if (records.length === 0) return;

  // Batch insert in chunks of 1000
  for (let i = 0; i < records.length; i += 1000) {
    const chunk = records.slice(i, i + 1000);
    const placeholders = chunk.map(() => '(?, ?, ?)').join(', ');
    const values = chunk.flat();
    await conn.query(
      `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES ${placeholders}`,
      values
    );
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
