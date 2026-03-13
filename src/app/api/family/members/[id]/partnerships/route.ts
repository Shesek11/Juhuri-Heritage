import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [partnerships] = await pool.query(`
      SELECT
          p.*,
          CASE WHEN p.person1_id = ? THEN fm2.id ELSE fm1.id END as partner_id,
          CASE WHEN p.person1_id = ? THEN fm2.first_name ELSE fm1.first_name END as partner_first_name,
          CASE WHEN p.person1_id = ? THEN fm2.last_name ELSE fm1.last_name END as partner_last_name,
          CASE WHEN p.person1_id = ? THEN fm2.photo_url ELSE fm1.photo_url END as partner_photo_url
      FROM family_partnerships p
      JOIN family_members fm1 ON p.person1_id = fm1.id
      JOIN family_members fm2 ON p.person2_id = fm2.id
      WHERE p.person1_id = ? OR p.person2_id = ?
      ORDER BY p.start_date DESC
    `, [id, id, id, id, id, id]) as any[];
    return NextResponse.json(partnerships);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch partnerships' }, { status: 500 });
  }
}
