#!/usr/bin/env node
/**
 * Mechanical transliteration: Latin Juhuri → Hebrew script.
 * No AI needed. Fills entries.hebrew_script for entries that have latin_script but no hebrew_script.
 * Also fills hebrew_short and english_short using Gemini for entries missing those.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DRY_RUN = process.argv.includes('--dry-run');

// Transliteration map based on known correct pairs
// Multi-char mappings (checked first, longest match wins)
const MULTI = [
  ['sh', 'ש'], ['ch', 'צ\''], ['kh', 'ח'], ['gh', 'ע\''],
  ['zh', 'ז\''], ['th', 'ט'], ['ey', 'יי'], ['oy', 'וי'],
  ['ay', 'יי'], ['oo', 'וּ'], ['ee', 'י'],
];

// Single char mappings
const SINGLE = {
  'a': 'א', 'b': 'ב', 'c': 'צ', 'd': 'ד', 'e': 'א', 'f': 'פ', 'g': 'ג',
  'h': 'ה', 'i': 'י', 'j': 'ג\'', 'k': 'ק', 'l': 'ל', 'm': 'מ', 'n': 'נ',
  'o': 'ו', 'p': 'פ', 'q': 'ק', 'r': 'ר', 's': 'ס', 't': 'ט', 'u': 'ו',
  'v': 'ו', 'w': 'ו', 'x': 'ח', 'y': 'י', 'z': 'ז',
  // Special Juhuri Latin chars
  'ə': 'א', 'ü': 'י', 'ö': 'ו', 'ä': 'א', 'ğ': 'ג\'', 'ç': 'צ\'',
  'ş': 'ש', 'ⱨ': 'ה', 'ʻ': 'ע', 'ƨ': 'ס',
  // Punctuation passthrough
  ' ': ' ', '-': '-', '\'': '\'',
};

function transliterate(latin) {
  if (!latin || !latin.trim()) return null;
  let result = '';
  let i = 0;
  const lower = latin.toLowerCase().trim();

  while (i < lower.length) {
    let matched = false;

    // Try multi-char (longest first)
    for (const [from, to] of MULTI) {
      if (lower.substring(i, i + from.length) === from) {
        result += to;
        i += from.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Single char
    if (SINGLE[lower[i]]) {
      result += SINGLE[lower[i]];
      i++;
    } else {
      // Skip unknown chars (digits, special)
      i++;
    }
  }

  // Use final-form letters
  result = result.replace(/מ$/g, 'ם').replace(/מ /g, 'ם ').replace(/מ-/g, 'ם-');
  result = result.replace(/נ$/g, 'ן').replace(/נ /g, 'ן ').replace(/נ-/g, 'ן-');
  result = result.replace(/פ$/g, 'ף').replace(/פ /g, 'ף ').replace(/פ-/g, 'ף-');
  result = result.replace(/צ$/g, 'ץ').replace(/צ /g, 'ץ ').replace(/צ-/g, 'ץ-');

  return result || null;
}

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
    charset: 'utf8mb4',
  });

  const conn = await pool.getConnection();

  // Get entries missing hebrew_script but having latin_script
  const [rows] = await conn.query(
    `SELECT de.id, ds.latin_script
     FROM dictionary_entries de
     JOIN dialect_scripts ds ON de.id = ds.entry_id
     WHERE de.status = 'active'
       AND (de.hebrew_script IS NULL OR de.hebrew_script = '')
       AND ds.latin_script IS NOT NULL AND ds.latin_script != ''`
  );

  console.log(`Found ${rows.length} entries missing hebrew_script with latin available.`);
  if (DRY_RUN) console.log('DRY RUN - no DB writes\n');

  let saved = 0, skipped = 0;
  for (const row of rows) {
    const heb = transliterate(row.latin_script);
    if (!heb || heb.trim().length === 0) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`#${row.id} ${row.latin_script} → ${heb}`);
    } else {
      await conn.query(
        'UPDATE dictionary_entries SET hebrew_script = ? WHERE id = ? AND (hebrew_script IS NULL OR hebrew_script = "")',
        [heb, row.id]
      );
      // Also copy to dialect_scripts
      await conn.query(
        'UPDATE dialect_scripts SET hebrew_script = ? WHERE entry_id = ? AND (hebrew_script IS NULL OR hebrew_script = "")',
        [heb, row.id]
      );
      await conn.query(
        `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, 'hebrewTranslit', 'ai')
         ON DUPLICATE KEY UPDATE source_type = 'ai'`,
        [row.id]
      );
    }
    saved++;
    if (saved % 50 === 0) console.log(`  Saved ${saved}...`);
  }

  console.log(`\nDone: saved=${saved}, skipped=${skipped}`);
  conn.release();
  await pool.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
