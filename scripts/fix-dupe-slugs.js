#!/usr/bin/env node
const mysql = require('mysql2/promise');
require('dotenv').config({ path: '/var/www/jun-juhuri.com/.env' });

async function main() {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 's188510_juhuri',
  });

  // Find all duplicate slugs
  const [dupes] = await pool.query(`
    SELECT slug FROM dictionary_entries
    WHERE slug IS NOT NULL
    GROUP BY slug HAVING COUNT(*) > 1
  `);

  console.log(`Fixing ${dupes.length} duplicate slug groups...`);
  let fixed = 0;

  for (const { slug } of dupes) {
    // Get all entries with this slug, keep the lowest id as-is
    const [entries] = await pool.query(
      'SELECT id FROM dictionary_entries WHERE slug = ? ORDER BY id ASC',
      [slug]
    );
    // Skip first (keeps clean slug), suffix the rest
    for (let i = 1; i < entries.length; i++) {
      const newSlug = `${slug}-${i + 1}`;
      await pool.query('UPDATE dictionary_entries SET slug = ? WHERE id = ?', [newSlug, entries[i].id]);
      fixed++;
    }
  }

  console.log(`Fixed ${fixed} entries.`);

  // Now add unique index
  try {
    await pool.query('ALTER TABLE dictionary_entries ADD UNIQUE INDEX idx_slug (slug)');
    console.log('UNIQUE INDEX added successfully.');
  } catch (e) {
    console.error('Failed to add index:', e.message);
  }

  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
