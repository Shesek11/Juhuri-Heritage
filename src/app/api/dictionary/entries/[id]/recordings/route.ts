import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entryId = parseInt(id, 10);
    if (isNaN(entryId)) {
      return NextResponse.json({ recordings: [] });
    }

    const [rows] = await pool.query(
      `SELECT r.id, r.audio_url, r.dialect_id, d.name as dialect_name,
              u.name as contributor_name, r.status
       FROM recordings r
       LEFT JOIN dialects d ON d.id = r.dialect_id
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.entry_id = ? AND r.status = 'approved'
       ORDER BY r.created_at DESC`,
      [entryId]
    );

    return NextResponse.json({ recordings: rows });
  } catch {
    return NextResponse.json({ recordings: [] });
  }
}
