import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// GET /api/family/community/suggestions
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const isAdmin = user.role === 'admin';

    let query = `
      SELECT
          ms.*,
          m1.first_name as member1_first, m1.last_name as member1_last,
          m1.birth_date as member1_birth, m1.photo_url as member1_photo,
          m1.user_id as member1_owner,
          m2.first_name as member2_first, m2.last_name as member2_last,
          m2.birth_date as member2_birth, m2.photo_url as member2_photo,
          m2.user_id as member2_owner,
          u.name as suggested_by_name
      FROM family_merge_suggestions ms
      JOIN family_members m1 ON ms.member1_id = m1.id
      JOIN family_members m2 ON ms.member2_id = m2.id
      LEFT JOIN users u ON ms.suggested_by = u.id
      WHERE ms.status = 'pending'
    `;

    if (!isAdmin) {
      query += ` AND (m1.user_id = ? OR m2.user_id = ?)`;
    }

    query += ` ORDER BY ms.confidence_score DESC, ms.suggested_at DESC LIMIT 50`;

    const params = isAdmin ? [] : [user.id, user.id];
    const [suggestions] = await pool.query(query, params) as any[];

    return NextResponse.json(suggestions);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching merge suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

// POST /api/family/community/suggestions
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { member1_id, member2_id, reason } = await request.json();

    if (!member1_id || !member2_id) {
      return NextResponse.json({ error: 'Both member IDs are required' }, { status: 400 });
    }

    if (member1_id === member2_id) {
      return NextResponse.json({ error: 'Cannot merge a person with themselves' }, { status: 400 });
    }

    const [existing] = await pool.query(`
      SELECT id FROM family_merge_suggestions
      WHERE ((member1_id = ? AND member2_id = ?) OR (member1_id = ? AND member2_id = ?))
      AND status = 'pending'
    `, [member1_id, member2_id, member2_id, member1_id]) as any[];

    if (existing.length > 0) {
      return NextResponse.json({ error: 'הצעת מיזוג כבר קיימת' }, { status: 400 });
    }

    const [members] = await pool.query(`
      SELECT id, first_name, last_name, birth_date, gender
      FROM family_members WHERE id IN (?, ?)
    `, [member1_id, member2_id]) as any[];

    if (members.length !== 2) {
      return NextResponse.json({ error: 'One or both members not found' }, { status: 404 });
    }

    const m1 = members.find((m: any) => m.id === member1_id);
    const m2 = members.find((m: any) => m.id === member2_id);

    let score = 0;
    if (m1.last_name?.toLowerCase() === m2.last_name?.toLowerCase()) score += 0.3;
    if (m1.first_name?.toLowerCase() === m2.first_name?.toLowerCase()) score += 0.3;
    if (m1.birth_date && m2.birth_date &&
      new Date(m1.birth_date).getFullYear() === new Date(m2.birth_date).getFullYear()) score += 0.3;
    if (m1.gender === m2.gender) score += 0.1;

    const [result] = await pool.query(`
      INSERT INTO family_merge_suggestions
      (member1_id, member2_id, suggested_by, confidence_score, reason)
      VALUES (?, ?, ?, ?, ?)
    `, [member1_id, member2_id, user.id, score, reason || null]) as any[];

    return NextResponse.json({
      success: true,
      id: result.insertId,
      confidence_score: score
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error creating merge suggestion:', error);
    return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 });
  }
}
