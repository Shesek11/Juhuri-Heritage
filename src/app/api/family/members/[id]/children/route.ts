import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [children] = await pool.query(`
      SELECT pc.*, fm.first_name, fm.last_name, fm.photo_url, fm.gender, fm.birth_date
      FROM family_parent_child pc
      JOIN family_members fm ON pc.child_id = fm.id
      WHERE pc.parent_id = ?
      ORDER BY fm.birth_date
    `, [id]) as any[];
    return NextResponse.json(children);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }
}
