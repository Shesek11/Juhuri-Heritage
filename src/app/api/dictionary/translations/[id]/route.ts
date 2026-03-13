import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

// PUT /api/dictionary/translations/:id - Update translation (admin direct edit)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireApprover(request);
    const { id } = await params;
    const { hebrew, latin, cyrillic, dialectId } = await request.json();

    if (!hebrew) {
      return NextResponse.json({ error: 'נדרש תרגום עברי' }, { status: 400 });
    }

    const updates = ['hebrew = ?'];
    const values: any[] = [hebrew];

    if (latin !== undefined) {
      updates.push('latin = ?');
      values.push(latin);
    }
    if (cyrillic !== undefined) {
      updates.push('cyrillic = ?');
      values.push(cyrillic);
    }
    if (dialectId !== undefined) {
      updates.push('dialect_id = ?');
      values.push(dialectId);
    }

    values.push(id);

    await pool.query(
      `UPDATE translations SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Update translation error:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון תרגום' }, { status: 500 });
  }
}
