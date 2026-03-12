import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import path from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

// GET /api/admin/seo/llms - Get llms.txt content
export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);

    const [rows] = await pool.query(
      `SELECT setting_value FROM seo_settings WHERE setting_key = 'llms_txt'`
    ) as [any[], any];

    if (rows.length > 0) {
      return NextResponse.json({ content: rows[0].setting_value, source: 'database' });
    }

    // Fallback to file
    const filePath = path.join(process.cwd(), 'public/llms.txt');
    if (existsSync(filePath)) {
      return NextResponse.json({ content: readFileSync(filePath, 'utf8'), source: 'file' });
    }

    return NextResponse.json({ content: '', source: 'none' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('llms.txt read error:', error);
    return NextResponse.json({ error: 'שגיאה בקריאת llms.txt' }, { status: 500 });
  }
}

// PUT /api/admin/seo/llms - Update llms.txt
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
       VALUES ('llms_txt', ?, ?)
       ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value),
          updated_by = VALUES(updated_by),
          updated_at = CURRENT_TIMESTAMP`,
      [content, (user as any).id]
    );

    // Write to public for static serving
    const publicPath = path.join(process.cwd(), 'public/llms.txt');
    writeFileSync(publicPath, content, 'utf8');

    // Write to dist too if it exists
    const distPath = path.join(process.cwd(), 'dist/llms.txt');
    if (existsSync(path.dirname(distPath))) {
      writeFileSync(distPath, content, 'utf8');
    }

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
       VALUES ('SEO_LLMS_CHANGED', ?, ?, ?, ?)`,
      ['llms.txt עודכן', (user as any).id, (user as any).name, JSON.stringify({ length: content.length })]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('llms.txt write error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון llms.txt' }, { status: 500 });
  }
}
