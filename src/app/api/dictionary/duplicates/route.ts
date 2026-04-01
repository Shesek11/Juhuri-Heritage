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

// Normalize text for duplicate comparison: strip punctuation, trim, lowercase
// Uses chained REPLACE (REGEXP_REPLACE has escaping issues in MariaDB prepared statements)
// CHAR(63)='?' — can't use literal '?' as mysql2 treats it as a parameter placeholder
const NORM = (col: string) =>
  `LOWER(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${col}, CHAR(63), ''), '!', ''), ',', ''), '.', ''), ':', ''), ';', ''), '"', ''), CHAR(39), '')))`;

const LAYER_QUERIES: { type: string; base: string; searchFilter: string }[] = [
  {
    type: 'term',
    base: `SELECT de.hebrew_script_normalized as match_key, 'term' as match_type,
           GROUP_CONCAT(de.id ORDER BY de.id) as ids, COUNT(*) as cnt
           FROM dictionary_entries de
           WHERE de.status = 'active' AND de.hebrew_script_normalized IS NOT NULL AND de.hebrew_script_normalized != ''`,
    searchFilter: `AND de.hebrew_script_normalized LIKE ?`,
  },
  {
    type: 'hebrew',
    base: `SELECT ${NORM('de.hebrew_script')} as match_key, 'hebrew' as match_type,
           GROUP_CONCAT(DISTINCT de.id ORDER BY de.id) as ids, COUNT(DISTINCT de.id) as cnt
           FROM dialect_scripts t JOIN dictionary_entries de ON t.entry_id = de.id
           WHERE de.status = 'active' AND de.hebrew_script IS NOT NULL AND de.hebrew_script != '' AND CHAR_LENGTH(de.hebrew_script) > 1`,
    searchFilter: `AND ${NORM('de.hebrew_script')} LIKE ?`,
  },
  {
    type: 'latin',
    base: `SELECT ${NORM('t.latin_script')} as match_key, 'latin' as match_type,
           GROUP_CONCAT(DISTINCT de.id ORDER BY de.id) as ids, COUNT(DISTINCT de.id) as cnt
           FROM dialect_scripts t JOIN dictionary_entries de ON t.entry_id = de.id
           WHERE de.status = 'active' AND t.latin_script IS NOT NULL AND t.latin_script != ''`,
    searchFilter: `AND ${NORM('t.latin_script')} LIKE ?`,
  },
  {
    type: 'russian',
    base: `SELECT ${NORM('de.russian_short')} as match_key, 'russian' as match_type,
           GROUP_CONCAT(de.id ORDER BY de.id) as ids, COUNT(*) as cnt
           FROM dictionary_entries de
           WHERE de.status = 'active' AND de.russian_short IS NOT NULL AND de.russian_short != '' AND CHAR_LENGTH(de.russian_short) > 1`,
    searchFilter: `AND ${NORM('de.russian_short')} LIKE ?`,
  },
  {
    type: 'cyrillic',
    base: `SELECT ${NORM('t.cyrillic_script')} as match_key, 'cyrillic' as match_type,
           GROUP_CONCAT(DISTINCT de.id ORDER BY de.id) as ids, COUNT(DISTINCT de.id) as cnt
           FROM dialect_scripts t JOIN dictionary_entries de ON t.entry_id = de.id
           WHERE de.status = 'active' AND t.cyrillic_script IS NOT NULL AND t.cyrillic_script != '' AND CHAR_LENGTH(t.cyrillic_script) > 1`,
    searchFilter: `AND ${NORM('t.cyrillic_script')} LIKE ?`,
  },
];

