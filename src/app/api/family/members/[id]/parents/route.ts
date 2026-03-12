import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [parents] = await pool.query(`
      SELECT pc.*, fm.first_name, fm.last_name, fm.photo_url, fm.gender
      FROM family_parent_child pc
      JOIN family_members fm ON pc.parent_id = fm.id
      WHERE pc.child_id = ?
    `, [id]) as any[];
    return NextResponse.json(parents);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch parents' }, { status: 500 });
  }
}
