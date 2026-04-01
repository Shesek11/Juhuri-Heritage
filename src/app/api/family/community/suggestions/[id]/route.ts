import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const { status, keepMemberId } = await request.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const [suggestions] = await pool.query(`
      SELECT ms.*, m1.user_id as m1_owner, m2.user_id as m2_owner
      FROM family_merge_suggestions ms
      JOIN family_members m1 ON ms.member1_id = m1.id
      JOIN family_members m2 ON ms.member2_id = m2.id
      WHERE ms.id = ?
    `, [id]) as any[];

    if (suggestions.length === 0) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    const suggestion = suggestions[0];
    const isAdmin = user.role === 'admin';
    const isOwner = suggestion.m1_owner === user.id || suggestion.m2_owner === user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'אין לך הרשאה לאשר מיזוג זה' }, { status: 403 });
    }

    if (status === 'approved') {
      if (!keepMemberId) {
        return NextResponse.json({ error: 'keepMemberId is required for approval' }, { status: 400 });
      }

      const removeMemberId = keepMemberId === suggestion.member1_id
        ? suggestion.member2_id
        : suggestion.member1_id;

      await pool.query('UPDATE family_parent_child SET parent_id = ? WHERE parent_id = ?', [keepMemberId, removeMemberId]);
      await pool.query('UPDATE family_parent_child SET child_id = ? WHERE child_id = ?', [keepMemberId, removeMemberId]);
      await pool.query('UPDATE family_partnerships SET person1_id = ? WHERE person1_id = ?', [keepMemberId, removeMemberId]);
      await pool.query('UPDATE family_partnerships SET person2_id = ? WHERE person2_id = ?', [keepMemberId, removeMemberId]);

      await pool.query('UPDATE family_members SET merged_into = ? WHERE id = ?', [keepMemberId, removeMemberId]);

      await pool.query(`
        INSERT INTO family_member_history
        (member_id, changed_by, change_type, old_value, new_value)
        VALUES (?, ?, 'merge', ?, ?)
      `, [keepMemberId, user.id, `Merged from ID ${removeMemberId}`, JSON.stringify({ mergedFrom: removeMemberId })]);
    }

    await pool.query(`
      UPDATE family_merge_suggestions
      SET status = ?, reviewed_by = ?, reviewed_at = NOW()
      WHERE id = ?
    `, [status, user.id, id]);

    const eventType = status === 'approved' ? 'FAMILY_MERGE_APPROVED' : 'FAMILY_MERGE_REJECTED';
    await logEvent(eventType, `מיזוג משפחתי ${id} ${status === 'approved' ? 'אושר' : 'נדחה'}`, user, { suggestionId: id, status, keepMemberId }, request);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error updating merge suggestion:', error);
    return NextResponse.json({ error: 'Failed to update suggestion' }, { status: 500 });
  }
}
