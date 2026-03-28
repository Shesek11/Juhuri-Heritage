import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

// GET /api/recordings/admin/pending - Get pending recordings for moderation
export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const [recordings] = await pool.query(`
      SELECT
        ar.*,
        de.hebrew_script as entry_term
      FROM audio_recordings ar
      LEFT JOIN dictionary_entries de ON ar.entry_id = de.id
      WHERE ar.status = 'pending'
      ORDER BY ar.created_at ASC
    `);

    return NextResponse.json({ recordings });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching pending recordings:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הקלטות ממתינות' }, { status: 500 });
  }
}
