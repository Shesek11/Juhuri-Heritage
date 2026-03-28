import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireApprover(request);
    const { entries } = await request.json();

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'נדרש מערך מילים' }, { status: 400 });
    }

    let addedCount = 0;

    for (const entry of entries) {
      if (!entry.term) continue;

      const [result] = await pool.query(
        `INSERT INTO dictionary_entries
         (hebrew_script, detected_language, source, status, contributor_id, approved_by, approved_at)
         VALUES (?, ?, ?, 'active', ?, ?, NOW())
         ON DUPLICATE KEY UPDATE hebrew_script = hebrew_script`,
        [
          entry.term,
          entry.detectedLanguage || 'Hebrew',
          entry.source || 'מאגר',
          user.id,
          user.id
        ]
      ) as any[];

      let entryId = result.insertId;
      if (!entryId) {
        const [existing] = await pool.query('SELECT id FROM dictionary_entries WHERE hebrew_script = ?', [entry.term]) as any[];
        if (existing.length === 0) continue;
        entryId = existing[0].id;
      }

      if (entry.translations) {
        for (const t of entry.translations) {
          const [dialects] = await pool.query('SELECT id FROM dialects WHERE name = ?', [t.dialect || 'General']) as any[];
          const dialectId = dialects[0]?.id || 6;

          await pool.query(
            `INSERT INTO dialect_scripts (entry_id, dialect_id, hebrew_script, latin_script, cyrillic_script) VALUES (?, ?, ?, ?, ?)`,
            [entryId, dialectId, t.hebrew || '', t.latin || '', t.cyrillic || '']
          );
        }
      }

      if (entry.examples) {
        for (const ex of entry.examples) {
          await pool.query(
            'INSERT INTO examples (entry_id, origin, translated, transliteration) VALUES (?, ?, ?, ?)',
            [entryId, ex.origin, ex.translated || '', ex.transliteration || '']
          );
        }
      }

      addedCount++;
    }

    return NextResponse.json({ success: true, addedCount });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Batch add error:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת מילים' }, { status: 500 });
  }
}
