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

  // Connect to database (match env var names from server/config/db.js)
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || process.env.DB_NAME,
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
    await conn.query('DELETE FROM dialect_scripts');
    await conn.query('DELETE FROM dictionary_entries');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Old data deleted');

    // Reset auto-increment
    await conn.query('ALTER TABLE dictionary_entries AUTO_INCREMENT = 1');
    await conn.query('ALTER TABLE dialect_scripts AUTO_INCREMENT = 1');

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
          const russianShort = entry.russian || entry.russianShort || null;
          const hebrewLong = entry.definition || entry.hebrewLong || null;
          const hebrewShort = entry.hebrew || entry.hebrewShort || null;
          const latinScript = entry.latin || entry.latinScript || null;
          const sourceInfo = entry.sources ? JSON.stringify(entry.sources) : null;

          // Insert dictionary_entry
          const [result] = await conn.query(
            `INSERT INTO dictionary_entries
             (hebrew_script, detected_language, part_of_speech, russian_short, hebrew_long, source, source_name, status, source_info)
             VALUES (?, ?, ?, ?, ?, 'מאגר', ?, 'active', ?)`,
            [term, detectedLanguage, partOfSpeech, russianShort, hebrewLong, entry.sourceName || entry.source_name || null, sourceInfo]
          );

          const entryId = result.insertId;

          // Insert dialect_script (dialect_id = NULL for unknown)
          await conn.query(
            `INSERT INTO dialect_scripts (entry_id, dialect_id, hebrew_script, latin_script, cyrillic_script, pronunciation_guide)
             VALUES (?, NULL, ?, ?, '', ?)`,
            [entryId, hebrewShort, latinScript, pronunciationGuide]
          );

          // Track field sources for this entry
          const fields = [];
          if (term) fields.push('hebrewScript');
          if (hebrewShort) fields.push('hebrewShort');
          if (russianShort) fields.push('russianShort');
          if (latinScript) fields.push('latinScript');
          if (hebrewLong) fields.push('hebrewLong');
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
    const [[{ dsCount }]] = await conn.query('SELECT COUNT(*) as dsCount FROM dialect_scripts');
    const [[{ fsCount }]] = await conn.query('SELECT COUNT(*) as fsCount FROM field_sources');

    console.log(`\n📊 Database counts:`);
    console.log(`   dictionary_entries: ${entryCount}`);
    console.log(`   dialect_scripts:   ${dsCount}`);
    console.log(`   field_sources:     ${fsCount}`);

    // Test search
    const [testResults] = await conn.query(
      `SELECT de.hebrew_script, ds.hebrew_script as ds_hebrew, de.russian_short
       FROM dictionary_entries de
       JOIN dialect_scripts ds ON de.id = ds.entry_id
       WHERE de.hebrew_script LIKE '%סאלום%' OR ds.hebrew_script LIKE '%שלום%'
       LIMIT 3`
    );
    console.log(`\n🔍 Test search "שלום/סאלום":`);
    testResults.forEach(r => console.log(`   ${r.hebrew_script} → ${r.ds_hebrew} (${r.russian_short || '-'})`));

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
