import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';

// GET /api/family/community/link-requests
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const isAdmin = user.role === 'admin';

    let query = `
      SELECT
          lr.*,
          sm.first_name as source_first, sm.last_name as source_last,
          tm.first_name as target_first, tm.last_name as target_last,
          tm.user_id as target_owner,
          u.name as requester_name
      FROM family_link_requests lr
      JOIN family_members sm ON lr.source_member_id = sm.id
      JOIN family_members tm ON lr.target_member_id = tm.id
      JOIN users u ON lr.requester_id = u.id
      WHERE lr.status = 'pending'
    `;

    if (!isAdmin) {
      query += ` AND tm.user_id = ?`;
    }

    query += ` ORDER BY lr.created_at DESC`;

    const params = isAdmin ? [] : [user.id];
    const [requests] = await pool.query(query, params) as any[];

    return NextResponse.json(requests);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error fetching link requests:', error);
    return NextResponse.json({ error: 'Failed to fetch link requests' }, { status: 500 });
  }
}

// POST /api/family/community/link-requests
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { source_member_id, target_member_id, relationship_type, message } = await request.json();

    if (!source_member_id || !target_member_id || !relationship_type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [sourceMember] = await pool.query(
      'SELECT user_id FROM family_members WHERE id = ?', [source_member_id]
    ) as any[];

    if (sourceMember.length === 0 || sourceMember[0].user_id !== user.id) {
      return NextResponse.json({ error: 'You can only create link requests from your own members' }, { status: 403 });
    }

    const [result] = await pool.query(`
      INSERT INTO family_link_requests
      (requester_id, source_member_id, target_member_id, relationship_type, message)
      VALUES (?, ?, ?, ?, ?)
    `, [user.id, source_member_id, target_member_id, relationship_type, message || null]) as any[];

    fireEventEmail('family-link-request', { variables: { userName: user.name, relationshipType: relationship_type } });

    return NextResponse.json({ success: true, id: result.insertId }, { status: 201 });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error creating link request:', error);
    return NextResponse.json({ error: 'Failed to create link request' }, { status: 500 });
  }
}
