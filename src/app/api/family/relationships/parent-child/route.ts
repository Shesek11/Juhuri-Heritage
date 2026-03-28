import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { parent_id, child_id, relationship_type, notes } = await request.json();

    const [parent] = await pool.query('SELECT id, first_name, last_name FROM family_members WHERE id = ?', [parent_id]) as any[];
    const [child] = await pool.query('SELECT id, first_name, last_name FROM family_members WHERE id = ?', [child_id]) as any[];

    if (parent.length === 0 || child.length === 0) {
      return NextResponse.json({ error: 'הורה או ילד לא נמצאו' }, { status: 400 });
    }

    const [result] = await pool.query(`
      INSERT INTO family_parent_child (parent_id, child_id, relationship_type, notes)
      VALUES (?, ?, ?, ?)
    `, [parent_id, child_id, relationship_type || 'biological', notes]) as any[];

    await logEvent('FAMILY_RELATION_ADDED', `קשר הורה-ילד: ${parent[0].first_name} → ${child[0].first_name}`, user, { relation_id: result.insertId, parent_id, child_id, relationship_type }, request);

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 });
  } catch (error: any) {
    if (error instanceof Response) return error;
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'קשר זה כבר קיים' }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: 'Failed to create relationship' }, { status: 500 });
  }
}
