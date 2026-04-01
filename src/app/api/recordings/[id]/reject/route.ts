import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';
import { fireEventEmail } from '@/src/lib/email';

// POST /api/recordings/:id/reject - Reject and delete a recording
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprover(request);
    const { id } = await params;

    // Get recording + user + entry info before deleting
    const [recordings]: any = await pool.query(
      `SELECT ar.file_url, ar.user_id, ar.entry_id, de.hebrew_script as term, u.email, u.name
       FROM audio_recordings ar
       LEFT JOIN dictionary_entries de ON ar.entry_id = de.id
       LEFT JOIN users u ON ar.user_id = u.id
       WHERE ar.id = ?`, [id]
    );
    if (recordings.length > 0) {
      const filePath = path.join(process.cwd(), 'public', recordings[0].file_url);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }

    // Notify the uploader before deleting
    if (recordings[0]?.email) {
      fireEventEmail('recording-rejected', {
        to: recordings[0].email,
        variables: { userName: recordings[0].name || '', term: recordings[0].term || '' },
      });
    }

    await pool.query('DELETE FROM audio_recordings WHERE id = ?', [id]);

    await logEvent('RECORDING_REJECTED', `הקלטה ${id} נדחתה ונמחקה`, user, { recordingId: id }, request);

    return NextResponse.json({ success: true, message: 'ההקלטה נדחתה ונמחקה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error rejecting recording:', error);
    return NextResponse.json({ error: 'שגיאה בדחיית הקלטה' }, { status: 500 });
  }
}
