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
      const colMap: Record<string, string> = { hebrew: 'hebrew_script', latin: 'latin_script', cyrillic: 'cyrillic_script' };
      await pool.query(
        `UPDATE dialect_scripts SET ${colMap[fieldName]} = ? WHERE entry_id = ? LIMIT 1`,
        [value.trim(), id]
      );
    } else if (fieldName === 'russian') {
      await pool.query('UPDATE dictionary_entries SET russian_short = ? WHERE id = ?', [value.trim(), id]);
    } else if (fieldName === 'definition') {
      await pool.query('UPDATE dictionary_entries SET hebrew_long = ? WHERE id = ?', [value.trim(), id]);
    } else if (fieldName === 'pronunciationGuide') {
      await pool.query('UPDATE dialect_scripts SET pronunciation_guide = ? WHERE entry_id = ? LIMIT 1', [value.trim(), id]);
    }

    await pool.query(
      `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, ?, 'community')
       ON DUPLICATE KEY UPDATE source_type = 'community'`,
      [id, fieldName]
    );

    await pool.query('UPDATE users SET xp = xp + 10 WHERE id = ?', [user.id]);

    return NextResponse.json({ success: true, message: 'השדה אושר ונשמר. תודה!' });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Confirm AI field error:', error);
    return NextResponse.json({ error: 'שגיאה באישור שדה' }, { status: 500 });
  }
}
