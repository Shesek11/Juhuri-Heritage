import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApprover(request);
    const { id } = await params;
    const { term } = await request.json();

    if (term === undefined) {
      return NextResponse.json({ error: 'חסר שדה term' }, { status: 400 });
    }

    await pool.query(
      'UPDATE dictionary_entries SET hebrew_script = ? WHERE id = ?',
      [term.trim(), id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update term error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון' }, { status: 500 });
  }
}
