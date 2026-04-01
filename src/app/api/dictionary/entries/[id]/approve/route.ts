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

    // Get contributor info before approving
    const [entryRows] = await pool.query(
      'SELECT id, contributor_id FROM dictionary_entries WHERE hebrew_script = ? LIMIT 1',
      [decodedTerm]
    ) as any[];

    await pool.query(
      `UPDATE dictionary_entries
       SET status = 'active', approved_by = ?, approved_at = NOW()
       WHERE hebrew_script = ?`,
      [user.id, decodedTerm]
    );

    await logEvent('ENTRY_APPROVED', `אושרה מילה: ${decodedTerm}`, user, { term: decodedTerm }, request);

    // Notify contributor if they are a registered user
    if (entryRows[0]?.contributor_id) {
      const [contributorRows] = await pool.query('SELECT email, name FROM users WHERE id = ?', [entryRows[0].contributor_id]) as any[];
      if (contributorRows.length && contributorRows[0].email) {
        fireEventEmail('entry-approved', { to: contributorRows[0].email, variables: { term: decodedTerm, userName: contributorRows[0].name || '' } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Approve error:', error);
    return NextResponse.json({ error: 'שגיאה באישור מילה' }, { status: 500 });
  }
}
