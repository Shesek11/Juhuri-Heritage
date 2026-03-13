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

    const [likes] = await pool.query('SELECT 1 FROM entry_likes WHERE entry_id = ? AND user_id = ?', [id, user.id]) as any[];

    if (likes.length > 0) {
      await pool.query('DELETE FROM entry_likes WHERE entry_id = ? AND user_id = ?', [id, user.id]);
      return NextResponse.json({ success: true, liked: false });
    } else {
      await pool.query('INSERT INTO entry_likes (entry_id, user_id) VALUES (?, ?)', [id, user.id]);
      return NextResponse.json({ success: true, liked: true });
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Like error:', error);
    return NextResponse.json({ error: 'Action failed' }, { status: 500 });
  }
}
