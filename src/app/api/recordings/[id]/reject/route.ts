import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

// POST /api/recordings/:id/reject - Reject and delete a recording
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApprover(request);
    const { id } = await params;

    // Get file path to delete
    const [recordings]: any = await pool.query('SELECT file_url FROM audio_recordings WHERE id = ?', [id]);
    if (recordings.length > 0) {
      const filePath = path.join(process.cwd(), 'public', recordings[0].file_url);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }

    await pool.query('DELETE FROM audio_recordings WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'ההקלטה נדחתה ונמחקה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error rejecting recording:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית הקלטה' }, { status: 500 });
  }
}
