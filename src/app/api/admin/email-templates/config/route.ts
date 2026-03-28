import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// Ensure table exists
async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_config (
      config_key VARCHAR(100) PRIMARY KEY,
      config_value TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

// GET /api/admin/email-templates/config
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureTable();

    const [rows] = await pool.query(
      'SELECT config_key, config_value FROM email_config'
    ) as [any[], any];

    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.config_key] = row.config_value || '';
    }

    return NextResponse.json({
      logoUrl: config.logoUrl || '',
      adminEmail: config.adminEmail || '',
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Email config GET error:', error);
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}

// PUT /api/admin/email-templates/config
export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureTable();

    const body = await request.json();
    const { logoUrl, adminEmail } = body;

    // Upsert each config key
    const upsert = `INSERT INTO email_config (config_key, config_value) VALUES (?, ?)
                     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`;

    await pool.query(upsert, ['logoUrl', logoUrl || '']);
    await pool.query(upsert, ['adminEmail', adminEmail || '']);

    // Also update .env ADMIN_EMAIL if changed
    if (adminEmail) {
      process.env.ADMIN_EMAIL = adminEmail;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Email config PUT error:', error);
    return NextResponse.json({ error: 'שגיאה בשמירה' }, { status: 500 });
  }
}
