import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

// PUT /api/dictionary/entries/:id/approve is handled by entries/[id]/approve/route.ts
// This handles DELETE /api/dictionary/entries/:id (by term legacy — this uses id param)

// Note: The Express routes use :term for approve and delete. We map to [id] here.
// If the frontend uses term-based URLs, adjust accordingly.

// DELETE /api/dictionary/entries/:term — delete entry by term
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireApprover(request);
    const { id: term } = await params;
    const decodedTerm = decodeURIComponent(term);

    const [entries] = await pool.query('SELECT * FROM dictionary_entries WHERE hebrew_script = ?', [decodedTerm]) as any[];
    const entry = entries[0];

    if (!entry) {
      return NextResponse.json({ error: 'מילה לא נמצאה' }, { status: 404 });
    }

    await pool.query('DELETE FROM dictionary_entries WHERE hebrew_script = ?', [decodedTerm]);

    const eventType = entry.status === 'pending' ? 'ENTRY_REJECTED' : 'ENTRY_DELETED';
    const description = entry.status === 'pending' ? `נדחתה הצעה למילה: ${decodedTerm}` : `נמחקה מילה מהמאגר: ${decodedTerm}`;

    await logEvent(eventType, description, user, { term: decodedTerm }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'שגיאה במחיקת מילה' }, { status: 500 });
  }
}
