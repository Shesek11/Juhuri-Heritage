const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mysql = require('mysql2/promise');

console.log('--- Environment Check ---');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USERNAME:', process.env.DB_USERNAME); // Should be DB_USER usually? In generated env it was DB_USERNAME?
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '****' : 'MISSING');
console.log('DB_DATABASE:', process.env.DB_DATABASE);
console.log('DB_PORT:', process.env.DB_PORT);

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            charset: 'utf8mb4'
        });

        const conn = await pool.getConnection();
        console.log('✅ Connection successful!');

        const [rows] = await conn.query('SELECT * FROM dialects');
        console.log(`✅ Loaded ${rows.length} dialects.`);
        conn.release();
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
})();
