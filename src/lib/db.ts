import mysql from 'mysql2/promise';

// Load .env in development (Next.js loads it automatically in most cases,
// but this ensures it works when imported from custom server.js)
if (!process.env.DB_HOST) {
  try {
    require('dotenv').config();
  } catch {
    // dotenv may not be available in production standalone build
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE || process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE || '15'),
  queueLimit: 100,
  enableKeepAlive: true,
  charset: 'utf8mb4',
});

// Test connection on first import
pool
  .getConnection()
  .then((conn) => {
    console.log('Database connected successfully');
    conn.release();
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

export default pool;
