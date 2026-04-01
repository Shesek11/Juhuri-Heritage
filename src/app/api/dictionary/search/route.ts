import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { toPhoneticKey } from '@/src/lib/phoneticKey';

// Strip niqqud and normalize geresh for fuzzy Hebrew matching
function normalizeHebrew(s: string): string {
  return s
    .replace(/[\u0591-\u05C7]/g, '')
    .replace(/[\u05F3'ʼ']/g, '׳')
    .replace(/ה$/g, '')
    .trim();
}

// Levenshtein distance for ranking results by similarity
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1]
        ? d[i - 1][j - 1]
        : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}

export async function GET(request: NextRequest) {
  try {
    const term = request.nextUrl.searchParams.get('q')?.trim();

    if (!term) {
      return NextResponse.json({ error: 'נדרש מונח לחיפוש' }, { status: 400 });
    }
    if (term.length > 200) {
      return NextResponse.json({ error: 'מונח החיפוש ארוך מדי' }, { status: 400 });
    }

    const normTerm = normalizeHebrew(term);
    const phoneticTerm = toPhoneticKey(term);

    // Search in active entries across all fields, including normalized (niqqud-free) and phonetic matching
    const [entries] = await pool.query(
      `SELECT de.*, u.name as contributor_name, a.name as approver_name
       FROM dictionary_entries de
       LEFT JOIN users u ON de.contributor_id = u.id
       LEFT JOIN users a ON de.approved_by = a.id
       LEFT JOIN dialect_scripts t ON de.id = t.entry_id
       WHERE de.status = 'active'
         AND (
           de.hebrew_script LIKE ?
           OR MATCH(de.hebrew_script) AGAINST(? IN BOOLEAN MODE)
           OR de.hebrew_short LIKE ?
           OR de.english_short LIKE ?
           OR t.latin_script LIKE ?
           OR t.cyrillic_script LIKE ?
           OR de.russian_short LIKE ?
           OR de.phonetic_key LIKE ?
           OR (? LIKE CONCAT('%', de.phonetic_key, '%') AND CHAR_LENGTH(de.phonetic_key) >= GREATEST(CHAR_LENGTH(?) - 1, 2))
         )
       GROUP BY de.id
       ORDER BY
          CASE
            WHEN de.hebrew_script = ? THEN 0
            WHEN de.phonetic_key = ? THEN 0
            WHEN ? LIKE CONCAT('%', de.phonetic_key, '%') AND CHAR_LENGTH(de.phonetic_key) >= GREATEST(CHAR_LENGTH(?) - 1, 2) THEN 1
            WHEN de.hebrew_short = ? THEN 1
            WHEN de.english_short = ? THEN 1
            WHEN t.latin_script = ? THEN 1
            WHEN de.hebrew_short LIKE ? THEN 2
            WHEN de.english_short LIKE ? THEN 2
            WHEN de.phonetic_key LIKE ? THEN 3
            WHEN de.hebrew_script LIKE ? THEN 3
            ELSE 4
          END,
          ABS(CHAR_LENGTH(de.phonetic_key) - CHAR_LENGTH(?)) ASC,
          de.created_at DESC
       LIMIT 100`,
      [
        `%${term}%`, `${term}*`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`,
        `%${phoneticTerm}%`,
        phoneticTerm, phoneticTerm,
        term, phoneticTerm, phoneticTerm, phoneticTerm, term, term, term, `${term}%`, `${term}%`, `${phoneticTerm}%`, `${term}%`,
        phoneticTerm
      ]
    ) as any[];

    if (entries.length === 0) {
      return NextResponse.json({ found: false, entry: null });
    }

    // Re-rank results by Levenshtein distance on phonetic keys
    // This ensures the closest-sounding match comes first
    const rankedEntries = entries.map((e: any) => {
      const epk = e.phonetic_key || '';
      const dist = levenshtein(phoneticTerm, epk);
      // Exact text matches get distance 0
      const normScript = normalizeHebrew(e.hebrew_script || '');
      const isExactText = e.hebrew_script === term || normScript === normalizeHebrew(term);
      const isExactMeaning = (e.hebrew_short || '') === term || (e.english_short || '') === term;
      // Also compute distance on normalized (niqqud-stripped) original text
      const normDist = levenshtein(normalizeHebrew(term), normScript);
      const score = isExactText ? -200 : isExactMeaning ? -100 : dist * 10 + normDist;
      return { ...e, _score: score };
    });
    rankedEntries.sort((a: any, b: any) => a._score - b._score);
    // Debug log for first few
    if (process.env.NODE_ENV !== 'production') {
      rankedEntries.slice(0, 5).forEach((e: any) => console.log(`  rank: #${e.id} ${e.hebrew_script} score=${e._score} pk=${e.phonetic_key}`));
    }
    rankedEntries.splice(30); // Keep top 30 after re-ranking

    // Get the best match
    const entry = rankedEntries[0];

    // Fetch all related data in parallel
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
      pool.query(
        'SELECT origin, translated, transliteration FROM examples WHERE entry_id = ?',
        [entry.id]
      ),
      pool.query(
        'SELECT field_name, source_type FROM field_sources WHERE entry_id = ?',
        [entry.id]
      ),
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

    const result = {
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
      status: entry.status,
      fieldSources,
      pendingSuggestions,
    };

    // Also return additional matches for multi-result display
    const allResults: any[] = [result];
    const additionalEntries = rankedEntries.slice(1);
    if (additionalEntries.length > 0) {
      const additionalIds = additionalEntries.map((e: any) => e.id);
      const placeholders = additionalIds.map(() => '?').join(',');

      const [allTrans] = await pool.query(
        `SELECT t.*, COALESCE(d.name, '') as dialect
         FROM dialect_scripts t LEFT JOIN dialects d ON t.dialect_id = d.id
         WHERE t.entry_id IN (${placeholders})`, additionalIds
      ) as any[];

      const transMap: Record<number, any[]> = {};
      for (const t of allTrans) {
        (transMap[t.entry_id] ||= []).push(t);
      }

      for (const e of additionalEntries) {
        const trans = transMap[e.id] || [];
        allResults.push({
          id: String(e.id),
          slug: e.slug || null,
          hebrewScript: e.hebrew_script,
          detectedLanguage: e.detected_language,
          dialectScripts: trans.map((t: any) => ({
            id: t.id, dialect: t.dialect, hebrewScript: t.hebrew_script,
            latinScript: t.latin_script, cyrillicScript: t.cyrillic_script,
            pronunciationGuide: t.pronunciation_guide,
            upvotes: t.upvotes || 0, downvotes: t.downvotes || 0,
          })),
          hebrewLong: e.hebrew_long,
          hebrewShort: e.hebrew_short,
          examples: [],
          partOfSpeech: e.part_of_speech,
          russianShort: e.russian_short,
          russianLong: e.russian_long,
          englishShort: e.english_short,
          englishLong: e.english_long,
          isCustom: true,
          source: e.source,
          sourceName: e.source_name || '',
          contributorName: e.contributor_name || '',
          status: e.status,
        });
      }
    }

    // Mark duplicates: if multiple results share the same normalized hebrew translation
    const normHeb = (s: string) => s.replace(/[?!,.:;"'`\-]/g, '').trim().toLowerCase();
    const hebrewCount: Record<string, number> = {};
    for (const r of allResults) {
      const heb = r.dialectScripts?.[0]?.hebrewScript;
      if (heb && heb.length > 1) {
        const key = normHeb(heb);
        hebrewCount[key] = (hebrewCount[key] || 0) + 1;
      }
    }
    for (const r of allResults) {
      const heb = r.dialectScripts?.[0]?.hebrewScript;
      r.hasDuplicates = !!(heb && hebrewCount[normHeb(heb)] > 1);
    }

    return NextResponse.json({ found: true, entry: result, results: allResults });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'שגיאה בחיפוש' }, { status: 500 });
  }
}
