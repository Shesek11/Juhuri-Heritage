import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';
import { applyRateLimit } from '@/src/lib/rate-limit';

const ADD_WORD_LIMIT = { windowMs: 15 * 60 * 1000, max: 5, message: 'יותר מדי בקשות, נסה שוב בעוד 15 דקות' };

export async function POST(request: NextRequest) {
  try {
    const limited = applyRateLimit(request, ADD_WORD_LIMIT);
    if (limited) return limited;

    const { term } = await request.json();

    if (!term || !term.trim()) {
      return NextResponse.json({ error: 'נדרש מונח' }, { status: 400 });
    }

    const cleanTerm = term.trim();

    // Get user if logged in (optional)
    let user = null;
    try {
      user = await getAuthUser(request);
    } catch { /* guest */ }

    // Check if already exists
    const [existing] = await pool.query(
      'SELECT id FROM dictionary_entries WHERE term = ? LIMIT 1',
      [cleanTerm]
    ) as any[];

    let entryId: number;
    let alreadyExists = false;

    if (existing.length > 0) {
      entryId = existing[0].id;
      alreadyExists = true;
    } else {
      const [result] = await pool.query(
        `INSERT INTO dictionary_entries (term, detected_language, source, status, needs_translation, contributor_id)
         VALUES (?, 'Hebrew', 'קהילה', 'active', TRUE, ?)`,
        [cleanTerm, user?.id || null]
      ) as any[];
      entryId = result.insertId;
    }

    // Register watcher if user is logged in
    let watching = false;
    if (user?.id) {
      try {
        await pool.query(
          'INSERT IGNORE INTO translation_watchers (entry_id, user_id) VALUES (?, ?)',
          [entryId, user.id]
        );
        watching = true;
      } catch { /* ignore duplicate */ }
    }

    return NextResponse.json({
      success: true,
      entryId,
      alreadyExists,
      watching,
      isGuest: !user,
      message: alreadyExists
        ? 'המילה כבר קיימת במאגר — תרגום יתווסף בקרוב'
        : 'המילה נוספה! הקהילה תוכל להציע תרגום',
    });
  } catch (error: any) {
    console.error('Add untranslated error:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת מילה' }, { status: 500 });
  }
}
