import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// GET /api/family/members
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search');
    const alive_only = request.nextUrl.searchParams.get('alive_only');

    let query = 'SELECT * FROM family_members WHERE 1=1';
    const params: any[] = [];

    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR maiden_name LIKE ? OR nickname LIKE ? OR first_name_ru LIKE ? OR last_name_ru LIKE ? OR maiden_name_ru LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (alive_only === 'true') {
      query += ' AND is_alive = 1';
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const [members] = await pool.query(query, params) as any[];
    return NextResponse.json(members);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch family members' }, { status: 500 });
  }
}

// POST /api/family/members
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const {
      first_name, last_name, maiden_name, nickname, previous_name, title,
      first_name_ru, last_name_ru, maiden_name_ru,
      gender, birth_date, death_date,
      birth_place, death_place, current_residence,
      birth_city, birth_country, death_city, death_country, residence_city, residence_country,
      birth_city_ru, birth_country_ru, death_city_ru, death_country_ru, residence_city_ru, residence_country_ru,
      biography, photo_url, is_alive
    } = await request.json();

    const [result] = await pool.query(`
      INSERT INTO family_members
      (user_id, first_name, last_name, maiden_name, nickname, previous_name, title,
       first_name_ru, last_name_ru, maiden_name_ru,
       gender, birth_date, death_date,
       birth_place, death_place, current_residence,
       birth_city, birth_country, death_city, death_country, residence_city, residence_country,
       birth_city_ru, birth_country_ru, death_city_ru, death_country_ru, residence_city_ru, residence_country_ru,
       biography, photo_url, is_alive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id, first_name, last_name, maiden_name, nickname, previous_name, title,
      first_name_ru || null, last_name_ru || null, maiden_name_ru || null,
      gender, birth_date || null, death_date || null,
      birth_place, death_place, current_residence,
      birth_city || null, birth_country || null, death_city || null, death_country || null,
      residence_city || null, residence_country || null,
      birth_city_ru || null, birth_country_ru || null, death_city_ru || null, death_country_ru || null,
      residence_city_ru || null, residence_country_ru || null,
      biography, photo_url, is_alive ? 1 : 0
    ]) as any[];

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error(error);
    return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });
  }
}
