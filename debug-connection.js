require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
    console.log('Testing DB connection...');
    console.log('Host:', process.env.DB_HOST);
    console.log('User:', process.env.DB_USERNAME);
    console.log('Database:', process.env.DB_DATABASE);

    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            port: process.env.DB_PORT || 3306
        });
        console.log('✅ Connection successful!');
        await connection.end();
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    }
}

testConnection();
