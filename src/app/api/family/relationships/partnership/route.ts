import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request);
    const { person1_id, person2_id, status, start_date, end_date, marriage_place, notes } = await request.json();

    const p1 = Math.min(person1_id, person2_id);
    const p2 = Math.max(person1_id, person2_id);

    const [result] = await pool.query(`
      INSERT INTO family_partnerships (person1_id, person2_id, status, start_date, end_date, marriage_place, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [p1, p2, status, start_date || null, end_date || null, marriage_place, notes]) as any[];

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return NextResponse.json({ error: 'Failed to create partnership' }, { status: 500 });
  }
}
