import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover } from '@/src/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireApprover(request);
    const { term, detectedLanguage, pronunciationGuide } = await request.json();

    if (!term) {
      return NextResponse.json({ error: 'נדרש מונח' }, { status: 400 });
    }

    try {
      const [result] = await pool.query(
        `INSERT INTO dictionary_entries (term, detected_language, pronunciation_guide, source, status, needs_translation, contributor_id)
         VALUES (?, ?, ?, 'Manual', 'active', TRUE, ?)`,
        [term, detectedLanguage || 'Hebrew', pronunciationGuide || null, user.id]
      ) as any[];
      return NextResponse.json({ success: true, entryId: result.insertId });
    } catch (colErr: any) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR') {
        const [result] = await pool.query(
          `INSERT INTO dictionary_entries (term, detected_language, pronunciation_guide, source, status, contributor_id)
           VALUES (?, ?, ?, 'Manual', 'active', ?)`,
          [term, detectedLanguage || 'Hebrew', pronunciationGuide || null, user.id]
        ) as any[];
        return NextResponse.json({ success: true, entryId: result.insertId, note: 'migration_needed' });
      }
      throw colErr;
    }
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Add untranslated error:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת מילה' }, { status: 500 });
  }
}
