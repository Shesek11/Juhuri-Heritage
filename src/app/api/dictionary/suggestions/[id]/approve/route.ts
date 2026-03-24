import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const connection = await (pool as any).getConnection();
  try {
    const user = await requireApprover(request);
    await connection.beginTransaction();
    const { id } = await params;

    const [suggestions] = await connection.query('SELECT * FROM translation_suggestions WHERE id = ?', [id]);
    if (suggestions.length === 0) {
      await connection.rollback();
      connection.release();
      return NextResponse.json({ error: 'הצעה לא נמצאה' }, { status: 404 });
    }
    const suggestion = suggestions[0];

    // Field-level suggestion
    if (suggestion.field_name) {
      const fieldName = suggestion.field_name;
      const entryId = suggestion.entry_id;

      let suggestedValue = '';
      if (fieldName === 'hebrew') suggestedValue = suggestion.suggested_hebrew;
      else if (fieldName === 'latin') suggestedValue = suggestion.suggested_latin;
      else if (fieldName === 'cyrillic') suggestedValue = suggestion.suggested_cyrillic;
      else if (fieldName === 'russian') suggestedValue = suggestion.suggested_russian;
      else if (fieldName === 'definition') suggestedValue = suggestion.suggested_hebrew;
      else if (fieldName === 'pronunciationGuide') suggestedValue = suggestion.suggested_hebrew;
      else if (fieldName === 'partOfSpeech') suggestedValue = suggestion.suggested_hebrew;

      if (['hebrew', 'latin', 'cyrillic'].includes(fieldName)) {
        await connection.query(
          `UPDATE translations SET ${fieldName} = ? WHERE entry_id = ? LIMIT 1`,
          [suggestedValue, entryId]
        );
      } else if (fieldName === 'russian') {
        await connection.query('UPDATE dictionary_entries SET russian = ? WHERE id = ?', [suggestedValue, entryId]);
      } else if (fieldName === 'definition') {
        const [existingDefs] = await connection.query('SELECT id FROM definitions WHERE entry_id = ? LIMIT 1', [entryId]);
        if (existingDefs.length > 0) {
          await connection.query('UPDATE definitions SET definition = ? WHERE id = ?', [suggestedValue, existingDefs[0].id]);
        } else {
          await connection.query('INSERT INTO definitions (entry_id, definition) VALUES (?, ?)', [entryId, suggestedValue]);
        }
      } else if (fieldName === 'pronunciationGuide') {
        await connection.query('UPDATE dictionary_entries SET pronunciation_guide = ? WHERE id = ?', [suggestedValue, entryId]);
      } else if (fieldName === 'partOfSpeech') {
        await connection.query('UPDATE dictionary_entries SET part_of_speech = ? WHERE id = ?', [suggestedValue, entryId]);
      }

      await connection.query(
        `INSERT INTO field_sources (entry_id, field_name, source_type) VALUES (?, ?, 'community')
         ON DUPLICATE KEY UPDATE source_type = 'community'`,
        [entryId, fieldName]
      );
    } else {
      // Full translation suggestion
      const [dialects] = await connection.query('SELECT id FROM dialects WHERE name = ?', [suggestion.dialect]);
      const dialectId = dialects[0]?.id || 6;

      if (suggestion.translation_id) {
        await connection.query(
          `UPDATE translations SET hebrew = ?, latin = ?, cyrillic = ? WHERE id = ?`,
          [suggestion.suggested_hebrew, suggestion.suggested_latin, suggestion.suggested_cyrillic, suggestion.translation_id]
        );
      } else {
        await connection.query(
          `INSERT INTO translations (entry_id, dialect_id, hebrew, latin, cyrillic) VALUES (?, ?, ?, ?, ?)`,
          [suggestion.entry_id, dialectId, suggestion.suggested_hebrew, suggestion.suggested_latin, suggestion.suggested_cyrillic]
        );
      }
    }

    await connection.query(
      'UPDATE translation_suggestions SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?',
      ['approved', user.id, id]
    );

    if (suggestion.user_id) {
      await connection.query('UPDATE users SET xp = xp + 50 WHERE id = ?', [suggestion.user_id]);
    }

    // Notify watchers — people who requested this translation
    const entryId = suggestion.entry_id;
    try {
      const [watchers] = await connection.query(
        'SELECT user_id FROM translation_watchers WHERE entry_id = ? AND notified = FALSE',
        [entryId]
      );
      if (watchers.length > 0) {
        const [entryRows] = await connection.query('SELECT term FROM dictionary_entries WHERE id = ?', [entryId]);
        const entryTerm = entryRows[0]?.term || '';
        for (const w of watchers) {
          await connection.query(
            `INSERT INTO notifications (user_id, type, title, message, link)
             VALUES (?, 'suggestion_approved', ?, ?, ?)`,
            [
              w.user_id,
              `תרגום חדש למילה "${entryTerm}"`,
              `למילה "${entryTerm}" נוסף תרגום חדש!`,
              `/word/${encodeURIComponent(entryTerm)}`
            ]
          );
        }
        await connection.query(
          'UPDATE translation_watchers SET notified = TRUE WHERE entry_id = ?',
          [entryId]
        );
        // Mark entry as no longer needing translation
        await connection.query(
          'UPDATE dictionary_entries SET needs_translation = FALSE WHERE id = ?',
          [entryId]
        );
      }
    } catch (watchErr) {
      console.error('Watcher notification error (non-fatal):', watchErr);
    }

    await connection.commit();
    connection.release();
    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    connection.release();
    if (error instanceof Response) return error;
    console.error('Approve suggestion error:', error);
    return NextResponse.json({ error: 'שגיאה באישור הצעה' }, { status: 500 });
  }
}
