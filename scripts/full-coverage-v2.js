#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  const q = async (sql) => { const [r] = await pool.query(sql); return r[0].cnt; };
  const total = await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active'");

  console.log(`Total active entries: ${total}\n`);

  console.log('=== dictionary_entries ===');
  const deFields = [
    ['hebrew_script', "hebrew_script IS NOT NULL AND hebrew_script != ''"],
    ['hebrew_short', "hebrew_short IS NOT NULL AND hebrew_short != ''"],
    ['hebrew_long', "hebrew_long IS NOT NULL AND hebrew_long != ''"],
    ['russian_short', "russian_short IS NOT NULL AND russian_short != ''"],
    ['russian_long', "russian_long IS NOT NULL AND russian_long != ''"],
    ['english_short', "english_short IS NOT NULL AND english_short != ''"],
    ['english_long', "english_long IS NOT NULL AND english_long != ''"],
    ['part_of_speech', "part_of_speech IS NOT NULL AND part_of_speech != ''"],
  ];
  for (const [name, where] of deFields) {
    const cnt = await q(`SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND ${where}`);
    const missing = total - cnt;
    console.log(`  ${name.padEnd(20)} ${String(cnt).padStart(6)} / ${total}  (${(cnt/total*100).toFixed(1).padStart(5)}%)  missing: ${missing}`);
  }

  console.log('\n=== dialect_scripts ===');
  const dsFields = [
    ['hebrew_script', "ds.hebrew_script IS NOT NULL AND ds.hebrew_script != ''"],
    ['latin_script', "ds.latin_script IS NOT NULL AND ds.latin_script != ''"],
    ['cyrillic_script', "ds.cyrillic_script IS NOT NULL AND ds.cyrillic_script != ''"],
    ['pronunciation_guide', "ds.pronunciation_guide IS NOT NULL AND ds.pronunciation_guide != ''"],
  ];
  for (const [name, where] of dsFields) {
    const cnt = await q(`SELECT COUNT(*) as cnt FROM dialect_scripts ds JOIN dictionary_entries de ON ds.entry_id = de.id WHERE de.status = 'active' AND ${where}`);
    const missing = total - cnt;
    console.log(`  ${name.padEnd(20)} ${String(cnt).padStart(6)} / ${total}  (${(cnt/total*100).toFixed(1).padStart(5)}%)  missing: ${missing}`);
  }

  console.log('\n=== field_sources (AI) ===');
  const [fsRows] = await pool.query("SELECT field_name, COUNT(*) as cnt FROM field_sources WHERE source_type = 'ai' GROUP BY field_name ORDER BY cnt DESC");
  for (const r of fsRows) {
    console.log(`  ${r.field_name.padEnd(20)} ${r.cnt}`);
  }

  await pool.end();
})();
