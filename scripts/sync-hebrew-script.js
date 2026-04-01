#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  const [r] = await pool.query(`
    UPDATE dictionary_entries de
    JOIN dialect_scripts ds ON de.id = ds.entry_id
    SET de.hebrew_script = ds.hebrew_script
    WHERE (de.hebrew_script IS NULL OR de.hebrew_script = '')
      AND ds.hebrew_script IS NOT NULL AND ds.hebrew_script != ''
  `);
  console.log("Synced hebrew_script:", r.affectedRows);

  await pool.end();
})();
