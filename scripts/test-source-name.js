const mysql = require('mysql2/promise');
(async()=>{
  const c = await mysql.createConnection({host:'localhost',user:'u188510_juhuri',password:'ajixIR253mFKDjcc',database:'s188510_juhuri'});
  const [rows] = await c.query(`SELECT de.id, de.term, de.source, de.source_name,
    u.name as contributor_name
  FROM dictionary_entries de
  LEFT JOIN users u ON de.contributor_id = u.id
  WHERE de.term = 'XUTƏ'
  LIMIT 1`);
  console.log('Keys:', Object.keys(rows[0]));
  console.log('source_name:', rows[0].source_name);
  await c.end();
  process.exit(0);
})();
