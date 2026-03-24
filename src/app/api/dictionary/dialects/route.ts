import { NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET() {
  try {
    const [dialects] = await pool.query('SELECT id, name, description FROM dialects ORDER BY name') as any[];
    return NextResponse.json(dialects);
  } catch (error) {
    console.error('Get dialects error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת ניבים' }, { status: 500 });
  }
}
