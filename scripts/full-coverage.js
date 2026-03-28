#!/usr/bin/env node
require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const pool = await mysql.createPool({
    host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE
  });

  const q = async (sql, params = []) => { const [r] = await pool.query(sql, params); return r[0].cnt; };
  const total = await q("SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active'");

  console.log(`\nTotal active entries: ${total}\n`);

  // --- dictionary_entries fields ---
  console.log('=== dictionary_entries ===');
  const deFields = [
    ['term', "term IS NOT NULL AND term != ''"],
    ['russian', "russian IS NOT NULL AND russian != ''"],
    ['english', "english IS NOT NULL AND english != ''"],
    ['part_of_speech', "part_of_speech IS NOT NULL AND part_of_speech != ''"],
    ['pronunciation_guide', "pronunciation_guide IS NOT NULL AND pronunciation_guide != ''"],
    ['source', "source IS NOT NULL"],
    ['source_name', "source_name IS NOT NULL AND source_name != ''"],
    ['detected_language', "detected_language IS NOT NULL"],
    ['contributor_id', "contributor_id IS NOT NULL"],
    ['needs_translation=1', "needs_translation = 1"],
  ];
  for (const [name, where] of deFields) {
    const cnt = await q(`SELECT COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' AND ${where}`);
    const pct = (cnt / total * 100).toFixed(1);
    console.log(`  ${name.padEnd(25)} ${String(cnt).padStart(6)} (${pct.padStart(5)}%)`);
  }

  // --- translations fields ---
  console.log('\n=== translations ===');
  const tTotal = await q("SELECT COUNT(*) as cnt FROM translations t JOIN dictionary_entries de ON t.entry_id = de.id WHERE de.status = 'active'");
  console.log(`  total rows:                ${tTotal}`);
  const tFields = [
    ['hebrew', "t.hebrew IS NOT NULL AND t.hebrew != ''"],
    ['latin', "t.latin IS NOT NULL AND t.latin != ''"],
    ['cyrillic', "t.cyrillic IS NOT NULL AND t.cyrillic != ''"],
    ['dialect_id (set)', "t.dialect_id IS NOT NULL"],
    ['upvotes > 0', "t.upvotes > 0"],
    ['downvotes > 0', "t.downvotes > 0"],
  ];
  for (const [name, where] of tFields) {
    const cnt = await q(`SELECT COUNT(*) as cnt FROM translations t JOIN dictionary_entries de ON t.entry_id = de.id WHERE de.status = 'active' AND ${where}`);
    const pct = (cnt / total * 100).toFixed(1);
    console.log(`  ${name.padEnd(25)} ${String(cnt).padStart(6)} (${pct.padStart(5)}%)`);
  }

  // --- definitions ---
  const defCnt = await q("SELECT COUNT(DISTINCT d.entry_id) as cnt FROM definitions d JOIN dictionary_entries de ON d.entry_id = de.id WHERE de.status = 'active'");
  console.log(`\n=== definitions ===`);
  console.log(`  entries with definition   ${String(defCnt).padStart(6)} (${(defCnt/total*100).toFixed(1).padStart(5)}%)`);

  // --- examples ---
  const exCnt = await q("SELECT COUNT(DISTINCT e.entry_id) as cnt FROM examples e JOIN dictionary_entries de ON e.entry_id = de.id WHERE de.status = 'active'");
  const exTotal = await q("SELECT COUNT(*) as cnt FROM examples e JOIN dictionary_entries de ON e.entry_id = de.id WHERE de.status = 'active'");
  console.log(`\n=== examples ===`);
  console.log(`  entries with examples     ${String(exCnt).padStart(6)} (${(exCnt/total*100).toFixed(1).padStart(5)}%)`);
  console.log(`  total example rows        ${String(exTotal).padStart(6)}`);

  // --- breakdowns ---
  console.log('\n=== source breakdown ===');
  const [sources] = await pool.query("SELECT source, COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' GROUP BY source ORDER BY cnt DESC");
  for (const s of sources) console.log(`  ${String(s.source || 'NULL').padEnd(12)} ${s.cnt}`);

  console.log('\n=== detected_language breakdown ===');
  const [langs] = await pool.query("SELECT detected_language, COUNT(*) as cnt FROM dictionary_entries WHERE status = 'active' GROUP BY detected_language ORDER BY cnt DESC");
  for (const l of langs) console.log(`  ${String(l.detected_language || 'NULL').padEnd(12)} ${l.cnt}`);

  console.log('\n=== dialects ===');
  const [dialects] = await pool.query("SELECT d.*, COUNT(t.id) as translations FROM dialects d LEFT JOIN translations t ON d.id = t.dialect_id GROUP BY d.id");
  for (const d of dialects) console.log(`  #${d.id} ${d.name.padEnd(18)} ${d.translations} translations`);

  // --- field_sources ---
  const fsCnt = await q("SELECT COUNT(*) as cnt FROM field_sources");
  console.log(`\n=== field_sources ===`);
  console.log(`  total records:            ${String(fsCnt).padStart(6)}`);
  const [fsBreakdown] = await pool.query("SELECT source_type, COUNT(*) as cnt FROM field_sources GROUP BY source_type ORDER BY cnt DESC");
  for (const f of fsBreakdown) console.log(`  ${f.source_type.padEnd(12)} ${f.cnt}`);

  await pool.end();
})();
