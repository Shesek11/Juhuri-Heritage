#!/usr/bin/env node
/**
 * Fill missing hebrew_short and english_short using Google Translate (free).
 * Translates from russian_short which is 100% filled.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DRY_RUN = process.argv.includes('--dry-run');
const DELAY = 100; // ms between requests to avoid rate limiting

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function translate(text, from, to) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text.substring(0, 200))}`;
  const resp = await fetch(url);
  if (!resp.ok) return null;
  const data = await resp.json();
  return data[0]?.map(s => s[0]).join('').trim() || null;
}

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
    charset: 'utf8mb4',
  });
  const conn = await pool.getConnection();

  // Get entries missing hebrew_short or english_short that have russian_short
  const [rows] = await conn.query(
    `SELECT id, russian_short, hebrew_short, english_short
     FROM dictionary_entries
     WHERE status = 'active'
       AND russian_short IS NOT NULL AND russian_short != ''
       AND (
         (hebrew_short IS NULL OR hebrew_short = '')
         OR (english_short IS NULL OR english_short = '')
       )`
  );

  console.log(`Found ${rows.length} entries to translate.`);
  if (DRY_RUN) console.log('DRY RUN\n');

  let hebrewSaved = 0, englishSaved = 0, errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const ruText = row.russian_short.substring(0, 200); // Limit for long entries

    try {
      // Hebrew
      if (!row.hebrew_short) {
        const he = await translate(ruText, 'ru', 'he');
        if (he) {
          if (DRY_RUN) {
            console.log(`#${row.id} he: ${ruText.substring(0,40)} → ${he}`);
          } else {
            await conn.query(
              'UPDATE dictionary_entries SET hebrew_short = ? WHERE id = ? AND (hebrew_short IS NULL OR hebrew_short = "")',
              [he, row.id]
            );
            await conn.query(
              `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, 'hebrewMeaning', 'ai')
               ON DUPLICATE KEY UPDATE source_type = 'ai'`,
              [row.id]
            );
          }
          hebrewSaved++;
        }
        await sleep(DELAY);
      }

      // English
      if (!row.english_short) {
        const en = await translate(ruText, 'ru', 'en');
        if (en) {
          if (DRY_RUN) {
            console.log(`#${row.id} en: ${ruText.substring(0,40)} → ${en}`);
          } else {
            await conn.query(
              'UPDATE dictionary_entries SET english_short = ? WHERE id = ? AND (english_short IS NULL OR english_short = "")',
              [en, row.id]
            );
            await conn.query(
              `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, 'englishShort', 'ai')
               ON DUPLICATE KEY UPDATE source_type = 'ai'`,
              [row.id]
            );
          }
          englishSaved++;
        }
        await sleep(DELAY);
      }

      if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${rows.length}...`);
    } catch (err) {
      errors++;
      if (errors < 5) console.error(`  Error #${row.id}: ${err.message}`);
    }
  }

  console.log(`\nDone: hebrew=${hebrewSaved}, english=${englishSaved}, errors=${errors}`);
  conn.release();
  await pool.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
