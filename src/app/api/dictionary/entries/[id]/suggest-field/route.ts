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
    const { fieldName, currentValue, suggestedValue, reason, dialect } = await request.json();

    if (!fieldName || !suggestedValue?.trim()) {
      return NextResponse.json({ error: 'נדרש שם שדה וערך מוצע' }, { status: 400 });
    }

    const allowedFields = ['hebrew', 'hebrewShort', 'hebrewLong', 'latin', 'cyrillic', 'russian', 'russianShort', 'englishShort', 'definition', 'pronunciationGuide', 'partOfSpeech', 'dialect'];
    if (!allowedFields.includes(fieldName)) {
      return NextResponse.json({ error: 'שדה לא חוקי' }, { status: 400 });
    }

    const [entryRows] = await pool.query(
      `SELECT de.hebrew_script, COALESCE(d.name, 'General') as dialect_name
       FROM dictionary_entries de
       LEFT JOIN dialect_scripts t ON de.id = t.entry_id
       LEFT JOIN dialects d ON t.dialect_id = d.id
       WHERE de.id = ?
       LIMIT 1`,
      [id]
    ) as any[];
    if (entryRows.length === 0) return NextResponse.json({ error: 'ערך לא נמצא' }, { status: 404 });

    const dialectName = dialect || entryRows[0].dialect_name || 'General';

    await pool.query(
      `INSERT INTO translation_suggestions
       (entry_id, user_id, user_name, dialect, field_name, suggested_hebrew_short, suggested_latin_script, suggested_cyrillic_script, suggested_russian_short, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        id,
        user?.id || null,
        user?.name || 'אורח',
        dialectName,
        fieldName,
        fieldName === 'hebrew' ? suggestedValue.trim() : (currentValue || ''),
        fieldName === 'latin' ? suggestedValue.trim() : '',
        fieldName === 'cyrillic' ? suggestedValue.trim() : '',
        fieldName === 'russian' ? suggestedValue.trim() : '',
        reason || `תיקון שדה ${fieldName}: "${currentValue || ''}" → "${suggestedValue.trim()}"`,
      ]
    );

    if (user?.id) {
      await pool.query('UPDATE users SET xp = xp + 15 WHERE id = ?', [user.id]);
    }

    await logEvent('FIELD_SUGGESTION', `הצעת שדה ${fieldName} לערך ${id}`, user, { entryId: id, fieldName, suggestedValue, term: entryRows[0].hebrew_script }, request);
    fireEventEmail('field-suggested', { variables: { userName: user?.name || 'אורח', term: entryRows[0].hebrew_script, fieldName, suggestedValue } });

    return NextResponse.json({ success: true, message: 'ההצעה נשלחה לאישור. תודה!' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Suggest field error:', error);
    return NextResponse.json({ error: 'שגיאה בשליחת הצעה' }, { status: 500 });
  }
}
