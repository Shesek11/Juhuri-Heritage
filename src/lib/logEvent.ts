import pool from './db';
import { NextRequest } from 'next/server';
import { AuthUser } from './auth';

export async function logEvent(
  eventType: string,
  description: string,
  user?: AuthUser | null,
  metadata?: Record<string, any> | null,
  request?: NextRequest
) {
  try {
    const ip = request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        eventType,
        description,
        user?.id || null,
        user?.name || null,
        metadata ? JSON.stringify(metadata) : null,
        ip,
      ]
    );
  } catch (err: any) {
    console.error('Failed to log event:', eventType, err.message);
  }
}
