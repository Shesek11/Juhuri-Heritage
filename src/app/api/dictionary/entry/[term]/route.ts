import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ term: string }> }
) {
  try {
    const { term: rawTerm } = await params;
    const term = decodeURIComponent(rawTerm).trim();
    if (!term) return NextResponse.json({ error: 'נדרש מונח' }, { status: 400 });

    const [entries] = await pool.query(
      `SELECT de.*, u.name as contributor_name
       FROM dictionary_entries de
       LEFT JOIN users u ON de.contributor_id = u.id
       WHERE de.status = 'active' AND de.term = ?
       LIMIT 1`,
      [term]
    ) as any[];

    if (entries.length === 0) {
      return NextResponse.json({ found: false, entry: null });
    }

    const entry = entries[0];

    const [
      [translations],
      [definitions],
      [examples],
      [fieldSourceRows]
    ] = await Promise.all([
      pool.query(
        `SELECT t.*, COALESCE(d.name, 'לא ידוע') as dialect
         FROM translations t
         LEFT JOIN dialects d ON t.dialect_id = d.id
         WHERE t.entry_id = ?`,
        [entry.id]
      ),
      pool.query('SELECT definition FROM definitions WHERE entry_id = ?', [entry.id]),
      pool.query('SELECT origin, translated, transliteration FROM examples WHERE entry_id = ?', [entry.id]),
      pool.query('SELECT field_name, source_type FROM field_sources WHERE entry_id = ?', [entry.id])
    ]) as any[];

    const fieldSources: Record<string, string> = {};
    for (const row of fieldSourceRows) {
      fieldSources[row.field_name] = row.source_type;
    }

    return NextResponse.json({
      found: true,
      entry: {
        id: String(entry.id),
        term: entry.term,
        detectedLanguage: entry.detected_language,
        translations: translations.map((t: any) => ({
          id: t.id,
          dialect: t.dialect,
          hebrew: t.hebrew,
          latin: t.latin,
          cyrillic: t.cyrillic,
          upvotes: t.upvotes || 0,
          downvotes: t.downvotes || 0,
        })),
        definitions: definitions.map((d: any) => d.definition),
        examples,
        pronunciationGuide: entry.pronunciation_guide,
        partOfSpeech: entry.part_of_speech,
        russian: entry.russian,
        isCustom: true,
        source: entry.source,
        fieldSources,
      }
    });
  } catch (error) {
    console.error('Entry lookup error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הערך' }, { status: 500 });
  }
}