export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '20')));
    const search = (request.nextUrl.searchParams.get('search') || '').trim();
    const offset = (page - 1) * limit;

    // Run all layers in parallel — simple GROUP BY, no subqueries
    const groupByCol: Record<string, string> = {
      term: 'de.hebrew_script_normalized',
      hebrew: NORM('de.hebrew_script'),
      latin: NORM('t.latin_script'),
      russian: NORM('de.russian_short'),
      cyrillic: NORM('t.cyrillic_script'),
    };

    const queries = LAYER_QUERIES.map(layer => {
      let query = layer.base;
      const params: any[] = [];

      if (search) {
        // Search in the match_key field AND also search across all relevant fields
        // so that searching "מתי" finds groups in the hebrew layer even if it's the term name
        const searchNorm = `%${search.replace(/[?!,.:;"'\`\\-]/g, '').toLowerCase()}%`;

        if (layer.type === 'term') {
          // Term layer: search in hebrew_script_normalized + also check dialect_scripts
          query = `SELECT de.hebrew_script_normalized as match_key, 'term' as match_type,
                   GROUP_CONCAT(de.id ORDER BY de.id) as ids, COUNT(*) as cnt
                   FROM dictionary_entries de
                   WHERE de.status = 'active' AND de.hebrew_script_normalized IS NOT NULL AND de.hebrew_script_normalized != ''
                     AND de.hebrew_script_normalized IN (
                       SELECT de2.hebrew_script_normalized FROM dictionary_entries de2
                       LEFT JOIN dialect_scripts ds ON ds.entry_id = de2.id
                       WHERE de2.status = 'active'
                         AND (de2.hebrew_script_normalized LIKE ? OR de2.hebrew_script LIKE ?
                              OR ds.latin_script LIKE ?)
                     )`;
          params.push(searchNorm, `%${search}%`, `%${search}%`);
        } else {
          // Other layers: search in the match_key
          query += ` ${layer.searchFilter}`;
          params.push(searchNorm);
        }
      }

      query += ` GROUP BY ${groupByCol[layer.type]} HAVING cnt > 1 ORDER BY cnt DESC LIMIT 500`;

      return pool.query(query, params).then(([rows]) => rows as any[]);
    });

    const results = await Promise.all(queries);

    // Merge all layers, deduplicating by ID set
    const seenKeys = new Set<string>();
    const groups: { matchType: string; matchKey: string; ids: number[] }[] = [];

    for (const rows of results) {
      for (const g of rows) {
        const ids = g.ids.split(',').map(Number);
        const key = ids.sort((a: number, b: number) => a - b).join(',');
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          groups.push({ matchType: g.match_type, matchKey: g.match_key, ids });
        }
      }
    }

    // ── Step 1: Load lightweight data for ALL entries to compute similarity ──
    const everyId = [...new Set(groups.flatMap(g => g.ids))];
    if (everyId.length === 0) {
      return NextResponse.json({ groups: [], total: 0, counts: { identical: 0, near_identical: 0, similar: 0 }, page, limit });
    }

    // Lightweight query: just the fields needed for similarity scoring
    const ph = everyId.map(() => '?').join(',');
    const [lightEntries] = await pool.query(
      `SELECT de.id, de.hebrew_script, de.russian_short,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('h', de.hebrew_script, 'l', t.latin_script, 'c', t.cyrillic_script))
               FROM dialect_scripts t WHERE t.entry_id = de.id LIMIT 1) as ds
       FROM dictionary_entries de WHERE de.id IN (${ph})`, everyId
    ) as any[];

    const lightMap: Record<number, any> = {};
    for (const e of lightEntries) {
      const ds = (() => { try { return JSON.parse(e.ds)?.[0] || {}; } catch { return {}; } })();
      lightMap[e.id] = { hebrewScript: e.hebrew_script, russianShort: e.russian_short, h: ds.h, l: ds.l, c: ds.c };
    }

    // ── Step 2: Compute similarity for ALL groups ──
    const norm = (s: string | null | undefined) => (s || '').replace(/[?!,.:;"'`\-]/g, '').trim().toLowerCase();

    function computeSimilarity(ids: number[]): 'identical' | 'near_identical' | 'similar' {
      if (ids.length < 2) return 'similar';
      const base = lightMap[ids[0]];
      if (!base) return 'similar';

      let allIdentical = true;
      let allNear = true;

      for (let i = 1; i < ids.length; i++) {
        const other = lightMap[ids[i]];
        if (!other) continue;

        const termMatch = norm(base.hebrewScript) === norm(other.hebrewScript) && !!base.hebrewScript;
        const hebrewMatch = norm(base.h) === norm(other.h) && !!base.h;
        const latinMatch = norm(base.l) === norm(other.l) && !!base.l;
        const cyrillicMatch = norm(base.c) === norm(other.c) && !!base.c;
        const russianMatch = norm(base.russianShort) === norm(other.russianShort) && !!base.russianShort;

        const matchCount = [termMatch, hebrewMatch, latinMatch, cyrillicMatch, russianMatch].filter(Boolean).length;
        const filledBase = [base.hebrewScript, base.h, base.l, base.c, base.russianShort].filter(Boolean).length;
        const filledOther = [other.hebrewScript, other.h, other.l, other.c, other.russianShort].filter(Boolean).length;
        const maxFilled = Math.min(filledBase, filledOther);

        if (maxFilled > 0 && matchCount < maxFilled) allIdentical = false;
        if (matchCount < 2 && maxFilled > 1) allNear = false;
        if (matchCount === 0) allNear = false;
      }

      if (allIdentical) return 'identical';
      if (allNear) return 'near_identical';
      return 'similar';
    }

    function computeHint(ids: number[], matchType: string): string {
      const items = ids.map(id => lightMap[id]).filter(Boolean);
      if (items.length < 2) return '';

      const uniqueTerms = new Set(items.map(e => norm(e.hebrewScript)).filter(Boolean));
      const uniqueHebrew = new Set(items.map(e => norm(e.h)).filter(Boolean));
      const uniqueLatin = new Set(items.map(e => norm(e.l)).filter(Boolean));

      const sameTerm = uniqueTerms.size <= 1 && uniqueTerms.size > 0;
      const sameHebrew = uniqueHebrew.size <= 1 && uniqueHebrew.size > 0;
      const sameLatin = uniqueLatin.size <= 1 && uniqueLatin.size > 0;

      // Show what's shared and what differs
      if (sameTerm && sameHebrew && sameLatin) return 'כפילות מלאה — אותו מונח ותרגום';
      if (sameTerm && sameHebrew) return 'אותו מונח ותרגום עברי';
      if (sameTerm) return 'אותו מונח, תרגומים שונים';
      if (sameLatin && sameHebrew) return 'אותו תעתיק ותרגום, מונח שונה';
      if (sameLatin) return 'אותו תעתיק לטיני, מונחים שונים';

      // Different terms — probably synonyms, not duplicates
      if (matchType === 'russian' || matchType === 'cyrillic') {
        const terms = items.map(e => e.hebrewScript).filter(Boolean);
        if (terms.length >= 2 && uniqueTerms.size > 1) {
          return `מילים נרדפות? (${terms.slice(0, 3).join(', ')}${terms.length > 3 ? '...' : ''})`;
        }
        return 'אותו תרגום, מונחים שונים — ייתכן מילים נרדפות';
      }
      if (matchType === 'hebrew' && uniqueTerms.size > 1) {
        return 'אותו תרגום עברי, מונחים שונים';
      }

      return '';
    }

    const scored = groups.map(g => ({
      ...g,
      similarity: computeSimilarity(g.ids),
      hint: computeHint(g.ids, g.matchType),
    }));

    // Counts across ALL groups
    const counts = { identical: 0, near_identical: 0, similar: 0 };
    for (const g of scored) counts[g.similarity]++;

    // Filter by similarity if requested
    const similarityFilter = request.nextUrl.searchParams.get('similarity');
    const filtered = similarityFilter ? scored.filter(g => g.similarity === similarityFilter) : scored;

    // Sort: identical first
    const order: Record<string, number> = { identical: 0, near_identical: 1, similar: 2 };
    filtered.sort((a, b) => order[a.similarity] - order[b.similarity]);

    const filteredTotal = filtered.length;
    const pagedGroups = filtered.slice(offset, offset + limit);

    // ── Step 3: Load FULL data only for the current page ──
    const pageIds = [...new Set(pagedGroups.flatMap(g => g.ids))];
    if (pageIds.length === 0) {
      return NextResponse.json({ groups: [], total: filteredTotal, counts, page, limit });
    }

    const ph2 = pageIds.map(() => '?').join(',');
    const [fullEntries] = await pool.query(
      `SELECT de.id, de.hebrew_script, de.hebrew_script_normalized, de.part_of_speech, de.russian_short, de.source_name, de.source, de.created_at,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('hebrewScript', de.hebrew_script, 'latinScript', t.latin_script, 'cyrillicScript', t.cyrillic_script, 'dialect', COALESCE(d.name, '')))
               FROM dialect_scripts t LEFT JOIN dialects d ON t.dialect_id = d.id WHERE t.entry_id = de.id) as translations_json
       FROM dictionary_entries de WHERE de.id IN (${ph2})`, pageIds
    ) as any[];

    const entryMap: Record<number, any> = {};
    for (const e of fullEntries) {
      entryMap[e.id] = {
        id: String(e.id),
        hebrewScript: e.hebrew_script,
        hebrewScriptNormalized: e.hebrew_script_normalized,
        partOfSpeech: e.part_of_speech,
        russianShort: e.russian_short,
        sourceName: e.source_name,
        source: e.source,
        createdAt: e.created_at,
        dialectScripts: (() => { try { return JSON.parse(e.translations_json) || []; } catch { return []; } })(),
      };
    }

    const result = pagedGroups.map(g => ({
      matchType: g.matchType,
      matchKey: g.matchKey,
      similarity: g.similarity,
      hint: g.hint,
      entries: g.ids.map(id => entryMap[id]).filter(Boolean),
    }));

    return NextResponse.json({ groups: result, total: filteredTotal, counts, page, limit });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Duplicates detection error:', err);
    return NextResponse.json({ error: 'שגיאה בזיהוי כפילויות' }, { status: 500 });
  }
}
