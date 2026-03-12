import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rootId: string }> }
) {
  try {
    const [allMembers] = await pool.query(`
      SELECT id, user_id, first_name, last_name, maiden_name,
             gender, photo_url, birth_date, is_alive
      FROM family_members
      LIMIT 1000
    `) as any[];

    const [parentChildRels] = await pool.query(`
      SELECT parent_id, child_id, relationship_type FROM family_parent_child
    `) as any[];

    const [partnerships] = await pool.query(`
      SELECT person1_id, person2_id, status FROM family_partnerships
    `) as any[];

    return NextResponse.json({
      members: allMembers,
      parentChild: parentChildRels,
      partnerships: partnerships
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch tree' }, { status: 500 });
  }
}
