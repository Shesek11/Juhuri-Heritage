#!/usr/bin/env node
/**
 * Re-read original JSON files and ensure each field is in the correct DB column.
 * Does NOT generate new data — only places existing original data correctly.
 *
 * Mapping:
 *   term             → entries.hebrew_script (transliteration)
 *   hebrew           → entries.hebrew_short (meaning)
 *   latin            → ds.latin_script
 *   cyrillic         → ds.cyrillic_script
 *   russian          → entries.russian_short
 *   partOfSpeech     → entries.part_of_speech
 *   pronunciationGuide → ds.pronunciation_guide
 *   definition       → entries.hebrew_long
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
    charset: 'utf8mb4',
  });

  // Read all original JSON files
  const dir = path.join(__dirname, '..', 'data', 'processed', 'original');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  let totalFixed = 0, totalChecked = 0, notFound = 0;

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    const entries = data.entries;

    for (const e of entries) {
      const term = (e.term || '').trim();
      const hebrew = (e.hebrew || '').trim();
      const latin = (e.latin || '').trim();
      const cyrillic = (e.cyrillic || '').trim();
      const russian = (e.russian || '').trim();
      const pos = (e.partOfSpeech || '').trim();
      const pron = (e.pronunciationGuide || '').trim();
      const def = (e.definition || '').trim();

      // Find the entry in DB by matching latin_script or term
      let dbEntry = null;
      if (latin) {
        const [rows] = await pool.query(
          `SELECT de.id, de.hebrew_script, de.hebrew_short, de.russian_short,
                  de.part_of_speech, de.hebrew_long,
                  ds.latin_script, ds.cyrillic_script, ds.hebrew_script as ds_heb,
                  ds.pronunciation_guide
           FROM dictionary_entries de
           LEFT JOIN dialect_scripts ds ON de.id = ds.entry_id
           WHERE de.status = 'active' AND ds.latin_script = ?
           LIMIT 1`,
          [latin]
        );
        if (rows.length > 0) dbEntry = rows[0];
      }
      if (!dbEntry && term) {
        const [rows] = await pool.query(
          `SELECT de.id, de.hebrew_script, de.hebrew_short, de.russian_short,
                  de.part_of_speech, de.hebrew_long,
                  ds.latin_script, ds.cyrillic_script, ds.hebrew_script as ds_heb,
                  ds.pronunciation_guide
           FROM dictionary_entries de
           LEFT JOIN dialect_scripts ds ON de.id = ds.entry_id
           WHERE de.status = 'active' AND de.hebrew_script = ?
           LIMIT 1`,
          [term]
        );
        if (rows.length > 0) dbEntry = rows[0];
      }

      if (!dbEntry) { notFound++; continue; }
      totalChecked++;

      let fixed = 0;

      // term → entries.hebrew_script (only if currently empty)
      if (term && (!dbEntry.hebrew_script || dbEntry.hebrew_script === '')) {
        await pool.query('UPDATE dictionary_entries SET hebrew_script = ? WHERE id = ?', [term, dbEntry.id]);
        fixed++;
      }

      // hebrew → entries.hebrew_short (only if currently empty)
      if (hebrew && (!dbEntry.hebrew_short || dbEntry.hebrew_short === '')) {
        await pool.query('UPDATE dictionary_entries SET hebrew_short = ? WHERE id = ?', [hebrew, dbEntry.id]);
        fixed++;
      }

      // latin → ds.latin_script (only if currently empty)
      if (latin && (!dbEntry.latin_script || dbEntry.latin_script === '')) {
        await pool.query('UPDATE dialect_scripts SET latin_script = ? WHERE entry_id = ? LIMIT 1', [latin, dbEntry.id]);
        fixed++;
      }

      // cyrillic → ds.cyrillic_script (only if currently empty)
      if (cyrillic && (!dbEntry.cyrillic_script || dbEntry.cyrillic_script === '')) {
        await pool.query('UPDATE dialect_scripts SET cyrillic_script = ? WHERE entry_id = ? LIMIT 1', [cyrillic, dbEntry.id]);
        fixed++;
      }

      // russian → entries.russian_short (only if currently empty)
      if (russian && (!dbEntry.russian_short || dbEntry.russian_short === '')) {
        await pool.query('UPDATE dictionary_entries SET russian_short = ? WHERE id = ?', [russian, dbEntry.id]);
        fixed++;
      }

      // partOfSpeech → entries.part_of_speech (only if currently empty)
      if (pos && (!dbEntry.part_of_speech || dbEntry.part_of_speech === '')) {
        await pool.query('UPDATE dictionary_entries SET part_of_speech = ? WHERE id = ?', [pos, dbEntry.id]);
        fixed++;
      }

      // pronunciationGuide → ds.pronunciation_guide (only if currently empty)
      if (pron && (!dbEntry.pronunciation_guide || dbEntry.pronunciation_guide === '')) {
        await pool.query('UPDATE dialect_scripts SET pronunciation_guide = ? WHERE entry_id = ? LIMIT 1', [pron, dbEntry.id]);
        fixed++;
      }

      // definition → entries.hebrew_long (only if currently empty)
      if (def && (!dbEntry.hebrew_long || dbEntry.hebrew_long === '')) {
        await pool.query('UPDATE dictionary_entries SET hebrew_long = ? WHERE id = ?', [def, dbEntry.id]);
        fixed++;
      }

      if (fixed > 0) totalFixed++;
    }
  }

  console.log('Checked:', totalChecked);
  console.log('Entries with fixes:', totalFixed);
  console.log('Not found in DB:', notFound);

  // Show coverage after
  const q = async (sql) => { const [r] = await pool.query(sql); return r[0].cnt; };
  const total = await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active'");
  console.log('\nCoverage after fix:');
  console.log('entries.hebrew_script:', await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND hebrew_script != ''"), '/', total);
  console.log('entries.hebrew_short:', await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND hebrew_short IS NOT NULL AND hebrew_short != ''"), '/', total);
  console.log('ds.latin_script:', await q("SELECT COUNT(*) as cnt FROM dialect_scripts ds JOIN dictionary_entries de ON ds.entry_id = de.id WHERE de.status = 'active' AND ds.latin_script IS NOT NULL AND ds.latin_script != ''"), '/', total);
  console.log('ds.cyrillic_script:', await q("SELECT COUNT(*) as cnt FROM dialect_scripts ds JOIN dictionary_entries de ON ds.entry_id = de.id WHERE de.status = 'active' AND ds.cyrillic_script IS NOT NULL AND ds.cyrillic_script != ''"), '/', total);
  console.log('ds.hebrew_script:', await q("SELECT COUNT(*) as cnt FROM dialect_scripts ds JOIN dictionary_entries de ON ds.entry_id = de.id WHERE de.status = 'active' AND ds.hebrew_script IS NOT NULL AND ds.hebrew_script != ''"), '/', total);
  console.log('russian_short:', await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND russian_short IS NOT NULL AND russian_short != ''"), '/', total);
  console.log('part_of_speech:', await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND part_of_speech IS NOT NULL AND part_of_speech != ''"), '/', total);

  await pool.end();
})();
