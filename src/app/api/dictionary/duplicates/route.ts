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

const LAYER_QUERIES: { type: string; base: string; searchFilter: string }[] = [
  {
    type: 'term',
    base: `SELECT de.term_normalized as match_key, 'term' as match_type,
           GROUP_CONCAT(de.id ORDER BY de.id) as ids, COUNT(*) as cnt
           FROM dictionary_entries de
           WHERE de.status = 'active' AND de.term_normalized IS NOT NULL AND de.term_normalized != ''`,
    searchFilter: `AND de.term_normalized LIKE ?`,
  },
  {
    type: 'hebrew',
    base: `SELECT t.hebrew as match_key, 'hebrew' as match_type,
           GROUP_CONCAT(DISTINCT de.id ORDER BY de.id) as ids, COUNT(DISTINCT de.id) as cnt
           FROM translations t JOIN dictionary_entries de ON t.entry_id = de.id
           WHERE de.status = 'active' AND t.hebrew IS NOT NULL AND t.hebrew != '' AND CHAR_LENGTH(t.hebrew) > 1`,
    searchFilter: `AND t.hebrew LIKE ?`,
  },
  {
    type: 'latin',
    base: `SELECT LOWER(t.latin) as match_key, 'latin' as match_type,
           GROUP_CONCAT(DISTINCT de.id ORDER BY de.id) as ids, COUNT(DISTINCT de.id) as cnt
           FROM translations t JOIN dictionary_entries de ON t.entry_id = de.id
           WHERE de.status = 'active' AND t.latin IS NOT NULL AND t.latin != ''`,
    searchFilter: `AND t.latin LIKE ?`,
  },
  {
    type: 'russian',
    base: `SELECT de.russian as match_key, 'russian' as match_type,
           GROUP_CONCAT(de.id ORDER BY de.id) as ids, COUNT(*) as cnt
           FROM dictionary_entries de
           WHERE de.status = 'active' AND de.russian IS NOT NULL AND de.russian != '' AND CHAR_LENGTH(de.russian) > 1`,
    searchFilter: `AND de.russian LIKE ?`,
  },
  {
    type: 'cyrillic',
    base: `SELECT LOWER(t.cyrillic) as match_key, 'cyrillic' as match_type,
           GROUP_CONCAT(DISTINCT de.id ORDER BY de.id) as ids, COUNT(DISTINCT de.id) as cnt
           FROM translations t JOIN dictionary_entries de ON t.entry_id = de.id
           WHERE de.status = 'active' AND t.cyrillic IS NOT NULL AND t.cyrillic != '' AND CHAR_LENGTH(t.cyrillic) > 1`,
    searchFilter: `AND t.cyrillic LIKE ?`,
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
      term: 'de.term_normalized',
      hebrew: 't.hebrew',
      latin: 'LOWER(t.latin)',
      russian: 'de.russian',
      cyrillic: 'LOWER(t.cyrillic)',
    };

    const queries = LAYER_QUERIES.map(layer => {
      let query = layer.base;
      const params: any[] = [];

      if (search) {
        // Search directly in the match_key field
        query += ` ${layer.searchFilter}`;
        params.push(`%${search}%`);
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

    const total = groups.length;
    const pagedGroups = groups.slice(offset, offset + limit);

    const allIds = [...new Set(pagedGroups.flatMap(g => g.ids))];
    if (allIds.length === 0) {
      return NextResponse.json({ groups: [], total: 0, page, limit });
    }

    const placeholders = allIds.map(() => '?').join(',');
    const [entries] = await pool.query(
      `SELECT de.id, de.term, de.term_normalized, de.part_of_speech, de.russian, de.source_name, de.source, de.created_at,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('hebrew', t.hebrew, 'latin', t.latin, 'cyrillic', t.cyrillic, 'dialect', COALESCE(d.name, '')))
               FROM translations t LEFT JOIN dialects d ON t.dialect_id = d.id WHERE t.entry_id = de.id) as translations_json
       FROM dictionary_entries de
       WHERE de.id IN (${placeholders})`,
      allIds
    ) as any[];

    const entryMap: Record<number, any> = {};
    for (const e of entries) {
      entryMap[e.id] = {
        id: String(e.id),
        term: e.term,
        termNormalized: e.term_normalized,
        partOfSpeech: e.part_of_speech,
        russian: e.russian,
        sourceName: e.source_name,
        source: e.source,
        createdAt: e.created_at,
        translations: (() => {
          try { return JSON.parse(e.translations_json) || []; }
          catch { return []; }
        })(),
      };
    }

    const result = pagedGroups.map(g => ({
      matchType: g.matchType,
      matchKey: g.matchKey,
      entries: g.ids.map(id => entryMap[id]).filter(Boolean),
    }));

    return NextResponse.json({ groups: result, total, page, limit });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error('Duplicates detection error:', err);
    return NextResponse.json({ error: 'שגיאה בזיהוי כפילויות' }, { status: 500 });
  }
}
