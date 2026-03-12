import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { getAuthUser } from '@/src/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id } = await params;
    const { fieldName, value } = await request.json();

    if (!fieldName || !value?.trim()) {
      return NextResponse.json({ error: 'נדרש שם שדה וערך' }, { status: 400 });
    }

    const allowedFields = ['hebrew', 'latin', 'cyrillic', 'russian', 'definition', 'pronunciationGuide', 'examples'];
    if (!allowedFields.includes(fieldName)) {
      return NextResponse.json({ error: 'שדה לא חוקי' }, { status: 400 });
    }

    const [entryRows] = await pool.query('SELECT id FROM dictionary_entries WHERE id = ?', [id]) as any[];
    if (entryRows.length === 0) return NextResponse.json({ error: 'ערך לא נמצא' }, { status: 404 });

    if (['hebrew', 'latin', 'cyrillic'].includes(fieldName)) {
      await pool.query(
        `UPDATE translations SET ${fieldName} = ? WHERE entry_id = ? LIMIT 1`,
        [value.trim(), id]
      );
    } else if (fieldName === 'russian') {
      await pool.query('UPDATE dictionary_entries SET russian = ? WHERE id = ?', [value.trim(), id]);
    } else if (fieldName === 'definition') {
      const [existingDefs] = await pool.query('SELECT id FROM definitions WHERE entry_id = ? LIMIT 1', [id]) as any[];
      if (existingDefs.length > 0) {
        await pool.query('UPDATE definitions SET definition = ? WHERE id = ?', [value.trim(), existingDefs[0].id]);
      } else {
        await pool.query('INSERT INTO definitions (entry_id, definition) VALUES (?, ?)', [id, value.trim()]);
      }
    } else if (fieldName === 'pronunciationGuide') {
      await pool.query('UPDATE dictionary_entries SET pronunciation_guide = ? WHERE id = ?', [value.trim(), id]);
    }

    await pool.query(
      `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, ?, 'community')
       ON DUPLICATE KEY UPDATE source_type = 'community'`,
      [id, fieldName]
    );

    if (user?.id) {
      await pool.query('UPDATE users SET xp = xp + 10 WHERE id = ?', [user.id]);
    }

    return NextResponse.json({ success: true, message: 'השדה אושר ונשמר. תודה!' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Confirm AI field error:', error);
    return NextResponse.json({ error: 'שגיאה באישור שדה' }, { status: 500 });
  }
}
