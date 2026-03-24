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

    // Support lookup by numeric ID (for entries with empty term)
    const isNumericId = /^\d+$/.test(term);
    const [entries] = await pool.query(
      `SELECT de.*, u.name as contributor_name
       FROM dictionary_entries de
       LEFT JOIN users u ON de.contributor_id = u.id
       WHERE de.status = 'active' AND ${isNumericId ? '(de.id = ? OR de.term = ?)' : 'de.term = ?'}
       LIMIT 1`,
      isNumericId ? [term, term] : [term]
    ) as any[];

    if (entries.length === 0) {
      return NextResponse.json({ found: false, entry: null });
    }

    const entry = entries[0];

    const [
      [translations],
      [definitions],
      [examples],
      [fieldSourceRows],
      [pendingSuggestionRows]
    ] = await Promise.all([
      pool.query(
        `SELECT t.*, COALESCE(d.name, '') as dialect
         FROM translations t
         LEFT JOIN dialects d ON t.dialect_id = d.id
         WHERE t.entry_id = ?`,
        [entry.id]
      ),
      pool.query('SELECT definition FROM definitions WHERE entry_id = ?', [entry.id]),
      pool.query('SELECT origin, translated, transliteration FROM examples WHERE entry_id = ?', [entry.id]),
      pool.query('SELECT field_name, source_type FROM field_sources WHERE entry_id = ?', [entry.id]),
      pool.query(
        `SELECT id, field_name, suggested_hebrew, suggested_latin,
                suggested_cyrillic, suggested_russian, reason,
                user_id, created_at
         FROM translation_suggestions
         WHERE entry_id = ? AND status = 'pending'`,
        [entry.id]
      )
    ]) as any[];

    const fieldSources: Record<string, string> = {};
    for (const row of fieldSourceRows) {
      fieldSources[row.field_name] = row.source_type;
    }

    const pendingSuggestions = pendingSuggestionRows.map((s: any) => ({
      id: s.id,
      fieldName: s.field_name || (s.suggested_hebrew ? 'hebrew' : s.suggested_latin ? 'latin' : s.suggested_cyrillic ? 'cyrillic' : s.suggested_russian ? 'russian' : 'hebrew'),
      suggestedValue: s.suggested_hebrew || s.suggested_latin || s.suggested_cyrillic || s.suggested_russian || '',
      userId: s.user_id ? String(s.user_id) : undefined,
      createdAt: s.created_at,
      reason: s.reason,
    }));

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
        sourceName: entry.source_name || '',
        contributorName: entry.contributor_name || '',
        fieldSources,
        pendingSuggestions,
      }
    });
  } catch (error) {
    console.error('Entry lookup error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת הערך' }, { status: 500 });
  }
}
