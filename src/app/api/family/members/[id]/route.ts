import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// GET /api/family/members/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [members] = await pool.query('SELECT * FROM family_members WHERE id = ?', [id]) as any[];
    if (members.length === 0) return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    const member = members[0];

    const [parents] = await pool.query(`
      SELECT pc.*, fm.*
      FROM family_parent_child pc
      JOIN family_members fm ON pc.parent_id = fm.id
      WHERE pc.child_id = ?
    `, [id]) as any[];

    const [children] = await pool.query(`
      SELECT pc.*, fm.*
      FROM family_parent_child pc
      JOIN family_members fm ON pc.child_id = fm.id
      WHERE pc.parent_id = ?
    `, [id]) as any[];

    const [partnerships] = await pool.query(`
      SELECT
          p.*,
          CASE WHEN p.person1_id = ? THEN fm2.id ELSE fm1.id END as partner_id,
          CASE WHEN p.person1_id = ? THEN fm2.first_name ELSE fm1.first_name END as partner_first_name,
          CASE WHEN p.person1_id = ? THEN fm2.last_name ELSE fm1.last_name END as partner_last_name,
          CASE WHEN p.person1_id = ? THEN fm2.photo_url ELSE fm1.photo_url END as partner_photo_url,
          CASE WHEN p.person1_id = ? THEN fm2.gender ELSE fm1.gender END as partner_gender
      FROM family_partnerships p
      JOIN family_members fm1 ON p.person1_id = fm1.id
      JOIN family_members fm2 ON p.person2_id = fm2.id
      WHERE p.person1_id = ? OR p.person2_id = ?
      ORDER BY p.start_date DESC
    `, [id, id, id, id, id, id, id]) as any[];

    return NextResponse.json({
      ...member,
      parents: parents.map((p: any) => ({
        id: p.id,
        parent_id: p.parent_id,
        relationship_type: p.relationship_type,
        parent: {
          id: p.parent_id,
          first_name: p.first_name,
          last_name: p.last_name,
          photo_url: p.photo_url,
          gender: p.gender
        }
      })),
      children: children.map((c: any) => ({
        id: c.id,
        child_id: c.child_id,
        relationship_type: c.relationship_type,
        child: {
          id: c.child_id,
          first_name: c.first_name,
          last_name: c.last_name,
          photo_url: c.photo_url,
          gender: c.gender
        }
      })),
      partnerships: partnerships.map((p: any) => ({
        id: p.id,
        status: p.status,
        start_date: p.start_date,
        end_date: p.end_date,
        marriage_place: p.marriage_place,
        partner: {
          id: p.partner_id,
          first_name: p.partner_first_name,
          last_name: p.partner_last_name,
          photo_url: p.partner_photo_url,
          gender: p.partner_gender
        }
      }))
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch member details' }, { status: 500 });
  }
}

// PUT /api/family/members/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const [existing] = await pool.query('SELECT user_id FROM family_members WHERE id = ?', [id]) as any[];
    if (existing.length === 0) {
      return NextResponse.json({ error: 'בן משפחה לא נמצא' }, { status: 404 });
    }
    if (existing[0].user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה לערוך בן משפחה זה' }, { status: 403 });
    }

    const {
      first_name, last_name, maiden_name, nickname, previous_name, title,
      first_name_ru, last_name_ru, maiden_name_ru,
      gender, birth_date, death_date,
      birth_place, death_place, current_residence,
      birth_city, birth_country, death_city, death_country, residence_city, residence_country,
      birth_city_ru, birth_country_ru, death_city_ru, death_country_ru, residence_city_ru, residence_country_ru,
      biography, photo_url, is_alive
    } = await request.json();

    await pool.query(`
      UPDATE family_members SET
      first_name=?, last_name=?, maiden_name=?, nickname=?, previous_name=?, title=?,
      first_name_ru=?, last_name_ru=?, maiden_name_ru=?,
      gender=?, birth_date=?, death_date=?,
      birth_place=?, death_place=?, current_residence=?,
      birth_city=?, birth_country=?, death_city=?, death_country=?,
      residence_city=?, residence_country=?,
      birth_city_ru=?, birth_country_ru=?, death_city_ru=?, death_country_ru=?,
      residence_city_ru=?, residence_country_ru=?,
      biography=?, photo_url=?, is_alive=?
      WHERE id=?
    `, [
      first_name, last_name, maiden_name, nickname, previous_name, title,
      first_name_ru || null, last_name_ru || null, maiden_name_ru || null,
      gender, birth_date || null, death_date || null,
      birth_place, death_place, current_residence,
      birth_city || null, birth_country || null, death_city || null, death_country || null,
      residence_city || null, residence_country || null,
      birth_city_ru || null, birth_country_ru || null, death_city_ru || null, death_country_ru || null,
      residence_city_ru || null, residence_country_ru || null,
      biography, photo_url, is_alive ? 1 : 0, id
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 });
  }
}

// DELETE /api/family/members/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    const [existing] = await pool.query('SELECT user_id FROM family_members WHERE id = ?', [id]) as any[];
    if (existing.length === 0) {
      return NextResponse.json({ error: 'בן משפחה לא נמצא' }, { status: 404 });
    }
    if (existing[0].user_id !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאה למחוק בן משפחה זה' }, { status: 403 });
    }

    await pool.query('DELETE FROM family_members WHERE id = ?', [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
