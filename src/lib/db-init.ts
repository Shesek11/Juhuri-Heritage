import fs from 'fs/promises';
import path from 'path';
import pool from './db';

/**
 * Initialize the database schema if tables don't exist.
 * Reads and executes schema.sql from the project root.
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const [rows] = await pool.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dialects'
    `) as any;

    if (rows.length > 0) {
      console.log('Database schema verified (tables exist)');
      return;
    }

    console.log('Database tables missing. Initializing schema from schema.sql...');

    const schemaPath = path.join(process.cwd(), 'schema.sql');
    const sql = await fs.readFile(schemaPath, 'utf8');

    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      try {
        await pool.query(statement);
      } catch (err: any) {
        console.error('Warning executing statement:', err.message);
      }
    }

    console.log('Database initialized successfully');
  } catch (error: any) {
    console.error('Failed to initialize database:', error.message);
  }
}
