import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const { voteType } = await request.json();

    const [existingVotes] = await pool.query(
      'SELECT id, vote_type FROM translation_votes WHERE translation_id = ? AND user_id = ?',
      [id, user.id]
    ) as any[];

    const existingVote = existingVotes[0];

    if (voteType === null) {
      if (existingVote) {
        await pool.query('DELETE FROM translation_votes WHERE id = ?', [existingVote.id]);
        const countField = existingVote.vote_type === 'up' ? 'upvotes' : 'downvotes';
        await pool.query(`UPDATE translations SET ${countField} = GREATEST(${countField} - 1, 0) WHERE id = ?`, [id]);
      }
    } else if (existingVote) {
      if (existingVote.vote_type !== voteType) {
        await pool.query('UPDATE translation_votes SET vote_type = ? WHERE id = ?', [voteType, existingVote.id]);
        const oldField = existingVote.vote_type === 'up' ? 'upvotes' : 'downvotes';
        const newField = voteType === 'up' ? 'upvotes' : 'downvotes';
        await pool.query(`UPDATE translations SET ${oldField} = GREATEST(${oldField} - 1, 0), ${newField} = ${newField} + 1 WHERE id = ?`, [id]);
      }
    } else {
      await pool.query(
        'INSERT INTO translation_votes (translation_id, user_id, vote_type) VALUES (?, ?, ?)',
        [id, user.id, voteType]
      );
      const countField = voteType === 'up' ? 'upvotes' : 'downvotes';
      await pool.query(`UPDATE translations SET ${countField} = ${countField} + 1 WHERE id = ?`, [id]);
    }

    if (!existingVote && voteType) {
      await pool.query('UPDATE users SET xp = xp + 2 WHERE id = ?', [user.id]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'שגיאה בהצבעה' }, { status: 500 });
  }
}
