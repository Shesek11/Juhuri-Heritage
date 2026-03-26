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
      return NextResponse.json({ relatedWords: [] });
    }

    const [rows] = await pool.query(
      `SELECT de.id, de.term, t.hebrew, de.part_of_speech as partOfSpeech
       FROM related_words rw
       JOIN dictionary_entries de ON de.id = rw.related_entry_id
       LEFT JOIN translations t ON t.entry_id = de.id
       WHERE rw.entry_id = ? AND de.status = 'active'
       GROUP BY de.id
       LIMIT 10`,
      [entryId]
    );

    return NextResponse.json({ relatedWords: rows });
  } catch {
    return NextResponse.json({ relatedWords: [] });
  }
}
