#!/usr/bin/env node
/**
 * Backfill phonetic_key column in dictionary_entries.
 * Run on production: node /var/www/jun-juhuri.com/scripts/backfill-phonetic-key.js
 *
 * The toPhoneticKey logic here MUST stay in sync with src/lib/phoneticKey.ts
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/var/www/jun-juhuri.com/.env' });

/**
 * Phonetic normalization for fuzzy Hebrew search.
 * Collapses homophones so that words that sound alike produce the same key.
 */
function toPhoneticKey(hebrew) {
  let s = hebrew;

  // 1. Strip niqqud and cantillation marks
  s = s.replace(/[\u0591-\u05C7]/g, '');

  // 2. Remove geresh variants (', ʼ, ׳, ')
  s = s.replace(/['\u05F3\u02BC\u2019]/g, '');

  // 3. Normalize final letters → regular form
  s = s.replace(/ך/g, 'כ');
  s = s.replace(/ם/g, 'מ');
  s = s.replace(/ן/g, 'נ');
  s = s.replace(/ף/g, 'פ');
  s = s.replace(/ץ/g, 'צ');

  // 4. Collapse double vav/yod before homophone mapping
  s = s.replace(/וו/g, 'ו');
  s = s.replace(/יי/g, 'י');

  // 5. Collapse homophones
  s = s.replace(/ת/g, 'ט');  // both /t/
  s = s.replace(/ש/g, 'ס');  // both /s/ (without shin dot)
  s = s.replace(/ק/g, 'כ');  // both /k/
  s = s.replace(/ח/g, 'כ');  // both /kh/
  s = s.replace(/ע/g, 'א');  // both silent/guttural
  s = s.replace(/ז/g, 'ג');  // ז׳↔ג׳ (zh/j confusion, common in Juhuri)
  s = s.replace(/צ/g, 'ג');  // צ׳↔ג׳ (ch/j, same sound in Juhuri)

  // 6. ה → א at start or end of each word (guttural confusion)
  s = s.replace(/(^|\s)ה/g, '$1א');
  s = s.replace(/ה($|\s)/g, 'א$1');

  // 7. Trim whitespace
  s = s.trim();

  return s;
}

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 's188510_juhuri',
    waitForConnections: true,
    connectionLimit: 5,
  });

  console.log('Fetching active entries with hebrew_script...');
  const [rows] = await pool.query(
    `SELECT id, hebrew_script FROM dictionary_entries WHERE status = 'active' AND hebrew_script IS NOT NULL AND hebrew_script != ''`
  );
  console.log(`Found ${rows.length} entries to process.`);

  let updated = 0;
  let skipped = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const cases = [];
    const ids = [];

    for (const row of batch) {
      const key = toPhoneticKey(row.hebrew_script);
      if (key) {
        cases.push(`WHEN id = ${row.id} THEN ${pool.escape(key)}`);
        ids.push(row.id);
      } else {
        skipped++;
      }
    }

    if (ids.length > 0) {
      await pool.query(
        `UPDATE dictionary_entries SET phonetic_key = CASE ${cases.join(' ')} END WHERE id IN (${ids.join(',')})`
      );
      updated += ids.length;
    }

    if ((i + BATCH_SIZE) % 5000 === 0 || i + BATCH_SIZE >= rows.length) {
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length} (updated: ${updated}, skipped: ${skipped})`);
    }
  }

  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
