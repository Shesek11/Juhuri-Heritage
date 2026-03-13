import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

// POST /api/recipes/:id/photos - Add photo to recipe (owner or admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();
    const { url, is_main = false, alt_text = null } = body;

    if (!url) {
      return NextResponse.json({ error: 'כתובת התמונה חסרה' }, { status: 400 });
    }

    // Check ownership
    const [existing] = await pool.query(
      'SELECT user_id FROM recipes WHERE id = ?',
      [id]
    ) as [any[], any];

    if (!existing.length) {
      return NextResponse.json({ error: 'מתכון לא נמצא' }, { status: 404 });
    }

    if (existing[0].user_id !== (user as any).id && (user as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'אין הרשאה להוסיף תמונות למתכון זה' },
        { status: 403 }
      );
    }

    // If this is main photo, unset other main photos
    if (is_main) {
      await pool.query(
        'UPDATE recipe_photos SET is_main = 0 WHERE recipe_id = ?',
        [id]
      );
    }

    // Insert photo
    const [result] = await pool.query(
      'INSERT INTO recipe_photos (recipe_id, url, is_main, alt_text) VALUES (?, ?, ?, ?)',
      [id, url, is_main ? 1 : 0, alt_text]
    ) as [any, any];

    return NextResponse.json(
      {
        success: true,
        photo_id: result.insertId,
        message: 'התמונה נוספה בהצלחה',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error adding photo:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת תמונה' }, { status: 500 });
  }
}
