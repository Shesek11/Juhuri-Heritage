import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

// PUT /api/dictionary/entries/:term/approve
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprover(request);
    const { id: term } = await params;
    const decodedTerm = decodeURIComponent(term);

    await pool.query(
      `UPDATE dictionary_entries
       SET status = 'active', approved_by = ?, approved_at = NOW()
       WHERE term = ?`,
      [user.id, decodedTerm]
    );

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
      ['ENTRY_APPROVED', `אושרה מילה: ${decodedTerm}`, user.id, user.name, JSON.stringify({ term: decodedTerm })]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'שגיאה באישור מילה' }, { status: 500 });
  }
}
