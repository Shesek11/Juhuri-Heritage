#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  const [cols] = await pool.query("SHOW COLUMNS FROM dictionary_entries");
  console.log("=== dictionary_entries ===");
  for (const c of cols) console.log("  " + c.Field);

  const [cols2] = await pool.query("SHOW COLUMNS FROM dialect_scripts");
  console.log("\n=== dialect_scripts ===");
  for (const c of cols2) console.log("  " + c.Field);

  const [tables] = await pool.query("SHOW TABLES LIKE 'definitions'");
  console.log("\ndefinitions table exists:", tables.length > 0);

  const [tables2] = await pool.query("SHOW TABLES LIKE 'translations'");
  console.log("translations table exists:", tables2.length > 0);

  const q = async (sql) => { const [r] = await pool.query(sql); return r[0].cnt; };
  console.log("\nhebrew_short migrated:", await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE hebrew_short IS NOT NULL AND hebrew_short != ''"));
  console.log("hebrew_long migrated:", await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE hebrew_long IS NOT NULL AND hebrew_long != ''"));
  console.log("pronunciation in dialect_scripts:", await q("SELECT COUNT(*) as cnt FROM dialect_scripts WHERE pronunciation_guide IS NOT NULL AND pronunciation_guide != ''"));

  // Sample entry
  const [sample] = await pool.query("SELECT de.hebrew_script, de.hebrew_short, de.hebrew_long, de.russian_short, de.part_of_speech, ds.hebrew_script as ds_heb, ds.latin_script, ds.cyrillic_script, ds.pronunciation_guide FROM dictionary_entries de JOIN dialect_scripts ds ON de.id = ds.entry_id WHERE de.hebrew_script != '' LIMIT 1");
  if (sample.length) {
    console.log("\nSample entry:");
    console.log(JSON.stringify(sample[0], null, 2));
  }

  await pool.end();
})();
