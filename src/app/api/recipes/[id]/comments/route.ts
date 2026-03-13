import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// POST /api/recipes/:id/comments - Add comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'תוכן התגובה חסר' }, { status: 400 });
    }

    const [result] = await pool.query(
      'INSERT INTO recipe_comments (recipe_id, user_id, content) VALUES (?, ?, ?)',
      [id, (user as any).id, content.trim()]
    ) as [any, any];

    return NextResponse.json(
      {
        id: result.insertId,
        content: content.trim(),
        author_name: (user as any).name,
        created_at: new Date(),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת תגובה' }, { status: 500 });
  }
}
