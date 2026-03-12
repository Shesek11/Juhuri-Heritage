import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [myParents] = await pool.query(`
      SELECT parent_id, relationship_type FROM family_parent_child WHERE child_id = ?
    `, [id]) as any[];

    if (myParents.length === 0) {
      return NextResponse.json({ full: [], half: [], step: [] });
    }

    const parentIds = myParents.map((p: any) => p.parent_id);

    const [potentialSiblings] = await pool.query(`
      SELECT DISTINCT
          pc.child_id,
          fm.*,
          GROUP_CONCAT(DISTINCT pc.parent_id) as shared_parents
      FROM family_parent_child pc
      JOIN family_members fm ON pc.child_id = fm.id
      WHERE pc.parent_id IN (?) AND pc.child_id != ?
      GROUP BY pc.child_id
    `, [parentIds, id]) as any[];

    const full: any[] = [];
    const half: any[] = [];
    const step: any[] = [];

    for (const sibling of potentialSiblings) {
      const sharedParentIds = sibling.shared_parents.split(',').map(Number);
      const sharedCount = sharedParentIds.filter((pid: number) => parentIds.includes(pid)).length;

      if (sharedCount >= 2) {
        full.push(sibling);
      } else if (sharedCount === 1) {
        half.push(sibling);
      }
    }

    return NextResponse.json({ full, half, step });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to calculate siblings' }, { status: 500 });
  }
}
