import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';

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
       WHERE hebrew_script = ?`,
      [user.id, decodedTerm]
    );

    await logEvent('ENTRY_APPROVED', `אושרה מילה: ${decodedTerm}`, user, { term: decodedTerm }, request);

    fireEventEmail('entry-approved', { variables: { term: decodedTerm } });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'שגיאה באישור מילה' }, { status: 500 });
  }
}
