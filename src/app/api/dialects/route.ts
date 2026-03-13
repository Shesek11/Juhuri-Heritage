import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAdmin } from '@/src/lib/auth';

// GET /api/dialects
export async function GET() {
  try {
    const [dialects] = await pool.query('SELECT * FROM dialects ORDER BY id');
    return NextResponse.json({ dialects });
  } catch (err: any) {
    console.error('Get dialects error:', err);
    return NextResponse.json(
      { error: 'שגיאה בטעינת ניבים', details: err.message },
      { status: 500 }
    );
  }
}

// POST /api/dialects (Admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'נדרש שם לניב' }, { status: 400 });
    }

    const [result]: any = await pool.query(
      'INSERT INTO dialects (name, description) VALUES (?, ?)',
      [name, description || '']
    );

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
      ['DIALECT_ADDED', `נוסף ניב חדש: ${description || name}`, user.id, user.name, JSON.stringify({ name })]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Add dialect error:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת ניב' }, { status: 500 });
  }
}
