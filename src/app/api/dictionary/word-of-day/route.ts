import { NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET() {
  try {
    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM dictionary_entries de
       JOIN translations t ON de.id = t.entry_id
       WHERE de.status = 'active' AND t.hebrew IS NOT NULL AND TRIM(t.hebrew) != ''`
    ) as any[];

    if (total === 0) {
      return NextResponse.json({ word: null });
    }

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
    const offset = (dayOfYear + now.getFullYear()) % total;

    const [entries] = await pool.query(
      `SELECT de.id, de.term, de.detected_language, de.pronunciation_guide,
              t.hebrew, t.latin, t.cyrillic, COALESCE(d.name, 'לא ידוע') as dialect
       FROM dictionary_entries de
       JOIN translations t ON de.id = t.entry_id
       LEFT JOIN dialects d ON t.dialect_id = d.id
       WHERE de.status = 'active' AND t.hebrew IS NOT NULL AND t.hebrew != ''
       ORDER BY de.id
       LIMIT 1 OFFSET ?`,
      [offset]
    ) as any[];

    if (entries.length === 0) {
      return NextResponse.json({ word: null });
    }

    const entry = entries[0];
    return NextResponse.json({
      word: {
        id: entry.id,
        term: entry.term,
        detectedLanguage: entry.detected_language,
        pronunciationGuide: entry.pronunciation_guide,
        translations: [{
          dialect: entry.dialect,
          hebrew: entry.hebrew,
          latin: entry.latin,
          cyrillic: entry.cyrillic,
        }]
      }
    });
  } catch (error) {
    console.error('Word of day error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילה יומית' }, { status: 500 });
  }
}
