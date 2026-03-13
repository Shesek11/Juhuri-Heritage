import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// POST /api/recipes/:id/like - Like/unlike recipe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    // Check if already liked
    const [existing] = await pool.query(
      'SELECT * FROM recipe_likes WHERE user_id = ? AND recipe_id = ?',
      [(user as any).id, id]
    ) as [any[], any];

    if (existing.length) {
      // Unlike
      await pool.query(
        'DELETE FROM recipe_likes WHERE user_id = ? AND recipe_id = ?',
        [(user as any).id, id]
      );
      return NextResponse.json({ liked: false });
    } else {
      // Like
      await pool.query(
        'INSERT INTO recipe_likes (user_id, recipe_id) VALUES (?, ?)',
        [(user as any).id, id]
      );
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: 'שגיאה' }, { status: 500 });
  }
}
