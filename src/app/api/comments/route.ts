import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';
import { applyRateLimit, RATE_LIMITS } from '@/src/lib/rate-limit';

// POST /api/comments - Add a new comment
// Auth users: status = 'approved', Guests: status = 'pending', requires name
export async function POST(request: NextRequest) {
  const limited = applyRateLimit(request, RATE_LIMITS.comments);
  if (limited) return limited;

  try {
    const user = await getAuthUser(request);
    const { entryId, content, guestName } = await request.json();
    const userId = user ? user.id : null;

    if (!entryId || !content) {
      return NextResponse.json({ error: 'חסר מידע נדרש' }, { status: 400 });
    }

    // Input length validation
    const MAX_COMMENT_LENGTH = 2000;
    const MAX_NAME_LENGTH = 100;

    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `התגובה ארוכה מדי (מקסימום ${MAX_COMMENT_LENGTH} תווים)` },
        { status: 400 }
      );
    }

    // Determine status based on auth
    const isGuest = !userId;
    const status = isGuest ? 'pending' : 'approved';

    if (isGuest && !guestName) {
      return NextResponse.json({ error: 'נדרש שם עבור תגובת אורח' }, { status: 400 });
    }

    if (guestName && guestName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'השם ארוך מדי' }, { status: 400 });
    }

    const [result]: any = await pool.query(`
      INSERT INTO comments (entry_id, user_id, guest_name, content, status)
      VALUES (?, ?, ?, ?, ?)
    `, [entryId, userId, guestName || null, content, status]);

    return NextResponse.json(
      {
        success: true,
        id: result.insertId,
        status,
        message: isGuest ? 'התגובה נשלחה לאישור' : 'התגובה פורסמה',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת תגובה' }, { status: 500 });
  }
}
