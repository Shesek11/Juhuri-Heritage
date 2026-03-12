import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';

const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads/recordings');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];

// POST /api/recordings/upload - Upload a new audio recording for an entry
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const userId = user ? user.id : null;

    const formData = await request.formData();
    const audio = formData.get('audio') as File | null;
    const entryId = formData.get('entryId') as string | null;
    const dialectId = formData.get('dialectId') as string | null;
    const guestName = formData.get('guestName') as string | null;
    const duration = formData.get('duration') as string | null;

    if (!audio) {
      return NextResponse.json({ error: 'לא התקבל קובץ אודיו' }, { status: 400 });
    }

    if (!entryId) {
      return NextResponse.json({ error: 'חסר מזהה ערך' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(audio.type)) {
      return NextResponse.json(
        { error: 'סוג קובץ לא נתמך. יש להעלות קובץ אודיו.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (audio.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'הקובץ גדול מדי (מקסימום 10MB)' },
        { status: 400 }
      );
    }

    // Ensure uploads directory exists
    await mkdir(UPLOADS_DIR, { recursive: true });

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(audio.name) || '.webm';
    const filename = `recording-${uniqueSuffix}${ext}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Write file to disk
    const bytes = await audio.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const fileUrl = `/uploads/recordings/${filename}`;
    const status = userId ? 'approved' : 'pending'; // Guests need approval

    const [result]: any = await pool.query(`
      INSERT INTO audio_recordings (entry_id, dialect_id, user_id, file_url, status, duration_seconds)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      entryId,
      dialectId || null,
      userId || null,
      fileUrl,
      status,
      duration || null,
    ]);

    return NextResponse.json(
      {
        success: true,
        id: result.insertId,
        fileUrl,
        status,
        message: status === 'approved' ? 'ההקלטה נשמרה!' : 'ההקלטה נשלחה לאישור',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error uploading recording:', error);
    return NextResponse.json({ error: 'שגיאה בהעלאת ההקלטה' }, { status: 500 });
  }
}
