import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

export async function GET(request: NextRequest) {
  try {
    const term = request.nextUrl.searchParams.get('q')?.trim();

    if (!term) {
      return NextResponse.json({ error: 'נדרש מונח לחיפוש' }, { status: 400 });
    }
    if (term.length > 200) {
      return NextResponse.json({ error: 'מונח החיפוש ארוך מדי' }, { status: 400 });
    }

    // Search in active entries: by term (Juhuri) OR by hebrew translation (FULLTEXT) OR russian
    const [entries] = await pool.query(
      `SELECT de.*, u.name as contributor_name, a.name as approver_name
       FROM dictionary_entries de
       LEFT JOIN users u ON de.contributor_id = u.id
       LEFT JOIN users a ON de.approved_by = a.id
       LEFT JOIN translations t ON de.id = t.entry_id
       WHERE de.status = 'active'
         AND (de.term LIKE ? OR MATCH(t.hebrew) AGAINST(? IN BOOLEAN MODE) OR t.hebrew LIKE ? OR de.russian LIKE ?)
       GROUP BY de.id
       ORDER BY
          CASE
            WHEN de.term = ? THEN 0
            WHEN t.hebrew = ? THEN 1
            WHEN de.term LIKE ? THEN 2
            WHEN t.hebrew LIKE ? THEN 3
            ELSE 4
          END,
          de.created_at DESC
       LIMIT 10`,
      [`%${term}%`, `${term}*`, `%${term}%`, `%${term}%`, term, term, `${term}%`, `${term}%`]
    ) as any[];

    if (entries.length === 0) {
      return NextResponse.json({ found: false, entry: null });
    }

    // Get the best match (exact or first)
    const entry = entries[0];

    // Fetch all related data in parallel
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
      pool.query(
        'SELECT definition FROM definitions WHERE entry_id = ?',
        [entry.id]
      ),
      pool.query(
        'SELECT origin, translated, transliteration FROM examples WHERE entry_id = ?',
        [entry.id]
      ),
      pool.query(
        'SELECT field_name, source_type FROM field_sources WHERE entry_id = ?',
        [entry.id]
      )
    ]) as any[];

    const fieldSources: Record<string, string> = {};
    for (const row of fieldSourceRows) {
      fieldSources[row.field_name] = row.source_type;
    }

    const result = {
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
      status: entry.status,
      fieldSources,
    };

    // Also return additional matches for multi-result display
    const allResults: any[] = [result];
    const additionalEntries = entries.slice(1, 5);
    if (additionalEntries.length > 0) {
      const additionalIds = additionalEntries.map((e: any) => e.id);
      const placeholders = additionalIds.map(() => '?').join(',');

      const [allTrans] = await pool.query(
        `SELECT t.*, COALESCE(d.name, 'לא ידוע') as dialect
         FROM translations t LEFT JOIN dialects d ON t.dialect_id = d.id
         WHERE t.entry_id IN (${placeholders})`, additionalIds
      ) as any[];
      const [allDefs] = await pool.query(
        `SELECT entry_id, definition FROM definitions WHERE entry_id IN (${placeholders})`, additionalIds
      ) as any[];

      const transMap: Record<number, any[]> = {};
      const defsMap: Record<number, string[]> = {};
      for (const t of allTrans) {
        (transMap[t.entry_id] ||= []).push(t);
      }
      for (const d of allDefs) {
        (defsMap[d.entry_id] ||= []).push(d.definition);
      }

      for (const e of additionalEntries) {
        const trans = transMap[e.id] || [];
        const defs = defsMap[e.id] || [];
        allResults.push({
          id: String(e.id),
          term: e.term,
          detectedLanguage: e.detected_language,
          translations: trans.map((t: any) => ({
            id: t.id, dialect: t.dialect, hebrew: t.hebrew,
            latin: t.latin, cyrillic: t.cyrillic,
            upvotes: t.upvotes || 0, downvotes: t.downvotes || 0,
          })),
          definitions: defs,
          examples: [],
          pronunciationGuide: e.pronunciation_guide,
          partOfSpeech: e.part_of_speech,
          russian: e.russian,
          isCustom: true,
          source: e.source,
          status: e.status,
        });
      }
    }

    return NextResponse.json({ found: true, entry: result, results: allResults });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'שגיאה בחיפוש' }, { status: 500 });
  }
}
