import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';
import { fireEventEmail } from '@/src/lib/email';
import { logEvent } from '@/src/lib/logEvent';

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
      if (fieldName === 'hebrew') suggestedValue = suggestion.suggested_hebrew_short;
      else if (fieldName === 'latin') suggestedValue = suggestion.suggested_latin_script;
      else if (fieldName === 'cyrillic') suggestedValue = suggestion.suggested_cyrillic_script;
      else if (fieldName === 'russian') suggestedValue = suggestion.suggested_russian_short;
      else if (fieldName === 'definition') suggestedValue = suggestion.suggested_hebrew_short;
      else if (fieldName === 'pronunciationGuide') suggestedValue = suggestion.suggested_hebrew_short;
      else if (fieldName === 'partOfSpeech') suggestedValue = suggestion.suggested_hebrew_short;

      if (['hebrew', 'latin', 'cyrillic'].includes(fieldName)) {
        const colMap: Record<string, string> = { hebrew: 'hebrew_script', latin: 'latin_script', cyrillic: 'cyrillic_script' };
        await connection.query(
          `UPDATE dialect_scripts SET ${colMap[fieldName]} = ? WHERE entry_id = ? LIMIT 1`,
          [suggestedValue, entryId]
        );
      } else if (fieldName === 'russian') {
        await connection.query('UPDATE dictionary_entries SET russian_short = ? WHERE id = ?', [suggestedValue, entryId]);
      } else if (fieldName === 'definition') {
        await connection.query('UPDATE dictionary_entries SET hebrew_long = ? WHERE id = ?', [suggestedValue, entryId]);
      } else if (fieldName === 'pronunciationGuide') {
        await connection.query('UPDATE dialect_scripts SET pronunciation_guide = ? WHERE entry_id = ? LIMIT 1', [suggestedValue, entryId]);
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
          `UPDATE dialect_scripts SET hebrew_script = ?, latin_script = ?, cyrillic_script = ? WHERE id = ?`,
          [suggestion.suggested_hebrew_short, suggestion.suggested_latin_script, suggestion.suggested_cyrillic_script, suggestion.translation_id]
        );
      } else {
        await connection.query(
          `INSERT INTO dialect_scripts (entry_id, dialect_id, hebrew_script, latin_script, cyrillic_script) VALUES (?, ?, ?, ?, ?)`,
          [suggestion.entry_id, dialectId, suggestion.suggested_hebrew_short, suggestion.suggested_latin_script, suggestion.suggested_cyrillic_script]
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
        const [entryRows] = await connection.query('SELECT hebrew_script FROM dictionary_entries WHERE id = ?', [entryId]);
        const entryTerm = entryRows[0]?.hebrew_script || '';
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

    // Email the contributor that their suggestion was approved
    if (suggestion.user_id) {
      const [contributors] = await pool.query('SELECT email, name FROM users WHERE id = ?', [suggestion.user_id]) as any[];
      const [entries] = await pool.query('SELECT hebrew_script FROM dictionary_entries WHERE id = ?', [suggestion.entry_id]) as any[];
      if (contributors[0]?.email) {
        fireEventEmail('suggestion-approved', {
          to: contributors[0].email,
          variables: { userName: contributors[0].name || '', term: entries[0]?.hebrew_script || '' },
        });
      }
    }

    await logEvent('DICTIONARY_SUGGESTION_APPROVED', `Suggestion ${id} approved`, user, { suggestionId: id, entryId: suggestion.entry_id }, request);

    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    connection.release();
    if (error instanceof Response) return error;
    console.error('Approve suggestion error:', error);
    return NextResponse.json({ error: 'שגיאה באישור הצעה' }, { status: 500 });
  }
}
