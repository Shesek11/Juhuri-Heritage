import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';
import { logEvent } from '@/src/lib/logEvent';
import { fireEventEmail } from '@/src/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const { origin, translated, transliteration } = await request.json();

    if (!origin || !origin.trim()) {
      return NextResponse.json({ error: 'נדרש טקסט הפתגם' }, { status: 400 });
    }
    if (origin.length > 2000) {
      return NextResponse.json({ error: 'הטקסט ארוך מדי' }, { status: 400 });
    }

    const [entryRows] = await pool.query('SELECT id, hebrew_script FROM dictionary_entries WHERE id = ?', [id]) as any[];
    if (entryRows.length === 0) {
      return NextResponse.json({ error: 'ערך לא נמצא' }, { status: 404 });
    }

    const [result] = await pool.query(
      `INSERT INTO community_examples (entry_id, origin, translated, transliteration, user_id, user_name, source_type, status)
       VALUES (?, ?, ?, ?, ?, ?, 'community', 'pending')`,
      [
        id,
        origin.trim(),
        translated?.trim() || null,
        transliteration?.trim() || null,
        user?.id || null,
        user?.name || 'אורח',
      ]
    ) as any[];

    const exampleId = result.insertId;

    // Auto-link: find dictionary words that appear in the proverb text
    try {
      const words = origin.trim().split(/\s+/).filter((w: string) => w.length >= 2);
      if (words.length > 0) {
        const placeholders = words.map(() => '?').join(',');
        const [matchedEntries] = await pool.query(
          `SELECT id FROM dictionary_entries WHERE hebrew_script IN (${placeholders}) AND status = 'active'`,
          words
        ) as any[];
        for (const matched of matchedEntries) {
          await pool.query(
            `INSERT IGNORE INTO example_word_links (example_id, entry_id) VALUES (?, ?)`,
            [exampleId, matched.id]
          );
        }
      }
    } catch (linkErr) {
      console.error('Auto-link error (non-fatal):', linkErr);
    }

    if (user?.id) {
      await pool.query('UPDATE users SET xp = xp + 20 WHERE id = ?', [user.id]);
    }

    await logEvent('DICTIONARY_EXAMPLE_SUGGESTED', `Example suggested for entry ${id}`, user, { entryId: id, exampleId }, request);
    fireEventEmail('example-submitted', { variables: { userName: user?.name || 'אורח', term: entryRows[0].hebrew_script, entryId: String(id) } });

    return NextResponse.json({ success: true, message: 'הפתגם נשלח לאישור. תודה!' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Suggest example error:', error);
    return NextResponse.json({ error: 'שגיאה בשליחת פתגם' }, { status: 500 });
  }
}
