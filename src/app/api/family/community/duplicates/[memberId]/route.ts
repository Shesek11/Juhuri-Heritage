import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    await requireAuth(request);
    const { memberId } = await params;

    const [members] = await pool.query(
      'SELECT * FROM family_members WHERE id = ?', [memberId]
    ) as any[];

    if (members.length === 0) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const member = members[0];

    const [duplicates] = await pool.query(`
      SELECT *,
          (
              (SOUNDEX(last_name) = SOUNDEX(?)) * 30 +
              (SOUNDEX(first_name) = SOUNDEX(?)) * 30 +
              (gender = ?) * 10 +
              (YEAR(birth_date) = YEAR(?)) * 30
          ) as similarity_score
      FROM family_members
      WHERE id != ?
        AND merged_into IS NULL
        AND (
            SOUNDEX(last_name) = SOUNDEX(?)
            OR (SOUNDEX(first_name) = SOUNDEX(?) AND YEAR(birth_date) = YEAR(?))
        )
      HAVING similarity_score >= 50
      ORDER BY similarity_score DESC
      LIMIT 10
    `, [
      member.last_name, member.first_name, member.gender, member.birth_date,
      memberId,
      member.last_name, member.first_name, member.birth_date
    ]) as any[];

    return NextResponse.json(duplicates);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error finding duplicates:', error);
    return NextResponse.json({ error: 'Failed to find duplicates' }, { status: 500 });
  }
}
