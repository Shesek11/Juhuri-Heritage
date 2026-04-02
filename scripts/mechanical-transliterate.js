#!/usr/bin/env node
/**
 * Mechanical transliteration: Latin Juhuri → Hebrew script (plene / ktiv male).
 * No niqqud - uses matres lectionis (א, ו, י) for vowels.
 * Overwrites ALL entries that have latin_script.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] || '0') || Infinity;

// Normalize special latin chars before processing
function normalizeLatin(s) {
  return s
    .replace(/Ş/g, 'ş').replace(/š/g, 'ş').replace(/Š/g, 'ş')
    .replace(/Ç/g, 'ç').replace(/č/g, 'ç').replace(/Č/g, 'ç')
    .replace(/Ğ/g, 'ğ').replace(/Ə/g, 'ə')
    .replace(/Ü/g, 'ü').replace(/Ö/g, 'ö').replace(/Ä/g, 'ä')
    .replace(/Ⱨ/g, 'ⱨ').replace(/İ/g, 'i').replace(/Ƨ/g, 'ƨ')
    .toLowerCase();
}

// Multi-char mappings (checked first, order matters)
const MULTI = [
  // 2-char consonants (must be before single chars)
  ['sh', 'ש'], ['ch', 'צ׳'], ['kh', 'ח'], ['gh', 'ע׳'], ['zh', 'ז׳'],
  // Diphthongs
  ['ei', 'יי'], ['ey', 'יי'], ['oy', 'וי'], ['ay', 'אי'],
  ['oo', 'ו'], ['ee', 'י'], ['ou', 'ו'], ['aa', 'א'],
];

// Single char → Hebrew (plene, no niqqud)
const SINGLE = {
  'a': 'א', 'b': 'ב', 'c': 'צ', 'd': 'ד', 'e': 'ע', 'f': 'פ', 'g': 'ג',
  'h': 'ה', 'i': 'י', 'j': 'ג׳', 'k': 'ק', 'l': 'ל', 'm': 'מ', 'n': 'נ',
  'o': 'ו', 'p': 'פ', 'q': 'ק', 'r': 'ר', 's': 'ס', 't': 'ט', 'u': 'ו',
  'v': 'ו', 'w': 'ו', 'x': 'ח', 'y': 'י', 'z': 'ז',
  // Special Juhuri Latin chars
  'ə': 'ע', 'ü': 'י', 'ö': 'ו', 'ä': 'א', 'ğ': 'ג׳', 'ç': 'צ׳',
  'ş': 'ש', 'ⱨ': 'ה', 'ʻ': 'ע', 'ƨ': 'ס',
  // Punctuation passthrough
  ' ': ' ', '-': '-', '.': '.', '?': '?', '!': '!', ',': ',',
};

function transliterate(latin) {
  if (!latin || !latin.trim()) return null;
  let result = '';
  let i = 0;
  const lower = normalizeLatin(latin.trim());

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
      i++; // skip unknown
    }
  }

  // Final-form letters
  result = result.replace(/מ(?=$| |-)/g, 'ם');
  result = result.replace(/נ(?=$| |-)/g, 'ן');
  result = result.replace(/פ(?=$| |-)/g, 'ף');
  result = result.replace(/צ(?=$| |-)/g, 'ץ');
  result = result.replace(/צ׳(?=$| |-)/g, 'צ׳'); // keep geresh on final צ׳

  return result || null;
}

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE,
    charset: 'utf8mb4',
  });
  const conn = await pool.getConnection();

  // Get ALL active entries with latin_script
  const [rows] = await conn.query(
    `SELECT de.id, de.hebrew_script, ds.latin_script
     FROM dictionary_entries de
     JOIN dialect_scripts ds ON de.id = ds.entry_id
     WHERE de.status = 'active'
       AND ds.latin_script IS NOT NULL AND ds.latin_script != ''
     ORDER BY de.id ASC
     LIMIT ?`,
    [LIMIT === Infinity ? 999999 : LIMIT]
  );

  console.log(`Found ${rows.length} entries with latin_script.`);
  if (DRY_RUN) console.log('DRY RUN\n');

  let updated = 0, skipped = 0, same = 0;
  for (const row of rows) {
    const heb = transliterate(row.latin_script);
    if (!heb || heb.trim().length === 0) { skipped++; continue; }
    if (heb === row.hebrew_script) { same++; continue; }

    if (DRY_RUN) {
      if (updated < 50) {
        console.log(`#${row.id} ${row.latin_script} → ${heb}` + (row.hebrew_script ? ` (was: ${row.hebrew_script})` : ''));
      }
    } else {
      await conn.query('UPDATE dictionary_entries SET hebrew_script = ? WHERE id = ?', [heb, row.id]);
      await conn.query('UPDATE dialect_scripts SET hebrew_script = ? WHERE entry_id = ?', [heb, row.id]);
    }
    updated++;
    if (!DRY_RUN && updated % 500 === 0) console.log(`  Updated ${updated}...`);
  }

  console.log(`\nDone: updated=${updated}, same=${same}, skipped=${skipped}`);
  conn.release();
  await pool.end();
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
