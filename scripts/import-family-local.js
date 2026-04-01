#!/usr/bin/env node
// Import production family data from TSV files into local DB
const fs = require('fs');
const mysql = require('mysql2/promise');

async function main() {
  const pool = await mysql.createPool({ host:'localhost', user:'root', database:'juhuri_dev', port:3306 });
  await pool.query('SET FOREIGN_KEY_CHECKS=0');

  // Import members
  const membersRaw = fs.readFileSync('scripts/family_members.tsv','utf8').split('\n');
  const mHeaders = membersRaw[0].split('\t');
  for (let i = 1; i < membersRaw.length; i++) {
    const cols = membersRaw[i].split('\t');
    if (cols.length < 2) continue;
    const row = {};
    mHeaders.forEach((h, j) => row[h] = cols[j] === 'NULL' || cols[j] === '' ? null : cols[j]);
    await pool.query(
      `INSERT INTO family_members (id,first_name,last_name,gender,birth_date,death_date,is_alive,user_id,maiden_name,birth_city,birth_country,residence_city,residence_country,first_name_ru,last_name_ru) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [row.id, row.first_name, row.last_name, row.gender, row.birth_date, row.death_date, row.is_alive, row.user_id, row.maiden_name, row.birth_city, row.birth_country, row.residence_city, row.residence_country, row.first_name_ru, row.last_name_ru]
    );
  }
  console.log('Members imported');

  // Import parent-child
  const pcRaw = fs.readFileSync('scripts/family_pc.tsv','utf8').split('\n');
  const pcHeaders = pcRaw[0].split('\t');
  for (let i = 1; i < pcRaw.length; i++) {
    const cols = pcRaw[i].split('\t');
    if (cols.length < 3) continue;
    const row = {};
    pcHeaders.forEach((h, j) => row[h] = cols[j] === 'NULL' || cols[j] === '' ? null : cols[j]);
    await pool.query(
      `INSERT INTO family_parent_child (id,parent_id,child_id,relationship_type,notes,created_at) VALUES (?,?,?,?,?,?)`,
      [row.id, row.parent_id, row.child_id, row.relationship_type, row.notes, row.created_at]
    );
  }
  console.log('Parent-child imported');

  // Import partnerships
  const pRaw = fs.readFileSync('scripts/family_partners.tsv','utf8').split('\n');
  const pHeaders = pRaw[0].split('\t');
  for (let i = 1; i < pRaw.length; i++) {
    const cols = pRaw[i].split('\t');
    if (cols.length < 3) continue;
    const row = {};
    pHeaders.forEach((h, j) => row[h] = cols[j] === 'NULL' || cols[j] === '' ? null : cols[j]);
    await pool.query(
      `INSERT INTO family_partnerships (id,person1_id,person2_id,status,start_date,end_date,marriage_place,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [row.id, row.person1_id, row.person2_id, row.status, row.start_date, row.end_date, row.marriage_place, row.notes, row.created_at, row.updated_at]
    );
  }
  console.log('Partnerships imported');

  await pool.end();
  console.log('Done!');
}
main().catch(e => { console.error(e); process.exit(1); });
