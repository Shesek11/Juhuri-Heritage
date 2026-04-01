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
      conditions.push('(de.hebrew_script LIKE ?)');
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(DISTINCT de.id) as total
       FROM dictionary_entries de
       LEFT JOIN dialect_scripts t_search ON de.id = t_search.entry_id
       ${whereClause}`,
      params
    ) as any[];

    const [entries] = await pool.query(
      `SELECT de.id, de.hebrew_script, de.detected_language,
              de.part_of_speech, de.russian_short, de.source, de.source_name, de.status, de.created_at,
              de.hebrew_short, de.hebrew_long, de.russian_long, de.english_short, de.english_long,
              u.name as contributor_name,
              t.id as trans_id, de.hebrew_script as t_hebrew_script, t.latin_script as t_latin_script, t.cyrillic_script as t_cyrillic_script,
              t.pronunciation_guide as t_pronunciation_guide,
              COALESCE(d.name, '') as dialect
       FROM dictionary_entries de
       LEFT JOIN users u ON de.contributor_id = u.id
       LEFT JOIN dialect_scripts t ON de.id = t.entry_id
       LEFT JOIN dialect_scripts t_search ON de.id = t_search.entry_id
       LEFT JOIN dialects d ON t.dialect_id = d.id
       ${whereClause}
       GROUP BY de.id
       ORDER BY de.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    ) as any[];

    const result = entries.map((e: any) => ({
      id: String(e.id),
      slug: e.slug || null,
      hebrewScript: e.hebrew_script,
      detectedLanguage: e.detected_language,
      partOfSpeech: e.part_of_speech,
      russianShort: e.russian_short,
      russianLong: e.russian_long,
      hebrewShort: e.hebrew_short,
      hebrewLong: e.hebrew_long,
      englishShort: e.english_short,
      englishLong: e.english_long,
      source: e.source,
      sourceName: e.source_name || '',
      status: e.status,
      contributorName: e.contributor_name || '',
      dialectScripts: [{
        id: e.trans_id,
        dialect: e.dialect,
        hebrewScript: e.t_hebrew_script || '',
        latinScript: e.t_latin_script || '',
        cyrillicScript: e.t_cyrillic_script || '',
        pronunciationGuide: e.t_pronunciation_guide || '',
      }],
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
    const { term, translation, dialect, notes, detectedLanguage, hebrewShort, latinScript, cyrillicScript, source } = await request.json();

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

    // Community contributions always go to pending for review
    const isCommunity = source === 'קהילה';
    const status = !isCommunity && (user?.role === 'admin' || user?.role === 'approver') ? 'active' : 'pending';

    const [result] = await pool.query(
      `INSERT INTO dictionary_entries
       (hebrew_script, detected_language, hebrew_short, hebrew_long, source, status, contributor_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [term.trim(), detectedLanguage || 'Hebrew', hebrewShort || translation || null, notes || null, source || 'קהילה', status, user?.id || null]
    ) as any[];

    const entryId = result.insertId;

    let dialectId = 6;
    const [dialects] = await pool.query('SELECT id FROM dialects WHERE name = ?', [dialect || 'General']) as any[];
    if (dialects.length > 0) {
      dialectId = dialects[0].id;
    }

    await pool.query(
      `INSERT INTO dialect_scripts (entry_id, dialect_id, hebrew_script, latin_script, cyrillic_script) VALUES (?, ?, ?, ?, ?)`,
      [entryId, dialectId, translation.trim(), latinScript || '', cyrillicScript || '']
    );

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
