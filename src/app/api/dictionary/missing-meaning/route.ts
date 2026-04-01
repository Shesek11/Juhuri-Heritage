import { NextRequest, NextResponse } from 'next/server';
import pool from '@/src/lib/db';

const LANG_TO_COL: Record<string, string> = {
  he: 'hebrew_short', en: 'english_short', ru: 'russian_short',
};
const LANG_TO_FS_FIELD: Record<string, string> = {
  he: 'hebrewShort', en: 'englishShort', ru: 'russianShort',
};

export async function GET(request: NextRequest) {
  try {
    const lang = request.nextUrl.searchParams.get('lang');
    if (!lang || !LANG_TO_COL[lang]) {
      return NextResponse.json({ error: 'Invalid lang. Use: he, en, ru' }, { status: 400 });
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20') || 20;
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0') || 0;
    const search = request.nextUrl.searchParams.get('search')?.trim();

    const col = LANG_TO_COL[lang];
    const fsField = LANG_TO_FS_FIELD[lang];
    const searchCondition = search ? 'AND (de.hebrew_script LIKE ? OR t.latin_script LIKE ?)' : '';
    const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

    const [entries] = await pool.query(`
      SELECT de.id, de.hebrew_script, de.detected_language,
             de.hebrew_script as dialect_hebrew_script, t.latin_script, t.cyrillic_script,
             fs.source_type as ai_source
      FROM dictionary_entries de
      LEFT JOIN dialect_scripts t ON de.id = t.entry_id
      LEFT JOIN field_sources fs ON fs.entry_id = de.id AND fs.field_name = ? AND fs.source_type = 'ai'
      WHERE de.status = 'active'
      AND (
          (de.${col} IS NULL OR de.${col} = '')
          OR fs.id IS NOT NULL
      )
      ${searchCondition}
      GROUP BY de.id
      ORDER BY CASE WHEN fs.id IS NOT NULL AND de.${col} IS NOT NULL AND de.${col} != '' THEN 1 ELSE 0 END,
               de.created_at DESC
      LIMIT ? OFFSET ?
    `, [fsField, ...searchParams, limit, offset]) as any[];

    const [[{ total }]] = await pool.query(`
      SELECT COUNT(DISTINCT de.id) as total FROM dictionary_entries de
      LEFT JOIN dialect_scripts t ON de.id = t.entry_id
      LEFT JOIN field_sources fs ON fs.entry_id = de.id AND fs.field_name = ? AND fs.source_type = 'ai'
      WHERE de.status = 'active'
      AND (
          (de.${col} IS NULL OR de.${col} = '')
          OR fs.id IS NOT NULL
      )
      ${searchCondition}
    `, [fsField, ...searchParams]) as any[];

    const mapped = (entries as any[]).map((e: any) => ({
      id: e.id,
      term: e.dialect_hebrew_script || e.latin_script || e.cyrillic_script || e.hebrew_script || '',
      hebrew: e.dialect_hebrew_script || null,
      latin: e.latin_script || null,
      cyrillic: e.cyrillic_script || null,
      isAi: !!e.ai_source,
    }));

    return NextResponse.json({ entries: mapped, total });
  } catch (error) {
    console.error('Missing meaning error:', error);
    return NextResponse.json({ error: 'Error loading entries' }, { status: 500 });
  }
}
