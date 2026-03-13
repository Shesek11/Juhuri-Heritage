import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

// GET /api/recordings/:entryId - Get approved recordings for an entry
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: entryId } = await params;

    const [recordings] = await pool.query(`
      SELECT
        ar.id,
        ar.file_url,
        ar.dialect_id,
        ar.likes_count,
        ar.duration_seconds,
        ar.created_at,
        ar.user_id,
        u.display_name as user_display_name,
        d.name as dialect_name
      FROM audio_recordings ar
      LEFT JOIN users u ON ar.user_id = u.id
      LEFT JOIN dialects d ON ar.dialect_id = d.id
      WHERE ar.entry_id = ? AND ar.status = 'approved'
      ORDER BY ar.likes_count DESC, ar.created_at DESC
    `, [entryId]);

    return NextResponse.json({ recordings });
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הקלטות' }, { status: 500 });
  }
}
