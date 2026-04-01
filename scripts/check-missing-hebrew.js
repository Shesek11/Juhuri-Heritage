#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  const [rows] = await pool.query(`
    SELECT de.id, de.hebrew_script, de.russian_short,
           ds.hebrew_script as ds_heb, ds.latin_script, ds.cyrillic_script
    FROM dictionary_entries de
    LEFT JOIN dialect_scripts ds ON de.id = ds.entry_id
    WHERE de.status = 'active'
      AND (ds.hebrew_script IS NULL OR ds.hebrew_script = '')
    ORDER BY de.id LIMIT 10
  `);

  console.log("Entries missing hebrew transliteration in dialect_scripts:");
  for (const e of rows) {
    console.log(`  #${e.id} entries.hebrew_script="${e.hebrew_script||''}" latin="${e.latin_script||''}" cyrillic="${e.cyrillic_script||''}" russian="${(e.russian_short||'').substring(0,40)}"`);
  }

  // Check what context they have
  const [stats] = await pool.query(`
    SELECT
      SUM(CASE WHEN ds.latin_script IS NOT NULL AND ds.latin_script != '' THEN 1 ELSE 0 END) as has_latin,
      SUM(CASE WHEN ds.cyrillic_script IS NOT NULL AND ds.cyrillic_script != '' THEN 1 ELSE 0 END) as has_cyrillic,
      SUM(CASE WHEN de.russian_short IS NOT NULL AND de.russian_short != '' THEN 1 ELSE 0 END) as has_russian,
      COUNT(*) as total
    FROM dictionary_entries de
    LEFT JOIN dialect_scripts ds ON de.id = ds.entry_id
    WHERE de.status = 'active'
      AND (ds.hebrew_script IS NULL OR ds.hebrew_script = '')
  `);
  console.log("\nOf the missing entries:");
  console.log(`  Has latin: ${stats[0].has_latin}`);
  console.log(`  Has cyrillic: ${stats[0].has_cyrillic}`);
  console.log(`  Has russian: ${stats[0].has_russian}`);
  console.log(`  Total: ${stats[0].total}`);

  await pool.end();
})();
