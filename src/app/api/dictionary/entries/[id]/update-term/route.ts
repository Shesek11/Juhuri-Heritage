import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApprover(request);
    const { id } = await params;
    const { term } = await request.json();

    if (term === undefined) {
      return NextResponse.json({ error: 'חסר שדה term' }, { status: 400 });
    }

    await pool.query(
      'UPDATE dictionary_entries SET hebrew_script = ? WHERE id = ?',
      [term.trim(), id]
    );

    await logEvent('TERM_UPDATED', `עדכון מונח ערך ${id}: ${term.trim()}`, user, { entryId: id, newTerm: term.trim() }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update term error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון' }, { status: 500 });
  }
}
