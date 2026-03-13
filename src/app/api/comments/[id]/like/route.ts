import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// POST /api/comments/:id/like - Like/unlike a comment (auth users only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const userId = user.id;

    // Check if already liked
    const [existing]: any = await pool.query(
      'SELECT id FROM likes WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, 'comment', id]
    );

    if (existing.length > 0) {
      // Unlike
      await pool.query('DELETE FROM likes WHERE id = ?', [existing[0].id]);
      await pool.query('UPDATE comments SET likes_count = likes_count - 1 WHERE id = ?', [id]);
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await pool.query(
        'INSERT INTO likes (user_id, target_type, target_id) VALUES (?, ?, ?)',
        [userId, 'comment', id]
      );
      await pool.query('UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?', [id]);
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'שגיאה בעדכון לייק' }, { status: 500 });
  }
}
