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

  const fields = {
    'term (hebrew script)': await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND term IS NOT NULL AND term != ''"),
    'translations.hebrew': await q("SELECT COUNT(*) as cnt FROM dictionary_entries de JOIN translations t ON de.id = t.entry_id WHERE de.status = 'active' AND t.hebrew IS NOT NULL AND t.hebrew != ''"),
    'translations.latin': await q("SELECT COUNT(*) as cnt FROM dictionary_entries de JOIN translations t ON de.id = t.entry_id WHERE de.status = 'active' AND t.latin IS NOT NULL AND t.latin != ''"),
    'translations.cyrillic': await q("SELECT COUNT(*) as cnt FROM dictionary_entries de JOIN translations t ON de.id = t.entry_id WHERE de.status = 'active' AND t.cyrillic IS NOT NULL AND t.cyrillic != ''"),
    'russian': await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND russian IS NOT NULL AND russian != ''"),
    'part_of_speech': await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND part_of_speech IS NOT NULL AND part_of_speech != ''"),
    'pronunciation_guide': await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND pronunciation_guide IS NOT NULL AND pronunciation_guide != ''"),
    'definitions': await q("SELECT COUNT(DISTINCT d.entry_id) as cnt FROM definitions d JOIN dictionary_entries de ON d.entry_id = de.id WHERE de.status = 'active'"),
  };

  console.log(`\nTotal active entries: ${total}\n`);

  const sorted = Object.entries(fields).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sorted) {
    const pct = (count / total * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / total * 40));
    console.log(`${name.padEnd(22)} ${String(count).padStart(6)} (${pct.padStart(5)}%) ${bar}`);
  }

  await pool.end();
})();
