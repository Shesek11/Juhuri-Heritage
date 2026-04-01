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

    // Support lookup by: slug (latin), numeric ID, or hebrew_script (legacy)
    const isNumericId = /^\d+$/.test(term);
    const isLatin = /^[a-z0-9\u00c0-\u024f\-]+$/i.test(term);

    let whereClause: string;
    let queryParams: any[];

    if (isNumericId) {
      whereClause = '(de.id = ? OR de.hebrew_script = ? OR de.slug = ?)';
      queryParams = [term, term, term];
    } else if (isLatin) {
      // Latin slug lookup (new) — also fallback to hebrew_script
      whereClause = '(de.slug = ? OR de.hebrew_script = ?)';
      queryParams = [term, term];
    } else {
      // Hebrew script lookup (legacy)
      whereClause = 'de.hebrew_script = ?';
      queryParams = [term];
    }

    const [entries] = await pool.query(
      `SELECT de.*, u.name as contributor_name
       FROM dictionary_entries de
       LEFT JOIN users u ON de.contributor_id = u.id
       WHERE de.status = 'active' AND ${whereClause}
       LIMIT 1`,
      queryParams
    ) as any[];

    if (entries.length === 0) {
      return NextResponse.json({ found: false, entry: null });
    }

    const entry = entries[0];

    const [
      [dialectScripts],
      [examples],
      [fieldSourceRows],
      [pendingSuggestionRows]
    ] = await Promise.all([
      pool.query(
        `SELECT t.*, COALESCE(d.name, '') as dialect
         FROM dialect_scripts t
         LEFT JOIN dialects d ON t.dialect_id = d.id
         WHERE t.entry_id = ?`,
        [entry.id]
      ),
      pool.query('SELECT origin, translated, transliteration FROM examples WHERE entry_id = ?', [entry.id]),
      pool.query('SELECT field_name, source_type FROM field_sources WHERE entry_id = ?', [entry.id]),
      pool.query(
        `SELECT id, field_name, suggested_hebrew_short, suggested_latin_script,
                suggested_cyrillic_script, suggested_russian_short, reason,
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
      fieldName: s.field_name || (s.suggested_hebrew_short ? 'hebrew' : s.suggested_latin_script ? 'latin' : s.suggested_cyrillic_script ? 'cyrillic' : s.suggested_russian_short ? 'russian' : 'hebrew'),
      suggestedValue: s.suggested_hebrew_short || s.suggested_latin_script || s.suggested_cyrillic_script || s.suggested_russian_short || '',
      userId: s.user_id ? String(s.user_id) : undefined,
      createdAt: s.created_at,
      reason: s.reason,
    }));

    return NextResponse.json({
      found: true,
      entry: {
        id: String(entry.id),
        slug: entry.slug || null,
        hebrewScript: entry.hebrew_script,
        detectedLanguage: entry.detected_language,
        dialectScripts: dialectScripts.map((t: any) => ({
          id: t.id,
          dialect: t.dialect,
          hebrewScript: t.hebrew_script,
          latinScript: t.latin_script,
          cyrillicScript: t.cyrillic_script,
          pronunciationGuide: t.pronunciation_guide,
          upvotes: t.upvotes || 0,
          downvotes: t.downvotes || 0,
        })),
        hebrewLong: entry.hebrew_long,
        hebrewShort: entry.hebrew_short,
        examples,
        partOfSpeech: entry.part_of_speech,
        russianShort: entry.russian_short,
        russianLong: entry.russian_long,
        englishShort: entry.english_short,
        englishLong: entry.english_long,
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
