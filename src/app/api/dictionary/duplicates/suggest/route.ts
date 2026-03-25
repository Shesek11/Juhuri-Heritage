import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireAuth } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { entryIdA, entryIdB, reason } = await request.json();

    if (!entryIdA || !entryIdB) {
      return NextResponse.json({ error: 'נדרשים מזהי ערכים' }, { status: 400 });
    }
    if (entryIdA === entryIdB) {
      return NextResponse.json({ error: 'לא ניתן להציע מיזוג של ערך עם עצמו' }, { status: 400 });
    }

    const [idA, idB] = [Math.min(entryIdA, entryIdB), Math.max(entryIdA, entryIdB)];

    await pool.query(
      `INSERT INTO merge_suggestions (entry_id_a, entry_id_b, reason, user_id, user_name)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE reason = COALESCE(VALUES(reason), reason)`,
      [idA, idB, reason || null, user.id, user.name]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Suggest merge error:', err);
    return NextResponse.json({ error: 'שגיאה בשליחת הצעת מיזוג' }, { status: 500 });
  }
}
