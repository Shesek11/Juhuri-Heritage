import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';
import { requireApprover, getAuthUser } from '@/src/lib/auth';

// GET /api/dictionary/entries - Get entries with pagination (admin)
export async function GET(request: NextRequest) {
  try {
    await requireApprover(request);

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('de.status = ?');
      params.push(status);
    }

    if (search && search.trim()) {
      conditions.push('(de.term LIKE ? OR t_search.hebrew LIKE ?)');
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT de.id) as total
       FROM dictionary_entries de
       LEFT JOIN translations t_search ON de.id = t_search.entry_id
       ${whereClause}`,
      params
    ) as any[];

    const [entries] = await pool.query(
      `SELECT de.id, de.term, de.detected_language, de.pronunciation_guide,
              de.part_of_speech, de.russian, de.source, de.status, de.created_at,
              u.name as contributor_name,
              t.id as trans_id, t.hebrew, t.latin, t.cyrillic,
              COALESCE(d.name, 'לא ידוע') as dialect,
              def.definition
       FROM dictionary_entries de
       LEFT JOIN users u ON de.contributor_id = u.id
       LEFT JOIN translations t ON de.id = t.entry_id
       LEFT JOIN translations t_search ON de.id = t_search.entry_id
       LEFT JOIN dialects d ON t.dialect_id = d.id
       LEFT JOIN definitions def ON de.id = def.entry_id
       ${whereClause}
       GROUP BY de.id
       ORDER BY de.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as any[];

    const result = entries.map((e: any) => ({
      id: String(e.id),
      term: e.term,
      detectedLanguage: e.detected_language,
      pronunciationGuide: e.pronunciation_guide,
      partOfSpeech: e.part_of_speech,
      russian: e.russian,
      source: e.source,
      status: e.status,
      contributorName: e.contributor_name,
      translations: [{
        id: e.trans_id,
        dialect: e.dialect,
        hebrew: e.hebrew || '',
        latin: e.latin || '',
        cyrillic: e.cyrillic || '',
      }],
      definitions: e.definition ? [e.definition] : [],
    }));

    return NextResponse.json({ entries: result, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Get entries error:', error);
    return NextResponse.json({ error: 'שגיאה בטעינת מילים' }, { status: 500 });
  }
}

// POST /api/dictionary/entries - Add new entry
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    const { term, translation, dialect, notes, detectedLanguage } = await request.json();

    if (!term || !term.trim()) {
      return NextResponse.json({ error: 'נדרש מונח' }, { status: 400 });
    }
    if (term.length > 200) {
      return NextResponse.json({ error: 'המונח ארוך מדי' }, { status: 400 });
    }
    if (!translation || !translation.trim()) {
      return NextResponse.json({ error: 'נדרש תרגום' }, { status: 400 });
    }
    if (translation.length > 500) {
      return NextResponse.json({ error: 'התרגום ארוך מדי' }, { status: 400 });
    }

    const status = user?.role === 'admin' || user?.role === 'approver' ? 'active' : 'pending';

    const [result] = await pool.query(
      `INSERT INTO dictionary_entries
       (term, detected_language, source, status, contributor_id)
       VALUES (?, ?, 'User', ?, ?)`,
      [term.trim(), detectedLanguage || 'Hebrew', status, user?.id || null]
    ) as any[];

    const entryId = result.insertId;

    let dialectId = 6;
    const [dialects] = await pool.query('SELECT id FROM dialects WHERE name = ?', [dialect || 'General']) as any[];
    if (dialects.length > 0) {
      dialectId = dialects[0].id;
    }

    await pool.query(
      `INSERT INTO translations (entry_id, dialect_id, hebrew, latin) VALUES (?, ?, ?, ?)`,
      [entryId, dialectId, translation.trim(), '']
    );

    if (notes) {
      await pool.query(
        'INSERT INTO definitions (entry_id, definition) VALUES (?, ?)',
        [entryId, notes]
      );
    }

    if (user?.id) {
      await pool.query(
        'UPDATE users SET contributions_count = contributions_count + 1, xp = xp + 50 WHERE id = ?',
        [user.id]
      );
    }

    await pool.query(
      `INSERT INTO system_logs (event_type, description, user_id, user_name, metadata) VALUES (?, ?, ?, ?, ?)`,
      [
        'ENTRY_ADDED',
        status === 'pending' ? `הוצעה מילה חדשה: ${term}` : `נוספה מילה למאגר: ${term}`,
        user?.id || null,
        user?.name || 'אורח',
        JSON.stringify({ term })
      ]
    );

    return NextResponse.json({ success: true, entryId, status });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error('Add entry error:', error);
    return NextResponse.json({ error: 'שגיאה בהוספת מילה' }, { status: 500 });
  }
}
