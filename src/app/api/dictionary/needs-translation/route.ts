import { NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET() {
  try {
    const [entries] = await pool.query(
      `SELECT de.id, de.term, de.detected_language
       FROM dictionary_entries de
       LEFT JOIN translations t ON de.id = t.entry_id
       WHERE de.status = 'active' AND t.id IS NULL
       LIMIT 5`
    ) as any[];
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Needs translation error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים' }, { status: 500 });
  }
}
