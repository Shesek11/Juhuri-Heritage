import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/src/lib/auth';
import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';

const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = /jpeg|jpg|png|webp|gif/;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'לא נבחר קובץ' }, { status: 400 });
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'הקובץ גדול מדי. הגודל המקסימלי הוא 15MB' },
        { status: 400 }
      );
    }

    // Check file type
    const ext = path.extname(file.name).toLowerCase().replace('.', '');
    if (!ALLOWED_TYPES.test(ext) || !ALLOWED_TYPES.test(file.type)) {
      return NextResponse.json(
        { error: 'רק קבצי תמונה (jpg, png, webp, gif) מותרים' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + path.extname(file.name);
    await fs.writeFile(path.join(uploadDir, filename), buffer);

    const fileUrl = `/uploads/${filename}`;
    console.log('Upload successful:', fileUrl);

    return NextResponse.json({
      success: true,
      url: fileUrl,
      filename,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'שגיאה בהעלאת הקובץ' }, { status: 500 });
  }
}
