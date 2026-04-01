#!/usr/bin/env node
/**
 * Populate slug column in dictionary_entries from dialect_scripts.latin_script.
 * First occurrence gets clean slug, subsequent get slug-2, slug-3, etc.
 * Run on production: node /var/www/jun-juhuri.com/scripts/populate-slugs.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/var/www/jun-juhuri.com/.env' });

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME || process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 's188510_juhuri',
    waitForConnections: true,
    connectionLimit: 1,
  });

  // Get all entries with latin_script, ordered by id (oldest first gets clean slug)
  const [rows] = await pool.query(`
    SELECT e.id, ds.latin_script
    FROM dictionary_entries e
    JOIN dialect_scripts ds ON e.id = ds.entry_id
    WHERE ds.latin_script IS NOT NULL AND ds.latin_script != ''
      AND e.status = 'active'
      AND e.slug IS NULL
    ORDER BY e.id ASC
  `);

  console.log(`Processing ${rows.length} entries...`);

  const slugCounts = {};
  let updated = 0;
  const batch = [];

  for (const row of rows) {
    // Normalize: lowercase, spaces to hyphens, remove quotes, trim
    let base = row.latin_script
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u00c0-\u024f\u0400-\u04ff\-]/gi, '') // keep latin, cyrillic, diacritics
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .trim();

    if (!base) continue;

    if (!slugCounts[base]) {
      slugCounts[base] = 1;
      batch.push([base, row.id]);
    } else {
      slugCounts[base]++;
      batch.push([`${base}-${slugCounts[base]}`, row.id]);
    }
    updated++;

    // Batch update every 500
    if (batch.length >= 500) {
      await batchUpdate(pool, batch);
      batch.length = 0;
      process.stdout.write(`\r  Updated ${updated}/${rows.length}`);
    }
  }

  // Final batch
  if (batch.length > 0) {
    await batchUpdate(pool, batch);
  }

  console.log(`\nDone! Updated ${updated} entries.`);

  // Stats
  const [stats] = await pool.query(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN slug IS NOT NULL THEN 1 ELSE 0 END) as has_slug,
      SUM(CASE WHEN slug IS NULL THEN 1 ELSE 0 END) as no_slug
    FROM dictionary_entries WHERE status = 'active'
  `);
  console.log('Stats:', stats[0]);

  await pool.end();
}

async function batchUpdate(pool, batch) {
  // Simple batch — no unique index during population
  const values = batch.map(([slug, id]) => `slug = CASE WHEN id = ${id} THEN '${slug.replace(/'/g, "''")}' ${''}`).join('');
  // Just do sequential updates — fast enough with 500 batches
  for (const [slug, id] of batch) {
    await pool.query('UPDATE dictionary_entries SET slug = ? WHERE id = ?', [slug, id]);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
