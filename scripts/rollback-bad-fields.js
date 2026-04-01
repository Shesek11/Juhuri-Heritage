#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  // Clear bad english/russian data (was written in Hebrew by mistake)
  await pool.query("UPDATE dictionary_entries SET english_short = NULL, english_long = NULL, russian_long = NULL WHERE english_short IS NOT NULL");
  console.log("Cleared english_short, english_long, russian_long");

  // Also clear hebrew_short that was just added by the new run (only the AI ones, keep the 1272 originals)
  await pool.query("DELETE FROM field_sources WHERE field_name IN ('englishShort', 'englishLong', 'russianLong', 'hebrewMeaning')");
  console.log("Cleared field_sources for new fields");

  const q = async (s) => { const [r] = await pool.query(s); return r[0].cnt; };
  console.log("english_short remaining:", await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE english_short IS NOT NULL AND english_short != ''"));
  console.log("russian_long remaining:", await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE russian_long IS NOT NULL AND russian_long != ''"));

  await pool.end();
})();
