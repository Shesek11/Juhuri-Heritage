import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import path from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// GET /api/admin/seo/robots - Get current robots.txt content
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    // Check DB first
    const [rows] = await pool.query(
      `SELECT setting_value FROM seo_settings WHERE setting_key = 'robots_txt'`
    ) as [any[], any];

    if (rows.length > 0) {
      return NextResponse.json({ content: rows[0].setting_value, source: 'database' });
    }

    // Fall back to file
    const robotsPath = path.join(process.cwd(), 'dist/robots.txt');
    const publicPath = path.join(process.cwd(), 'public/robots.txt');
    const filePath = existsSync(robotsPath) ? robotsPath : publicPath;

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8');
      return NextResponse.json({ content, source: 'file' });
    }

    return NextResponse.json({ content: '', source: 'none' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Robots.txt read error:', error);
    return NextResponse.json({ error: 'שגיאה בקריאת robots.txt' }, { status: 500 });
  }
}

// PUT /api/admin/seo/robots - Update robots.txt
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const body = await request.json();
    const { content } = body;

    if (typeof content !== 'string') {
      return NextResponse.json({ error: 'נדרש תוכן' }, { status: 400 });
    }

    // Save to DB
    await pool.query(
      `INSERT INTO seo_settings (setting_key, setting_value, updated_by)
       VALUES ('robots_txt', ?, ?)
       ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value),
          updated_by = VALUES(updated_by),
          updated_at = CURRENT_TIMESTAMP`,
      [content, (user as any).id]
    );

    // Also write to file for immediate effect
    const publicPath = path.join(process.cwd(), 'public/robots.txt');
    writeFileSync(publicPath, content, 'utf8');

    // Write to dist too if it exists
    const distPath = path.join(process.cwd(), 'dist/robots.txt');
    if (existsSync(path.dirname(distPath))) {
      writeFileSync(distPath, content, 'utf8');
    }

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
       VALUES ('SEO_ROBOTS_CHANGED', ?, ?, ?, ?)`,
      ['robots.txt עודכן', (user as any).id, (user as any).name, JSON.stringify({ length: content.length })]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Robots.txt write error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון robots.txt' }, { status: 500 });
  }
}
