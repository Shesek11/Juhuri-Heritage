import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync, copyFileSync } from 'fs';

const ALLOWED_TYPES = /jpeg|jpg|png|webp|svg\+xml|svg|x-icon|ico/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// POST /api/admin/seo/assets/:type - Upload an asset (og-image, logo, favicon)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const user = await requireAdmin(request);
    const { type } = await params;

    const validTypes = ['og-image', 'logo', 'favicon'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'סוג נכס לא תקין' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'הקובץ גדול מדי. הגודל המקסימלי הוא 5MB' }, { status: 400 });
    }

    // Check file type
    const ext = path.extname(file.name).toLowerCase().replace('.', '');
    if (!ALLOWED_TYPES.test(ext) && !ALLOWED_TYPES.test(file.type)) {
      return NextResponse.json({ error: 'סוג קובץ לא נתמך' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = `${type}${path.extname(file.name).toLowerCase()}`;

    const dir = path.join(process.cwd(), 'public/images');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, buffer);

    const assetUrl = `/images/${filename}`;
    const settingKey = type === 'og-image' ? 'og_image'
      : type === 'logo' ? 'site_logo'
      : 'favicon';

    await pool.query(
      `INSERT INTO seo_settings (setting_key, setting_value, updated_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
          setting_value = VALUES(setting_value),
          updated_by = VALUES(updated_by),
          updated_at = CURRENT_TIMESTAMP`,
      [settingKey, assetUrl, (user as any).id]
    );

    // Also copy to dist if it exists
    const distDir = path.join(process.cwd(), 'dist/images');
    if (existsSync(path.dirname(distDir))) {
      if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
      copyFileSync(filePath, path.join(distDir, filename));
    }

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata)
       VALUES ('SEO_ASSET_CHANGED', ?, ?, ?, ?)`,
      [`נכס ${type} עודכן`, (user as any).id, (user as any).name, JSON.stringify({ url: assetUrl })]
    );

    return NextResponse.json({ success: true, url: assetUrl });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Asset upload error:', error);
    return NextResponse.json({ error: 'שגיאה בשמירת נכס' }, { status: 500 });
  }
}
