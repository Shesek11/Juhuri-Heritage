import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

function normalizeTerm(term: string): string {
  return (term || '')
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  const conn = await pool.getConnection();
  try {
    const user = await requireApprover(request);
    const { keepId, deleteId, fieldOverrides } = await request.json();

    if (!keepId || !deleteId) {
      return NextResponse.json({ error: 'נדרשים מזהי ערכים' }, { status: 400 });
    }
    if (keepId === deleteId) {
      return NextResponse.json({ error: 'לא ניתן למזג ערך עם עצמו' }, { status: 400 });
    }

    await conn.beginTransaction();

    const [[keepEntry]] = await conn.query('SELECT * FROM dictionary_entries WHERE id = ?', [keepId]) as any[];
    const [[deleteEntry]] = await conn.query('SELECT * FROM dictionary_entries WHERE id = ?', [deleteId]) as any[];
    if (!keepEntry || !deleteEntry) {
      await conn.rollback();
      return NextResponse.json({ error: 'אחד הערכים לא נמצא' }, { status: 404 });
    }

    // 1. Snapshot
    const [deleteTranslations] = await conn.query(
      `SELECT t.*, COALESCE(d.name, '') as dialect_name FROM translations t LEFT JOIN dialects d ON t.dialect_id = d.id WHERE t.entry_id = ?`, [deleteId]
    ) as any[];
    const [deleteDefinitions] = await conn.query('SELECT * FROM definitions WHERE entry_id = ?', [deleteId]) as any[];
    const [deleteExamples] = await conn.query('SELECT * FROM examples WHERE entry_id = ?', [deleteId]) as any[];

    await conn.query(
      'INSERT INTO merge_log (kept_entry_id, deleted_entry_id, deleted_term, merge_details, merged_by) VALUES (?, ?, ?, ?, ?)',
      [keepId, deleteId, deleteEntry.term, JSON.stringify({ entry: deleteEntry, translations: deleteTranslations, definitions: deleteDefinitions, examples: deleteExamples }), user.id]
    );

    // 2. Apply field overrides
    if (fieldOverrides && typeof fieldOverrides === 'object') {
      const allowedFields = ['term', 'pronunciation_guide', 'part_of_speech', 'russian', 'english', 'detected_language'];
      const updates: string[] = [];
      const values: any[] = [];
      for (const [field, value] of Object.entries(fieldOverrides)) {
        if (allowedFields.includes(field)) {
          updates.push(`${field} = ?`);
          values.push(value);
        }
      }
      if (updates.length > 0) {
        if (fieldOverrides.term) {
          updates.push('term_normalized = ?');
          values.push(normalizeTerm(fieldOverrides.term as string));
        }
        values.push(keepId);
        await conn.query(`UPDATE dictionary_entries SET ${updates.join(', ')} WHERE id = ?`, values);
      }
    }

    // 3. Move translations
    await conn.query('UPDATE translations SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);

    // 4. Move unique definitions
    const [keepDefs] = await conn.query('SELECT definition FROM definitions WHERE entry_id = ?', [keepId]) as any[];
    const keepDefSet = new Set(keepDefs.map((d: any) => d.definition));
    for (const d of deleteDefinitions) {
      if (!keepDefSet.has(d.definition)) {
        await conn.query('INSERT INTO definitions (entry_id, definition) VALUES (?, ?)', [keepId, d.definition]);
      }
    }
    await conn.query('DELETE FROM definitions WHERE entry_id = ?', [deleteId]);

    // 5. Move examples
    await conn.query('UPDATE examples SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);

    // 6. Re-point FKs
    await conn.query('UPDATE translation_suggestions SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);
    await conn.query('UPDATE comments SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);
    await conn.query('UPDATE community_examples SET entry_id = ? WHERE entry_id = ?', [keepId, deleteId]);

    await conn.query(`INSERT IGNORE INTO entry_likes (entry_id, user_id, created_at) SELECT ?, user_id, created_at FROM entry_likes WHERE entry_id = ?`, [keepId, deleteId]);
    await conn.query('DELETE FROM entry_likes WHERE entry_id = ?', [deleteId]);

    await conn.query(`INSERT INTO word_views (entry_id, view_date, view_count) SELECT ?, view_date, view_count FROM word_views WHERE entry_id = ? ON DUPLICATE KEY UPDATE view_count = word_views.view_count + VALUES(view_count)`, [keepId, deleteId]);
    await conn.query('DELETE FROM word_views WHERE entry_id = ?', [deleteId]);

    await conn.query(`INSERT IGNORE INTO related_words (entry_id, related_entry_id, relation_type) SELECT ?, related_entry_id, relation_type FROM related_words WHERE entry_id = ? AND related_entry_id != ?`, [keepId, deleteId, keepId]);
    await conn.query(`INSERT IGNORE INTO related_words (entry_id, related_entry_id, relation_type) SELECT entry_id, ?, relation_type FROM related_words WHERE related_entry_id = ? AND entry_id != ?`, [keepId, deleteId, keepId]);
    await conn.query('DELETE FROM related_words WHERE entry_id = ? OR related_entry_id = ?', [deleteId, deleteId]);

    await conn.query(`INSERT IGNORE INTO word_mastery (user_id, entry_id, box, next_review, times_correct, times_incorrect, last_reviewed) SELECT user_id, ?, box, next_review, times_correct, times_incorrect, last_reviewed FROM word_mastery WHERE entry_id = ?`, [keepId, deleteId]);
    await conn.query('DELETE FROM word_mastery WHERE entry_id = ?', [deleteId]);

    await conn.query(`INSERT IGNORE INTO unit_words (unit_id, entry_id, display_order) SELECT unit_id, ?, display_order FROM unit_words WHERE entry_id = ?`, [keepId, deleteId]);
    await conn.query('DELETE FROM unit_words WHERE entry_id = ?', [deleteId]);

    await conn.query(`INSERT IGNORE INTO example_word_links (example_id, entry_id) SELECT example_id, ? FROM example_word_links WHERE entry_id = ?`, [keepId, deleteId]);
    await conn.query('DELETE FROM example_word_links WHERE entry_id = ?', [deleteId]);

    await conn.query(`INSERT IGNORE INTO field_sources (entry_id, field_name, source_type, confidence) SELECT ?, field_name, source_type, confidence FROM field_sources WHERE entry_id = ?`, [keepId, deleteId]);
    await conn.query('DELETE FROM field_sources WHERE entry_id = ?', [deleteId]);

    // 7. Delete doomed entry
    await conn.query('DELETE FROM dictionary_entries WHERE id = ?', [deleteId]);

    // 8. Update term_normalized if not done via overrides
    if (!fieldOverrides?.term) {
      await conn.query('UPDATE dictionary_entries SET term_normalized = ? WHERE id = ?', [normalizeTerm(keepEntry.term), keepId]);
    }

    // 9. Log
    await conn.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES ('ENTRY_MERGED', ?, ?, ?, ?)`,
      [`מוזגו ערכים: "${keepEntry.term}" (${keepId}) ← "${deleteEntry.term}" (${deleteId})`, user.id, user.name, JSON.stringify({ keepId, deleteId, deletedTerm: deleteEntry.term })]
    );

    // Resolve pending merge suggestions
    await conn.query(
      `UPDATE merge_suggestions SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() WHERE status = 'pending' AND ((entry_id_a = ? AND entry_id_b = ?) OR (entry_id_a = ? AND entry_id_b = ?))`,
      [user.id, keepId, deleteId, deleteId, keepId]
    );

    await conn.commit();
    return NextResponse.json({ success: true, keptId: keepId, deletedId: deleteId });
  } catch (err: any) {
    await conn.rollback();
    if (err instanceof Response) return err;
    console.error('Merge error:', err);
    return NextResponse.json({ error: 'שגיאה במיזוג ערכים' }, { status: 500 });
  } finally {
    conn.release();
  }
}
