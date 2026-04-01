#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  // Sample 20 entries where both exist - compare them
  const [rows] = await pool.query(`
    SELECT de.id, de.hebrew_script as entry_heb, ds.hebrew_script as ds_heb,
           de.russian_short, ds.latin_script
    FROM dictionary_entries de
    JOIN dialect_scripts ds ON de.id = ds.entry_id
    WHERE de.status = 'active'
      AND de.hebrew_script IS NOT NULL AND de.hebrew_script != ''
      AND ds.hebrew_script IS NOT NULL AND ds.hebrew_script != ''
    ORDER BY RAND()
    LIMIT 20
  `);

  console.log('entry_hebrew_script vs dialect_scripts.hebrew_script:');
  console.log('ID | entries.hebrew_script | ds.hebrew_script | SAME? | latin | russian');
  for (const r of rows) {
    const same = r.entry_heb === r.ds_heb ? 'YES' : 'NO';
    console.log(r.id + ' | ' + (r.entry_heb||'') + ' | ' + (r.ds_heb||'') + ' | ' + same + ' | ' + (r.latin_script||'') + ' | ' + (r.russian_short||'').substring(0,30));
  }

  // Count: how many are identical vs different
  const [stats] = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN de.hebrew_script = ds.hebrew_script THEN 1 ELSE 0 END) as identical,
      SUM(CASE WHEN de.hebrew_script != ds.hebrew_script THEN 1 ELSE 0 END) as different
    FROM dictionary_entries de
    JOIN dialect_scripts ds ON de.id = ds.entry_id
    WHERE de.status = 'active'
      AND de.hebrew_script IS NOT NULL AND de.hebrew_script != ''
      AND ds.hebrew_script IS NOT NULL AND ds.hebrew_script != ''
  `);
  console.log('\nStats:');
  console.log('Total with both:', stats[0].total);
  console.log('Identical:', stats[0].identical);
  console.log('Different:', stats[0].different);

  // For the "different" ones, show samples to see if ds is translation or transliteration
  const [diffSamples] = await pool.query(`
    SELECT de.id, de.hebrew_script as entry_heb, ds.hebrew_script as ds_heb,
           de.russian_short, ds.latin_script, de.hebrew_short
    FROM dictionary_entries de
    JOIN dialect_scripts ds ON de.id = ds.entry_id
    WHERE de.status = 'active'
      AND de.hebrew_script IS NOT NULL AND de.hebrew_script != ''
      AND ds.hebrew_script IS NOT NULL AND ds.hebrew_script != ''
      AND de.hebrew_script != ds.hebrew_script
    ORDER BY RAND()
    LIMIT 15
  `);
  if (diffSamples.length > 0) {
    console.log('\nSamples where they DIFFER:');
    console.log('ID | entries.heb (translit) | ds.heb (???) | hebrew_short | latin | russian');
    for (const r of diffSamples) {
      console.log(r.id + ' | ' + (r.entry_heb||'') + ' | ' + (r.ds_heb||'') + ' | ' + (r.hebrew_short||'') + ' | ' + (r.latin_script||'') + ' | ' + (r.russian_short||'').substring(0,25));
    }
  }

  // Check: entries where ds.hebrew_script was set by AI
  const [aiCount] = await pool.query(`
    SELECT COUNT(*) as cnt FROM field_sources WHERE field_name = 'hebrewShort' AND source_type = 'ai'
  `);
  console.log('\nAI-written hebrewShort (ds.hebrew_script):', aiCount[0].cnt);

  // Check entries where ds.hebrew_script exists but NO AI source (original data)
  const [origCount] = await pool.query(`
    SELECT COUNT(*) as cnt
    FROM dialect_scripts ds
    JOIN dictionary_entries de ON ds.entry_id = de.id
    WHERE de.status = 'active'
      AND ds.hebrew_script IS NOT NULL AND ds.hebrew_script != ''
      AND ds.entry_id NOT IN (SELECT entry_id FROM field_sources WHERE field_name = 'hebrewShort')
  `);
  console.log('Original (non-AI) ds.hebrew_script:', origCount[0].cnt);

  await pool.end();
})();
