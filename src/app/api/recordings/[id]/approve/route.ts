import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';

// POST /api/recordings/:id/approve - Approve a recording
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApprover(request);
    const { id } = await params;

    // Get recording + user + entry info before approving
    const [recordings] = await pool.query(
      `SELECT ar.user_id, ar.entry_id, de.hebrew_script as term, u.email, u.name
       FROM audio_recordings ar
       LEFT JOIN dictionary_entries de ON ar.entry_id = de.id
       LEFT JOIN users u ON ar.user_id = u.id
       WHERE ar.id = ?`, [id]
    ) as any[];

    await pool.query("UPDATE audio_recordings SET status = 'approved' WHERE id = ?", [id]);

    // Notify the uploader
    if (recordings[0]?.email) {
      fireEventEmail('recording-approved', {
        to: recordings[0].email,
        variables: { userName: recordings[0].name || '', term: recordings[0].term || '' },
      });
    }

    return NextResponse.json({ success: true, message: 'ההקלטה אושרה' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error approving recording:', error);
    return NextResponse.json({ error: 'שגיאה באישור הקלטה' }, { status: 500 });
  }
}
