import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const { status } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const [requests] = await pool.query(`
      SELECT lr.*, tm.user_id as target_owner
      FROM family_link_requests lr
      JOIN family_members tm ON lr.target_member_id = tm.id
      WHERE lr.id = ?
    `, [id]) as any[];

    if (requests.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const linkRequest = requests[0];
    const isAdmin = user.role === 'admin';
    const isOwner = linkRequest.target_owner === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'אין לך הרשאה לאשר בקשה זו' }, { status: 403 });
    }

    if (status === 'approved') {
      const { source_member_id, target_member_id, relationship_type } = linkRequest;

      if (relationship_type === 'same_person') {
        await pool.query(`
          INSERT INTO family_merge_suggestions
          (member1_id, member2_id, suggested_by, confidence_score, reason, status, reviewed_by, reviewed_at)
          VALUES (?, ?, ?, 0.9, 'מבקשת חיבור אושרה', 'pending', NULL, NULL)
        `, [source_member_id, target_member_id, linkRequest.requester_id]);
      } else if (relationship_type === 'parent') {
        await pool.query(`
          INSERT INTO family_parent_child (parent_id, child_id, relationship_type)
          VALUES (?, ?, 'biological')
        `, [source_member_id, target_member_id]);
      } else if (relationship_type === 'child') {
        await pool.query(`
          INSERT INTO family_parent_child (parent_id, child_id, relationship_type)
          VALUES (?, ?, 'biological')
        `, [target_member_id, source_member_id]);
      } else if (relationship_type === 'spouse') {
        await pool.query(`
          INSERT INTO family_partnerships (person1_id, person2_id, status)
          VALUES (?, ?, 'married')
        `, [Math.min(source_member_id, target_member_id), Math.max(source_member_id, target_member_id)]);
      }
    }

    await pool.query(`
      UPDATE family_link_requests
      SET status = ?, reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [status, user.id, id]);

    const eventType = status === 'approved' ? 'FAMILY_LINK_APPROVED' : 'FAMILY_LINK_REJECTED';
    await logEvent(eventType, `בקשת קישור ${id} ${status === 'approved' ? 'אושרה' : 'נדחתה'}`, user, { requestId: id, status, relationshipType: linkRequest.relationship_type }, request);

    // Notify the requester about approval/rejection
    const [requesterRows] = await pool.query('SELECT email, name FROM users WHERE id = ?', [linkRequest.requester_id]) as [any[], any];
    if (requesterRows.length && requesterRows[0].email) {
      const slug = status === 'approved' ? 'family-link-approved' : 'family-link-rejected';
      fireEventEmail(slug, { to: requesterRows[0].email, variables: { userName: requesterRows[0].name || '' } });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating link request:', error);
    return NextResponse.json({ error: 'Failed to update link request' }, { status: 500 });
  }
}
