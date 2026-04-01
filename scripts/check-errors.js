#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  // Check avg russian text length by range
  const ranges = [[1, 15000], [15000, 23000], [23000, 46000]];
  console.log('Avg russian_short length by ID range:');
  for (const [from, to] of ranges) {
    const [r] = await pool.query(
      'SELECT AVG(LENGTH(russian_short)) as avg_len, MAX(LENGTH(russian_short)) as max_len FROM dictionary_entries WHERE id BETWEEN ? AND ? AND russian_short IS NOT NULL',
      [from, to]
    );
    console.log(`  IDs ${from}-${to}: avg=${Math.round(r[0].avg_len || 0)}, max=${r[0].max_len || 0}`);
  }

  // Show longest entries in problem range
  console.log('\nLongest russian_short entries (15K-23K):');
  const [rows] = await pool.query(
    'SELECT id, LENGTH(russian_short) as len FROM dictionary_entries WHERE id BETWEEN 15000 AND 23000 AND russian_short IS NOT NULL ORDER BY LENGTH(russian_short) DESC LIMIT 5'
  );
  for (const r of rows) console.log(`  #${r.id} len=${r.len}`);

  // Check entries that failed (no field_sources but have russian_short)
  console.log('\nEntries with russian but no AI field_sources (15K-23K):');
  const [missing] = await pool.query(`
    SELECT COUNT(*) as cnt FROM dictionary_entries de
    WHERE de.id BETWEEN 15000 AND 23000
      AND de.status = 'active'
      AND de.russian_short IS NOT NULL AND de.russian_short != ''
      AND de.id NOT IN (SELECT DISTINCT entry_id FROM field_sources WHERE source_type = 'ai')
      AND (de.hebrew_long IS NULL OR de.hebrew_long = '')
  `);
  console.log(`  ${missing[0].cnt} entries with russian but no enrichment`);

  // Check what source_name these entries have
  console.log('\nSource breakdown (15K-23K):');
  const [sources] = await pool.query(
    "SELECT source_name, COUNT(*) as cnt FROM dictionary_entries WHERE id BETWEEN 15000 AND 23000 GROUP BY source_name ORDER BY cnt DESC LIMIT 5"
  );
  for (const s of sources) console.log(`  ${s.source_name || 'NULL'}: ${s.cnt}`);

  await pool.end();
})();
