require('dotenv').config();
const pool = require('./server/config/db');

async function checkColumns() {
    try {
        const [rows] = await pool.query('DESCRIBE family_members');
        console.log(JSON.stringify(rows.map(r => r.Field), null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkColumns();
